import test from 'node:test';
import assert from 'node:assert/strict';
import { calculate, parseNumber, goldQuote, fxQuote } from './calc.mjs';
const base = { weight: 31.1035, unit: 'gram', karat: 24, spot: 3000, fx: 3.5, asking: null, currency: 'USD' };
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);
test('one troy ounce of pure gold equals the spot quote', () => {
  const r = calculate(base); close(r.usd, 3000); close(r.ils, 10500);
});
test('all four weight units and karats retain the Swift calculation', () => {
  for (const [unit, weight] of [['gram', 31.1035], ['ounce', 31.1035 / 28.3495], ['troy', 1], ['kilo', .0311035]]) {
    for (const karat of [14, 18, 22, 24]) close(calculate({ ...base, unit, weight, karat }).usd, 3000 * karat / 24);
  }
});
test('premium, discount, equality and per-gram price use the selected currency', () => {
  close(calculate({ ...base, asking: 3300 }).comparison.percent, 10);
  close(calculate({ ...base, asking: 2700 }).comparison.difference, -300);
  close(calculate({ ...base, asking: 10500, currency: 'ILS' }).comparison.difference, 0);
  close(calculate({ ...base, asking: 3300 }).comparison.perGram, 3300 / 31.1035);
});
test('missing FX leaves USD usable and never invents an ILS result', () => {
  assert.equal(calculate({ ...base, fx: null, asking: 20, currency: 'ILS' }).ils, null);
  assert.equal(calculate({ ...base, fx: null, asking: 20, currency: 'ILS' }).comparison, null);
  assert.ok(calculate({ ...base, fx: null, asking: 20 }).comparison);
});
test('invalid weight, missing spot and overflow cannot produce a valuation', () => {
  for (const weight of [null, 0, -2, NaN, Infinity, 1e10]) assert.equal(calculate({ ...base, weight }), null);
  assert.equal(calculate({ ...base, spot: null }), null);
  assert.equal(calculate({ ...base, unit: 'toString' }), null);
  assert.equal(calculate({ ...base, spot: Number.MAX_VALUE, weight: 1e9 }), null);
  assert.equal(calculate({ ...base, karat: 25 }), null);
});
test('blank, decimal comma, grouping and malformed numbers are distinguished', () => {
  assert.equal(parseNumber(''), null); assert.equal(parseNumber('10,5'), 10.5);
  assert.equal(parseNumber('1,250.75'), 1250.75); assert.equal(parseNumber('.5'), .5);
  for (const input of ['-1', 'NaN', 'Infinity', '1e3', '12x', '1 2', '1,23,4', '0x12']) assert.ok(Number.isNaN(parseNumber(input)));
});
test('feed responses require expected symbols, units, positive values and dates', () => {
  assert.equal(goldQuote({ symbol: 'XAU', price: 3000, updatedAt: '2026-01-01T10:00:00Z' }).value, 3000);
  assert.equal(fxQuote({ base: 'USD', quote: 'ILS', rate: 3.5, date: '2026-01-01' }).value, 3.5);
  assert.throws(() => goldQuote({ symbol: 'XAG', price: 3000, updatedAt: '2026-01-01' }));
  assert.throws(() => goldQuote({ symbol: 'XAU', currency: 'EUR', price: 3000, updatedAt: '2026-01-01' }));
  assert.throws(() => fxQuote({ base: 'ILS', quote: 'USD', rate: 3.5, date: '2026-01-01' }));
  assert.throws(() => fxQuote({ base: 'USD', quote: 'ILS', rate: 0, date: '2026-01-01' }));
});
