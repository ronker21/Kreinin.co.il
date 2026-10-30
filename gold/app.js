import { calculate, parseNumber, positive, goldQuote, fxQuote } from './calc.mjs';
const $ = id => document.getElementById(id);
const CACHE_KEY = 'kreinin-gold-market-v1';
const money = (value, currency) => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
let rates = { spot: null, fx: null };
let loading = false;
let version = 0;
let lastAttempt = 0;
let announcement;
function saveCache() { try { localStorage.setItem(CACHE_KEY, JSON.stringify(rates)); } catch {} }
function readCache() {
  try {
    const saved = JSON.parse(localStorage.getItem(CACHE_KEY));
    for (const key of ['spot', 'fx']) {
      const quote = saved?.[key];
      if (quote && positive(quote.value) && [key === 'spot' ? 'gold-api' : 'frankfurter', 'manual'].includes(quote.source) && Number.isFinite(Date.parse(quote.date)) && Date.parse(quote.date) <= Date.now() + 300000) rates[key] = { ...quote, cached: true };
    }
  } catch {}
}
function renderRates(message = '') {
  $('spot-display').textContent = rates.spot ? money(rates.spot.value, 'USD') : '—';
  $('fx-display').textContent = rates.fx ? `₪${rates.fx.value.toFixed(4)}` : '—';
  $('refresh').disabled = loading;
  $('refresh').textContent = loading ? '…' : '↻';
  const status = [];
  for (const key of ['spot','fx']) {
    const quote = rates[key];
    if (!quote) continue;
    const manual = quote.source === 'manual';
    const old = Date.now() - Date.parse(quote.date) > (key === 'spot' ? 86400000 : 7 * 86400000);
    const date = new Intl.DateTimeFormat('en-GB', key === 'spot' || manual ? { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' } : { day:'2-digit', month:'short' }).format(new Date(quote.date));
    status.push(`${key === 'spot' ? 'Gold' : 'FX'}: ${manual ? 'manual' : date}${quote.cached ? ' · saved' : ''}${old ? ' · stale' : ''}`);
  }
  $('market-status').textContent = [message, status.join('  /  ')].filter(Boolean).join(' · ');
  render();
}
async function fetchJSON(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(url, { signal: controller.signal, credentials:'omit', referrerPolicy:'no-referrer' });
    if (!response.ok) throw new Error('Unavailable');
    return await response.json();
  } finally { clearTimeout(timer); }
}
async function refresh() {
  if (loading) return;
  if (Date.now() - lastAttempt < 30000) { $('market-status').textContent = 'Refresh available in 30 seconds.'; return; }
  lastAttempt = Date.now();
  const request = ++version;
  loading = true;
  renderRates('Updating…');
  const results = await Promise.allSettled([
    fetchJSON('https://api.gold-api.com/price/XAU').then(goldQuote),
    fetchJSON('https://api.frankfurter.dev/v2/rate/USD/ILS').then(fxQuote),
  ]);
  if (request !== version) return;
  const failed = [];
  ['spot','fx'].forEach((key,i) => {
    if (results[i].status === 'fulfilled') rates[key] = { ...results[i].value, cached:false };
    else { failed.push(key === 'spot' ? 'Gold' : 'FX'); if (rates[key]) rates[key].cached = true; }
  });
  loading = false;
  saveCache();
  renderRates(failed.length ? `${failed.join(' / ')} refresh failed` : '');
  if (!rates.spot || !rates.fx) $('manual-details').open = true;
}
function inputValue(id) {
  const value = parseNumber($(id).value);
  const valid = value === null || positive(value) && value <= 1e9;
  $(id).setAttribute('aria-invalid', String(!valid));
  $(id === 'weight' ? 'weight-error' : 'asking-error').textContent = valid ? '' : 'Enter a number greater than 0 (up to 1 billion).';
  return valid ? value : NaN;
}
function render() {
  const currency = $('currency').value;
  const result = calculate({ weight:inputValue('weight'), unit:$('unit').value, karat:Number(document.querySelector('input[name="karat"]:checked').value), spot:rates.spot?.value, fx:rates.fx?.value, asking:inputValue('asking'), currency });
  $('value-usd').textContent = result ? money(result.usd, 'USD') : '—';
  $('value-ils').textContent = result && result.ils !== null ? money(result.ils, 'ILS') : '—';
  const comparison = result?.comparison;
  $('comparison-results').hidden = !comparison;
  if (comparison) {
    const equal = Math.abs(comparison.difference) < .005;
    $('comparison-title').textContent = `Deal Analysis (${currency})`;
    $('per-gram').textContent = money(comparison.perGram, currency);
    $('difference-label').textContent = equal ? 'Difference:' : comparison.difference > 0 ? 'Premium (Over):' : 'Discount (Under):';
    $('difference').textContent = money(equal ? 0 : Math.abs(comparison.difference), currency);
    $('difference').className = equal ? '' : comparison.difference > 0 ? 'premium' : 'discount';
  }
  clearTimeout(announcement);
  announcement = setTimeout(() => {
    $('result-announcement').textContent = result ? `Market value: ${money(result.usd,'USD')}${result.ils !== null ? `, ${money(result.ils,'ILS')}` : ''}.` : '';
  }, 500);
}
$('calculator').addEventListener('submit', event => event.preventDefault());
$('calculator').addEventListener('input', render);
$('calculator').addEventListener('change', render);
$('refresh').addEventListener('click', refresh);
$('manual-details').addEventListener('toggle', () => {
  if (!$('manual-details').open) return;
  if (!$('manual-spot').value && rates.spot) $('manual-spot').value = String(rates.spot.value);
  if (!$('manual-fx').value && rates.fx) $('manual-fx').value = String(rates.fx.value);
});
$('rates-form').addEventListener('submit', event => {
  event.preventDefault();
  const spot = parseNumber($('manual-spot').value);
  const fx = parseNumber($('manual-fx').value);
  if (!positive(spot) || spot > 1e9 || !positive(fx) || fx > 1e6) { $('rates-error').textContent = 'Enter valid positive rates.'; return; }
  ++version; loading = false;
  const date = new Date().toISOString();
  rates = { spot:{value:spot,date,source:'manual'}, fx:{value:fx,date,source:'manual'} };
  saveCache(); $('rates-error').textContent = ''; $('manual-details').open = false; renderRates();
});
readCache();
renderRates();
if (rates.spot?.source !== 'manual' && rates.fx?.source !== 'manual') refresh();
