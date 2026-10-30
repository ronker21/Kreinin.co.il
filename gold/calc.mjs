// Conversion factors preserved from the original GoldCalc Swift project.
export const TROY_GRAMS = 31.1035;
export const UNITS = Object.freeze({ gram: 1, ounce: 28.3495, troy: TROY_GRAMS, kilo: 1000 });
export const KARATS = [24, 22, 18, 14];

// Accept a decimal point or decimal comma, and correctly grouped thousands.
// Never turn an invalid or missing value into a zero-price result.
export function parseNumber(raw) {
  const text = String(raw).trim();
  if (!text) return null;
  let normalized;
  if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(text)) normalized = text.replaceAll(',', '');
  else if (/^(\d+([.,]\d+)?|[.,]\d+)$/.test(text)) normalized = text.replace(',', '.');
  else return NaN;
  const result = Number(normalized);
  return Number.isFinite(result) ? result : NaN;
}
export const positive = value => typeof value === 'number' && Number.isFinite(value) && value > 0;

export function calculate({ weight, unit, karat, spot, fx, asking = null, currency = 'ILS' }) {
  if (!positive(weight) || weight > 1e9 || !Object.hasOwn(UNITS, unit) || !KARATS.includes(karat) || !positive(spot)) return null;
  const grams = weight * UNITS[unit];
  const pureGrams = grams * karat / 24;
  const usd = spot / TROY_GRAMS * pureGrams;
  const ils = positive(fx) ? usd * fx : null;
  if (!Number.isFinite(usd) || usd <= 0 || (ils !== null && !Number.isFinite(ils))) return null;
  const value = currency === 'USD' ? usd : currency === 'ILS' ? ils : null;
  const comparison = positive(asking) && positive(value) ? {
    perGram: asking / grams, difference: asking - value, percent: (asking - value) / value * 100,
  } : null;
  if (comparison && !Object.values(comparison).every(Number.isFinite)) return null;
  return { grams, pureGrams, usd, ils, comparison };
}

export function goldQuote(data) {
  if (data?.symbol !== 'XAU' || !positive(data.price) || (data.currency && data.currency !== 'USD')) throw new Error('Invalid gold quote');
  const timestamp = Date.parse(data.updatedAt);
  if (!Number.isFinite(timestamp) || timestamp > Date.now() + 300000) throw new Error('Invalid gold date');
  return { value: data.price, date: new Date(timestamp).toISOString(), source: 'gold-api' };
}
export function fxQuote(data) {
  if (data?.base !== 'USD' || data?.quote !== 'ILS' || !positive(data.rate) || !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) throw new Error('Invalid FX quote');
  if (!Number.isFinite(Date.parse(data.date)) || Date.parse(data.date) > Date.now() + 86400000) throw new Error('Invalid FX date');
  return { value: data.rate, date: data.date, source: 'frankfurter' };
}
