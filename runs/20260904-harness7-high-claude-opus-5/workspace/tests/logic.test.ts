import { test } from 'node:test';
import assert from 'node:assert/strict';

/**
 * These cover the pure logic that decides what gets charged and what gets
 * printed. They deliberately do not touch Stripe or Prodigi — the network
 * paths are exercised by the end-to-end script in README.md.
 *
 * Run with: npm test (compiles to .test-build/ via tsconfig.test.json first)
 */
import {
  parseTimestamp,
  parseStyle,
  parseSize,
  formatPrice,
  describeShirt,
  PRICE_CENTS,
  PRODIGI_SIZE,
  PRODUCTS,
  type Style,
} from '../lib/catalog';
import {
  artFontSizeFor,
  ART_WIDTH,
  ART_HEIGHT,
  ART_TEXT_WIDTH_FRACTION,
} from '../lib/artwork';

test('parseTimestamp accepts a plausible now', () => {
  const now = Date.now();
  assert.equal(parseTimestamp(now), now);
  assert.equal(parseTimestamp(String(now)), now);
});

test('parseTimestamp rejects values that could not be a purchase moment', () => {
  assert.equal(parseTimestamp(0), null, 'the epoch');
  assert.equal(parseTimestamp(1), null, 'nonsense small number');
  assert.equal(parseTimestamp(Date.now() + 86_400_000), null, 'far future');
  assert.equal(parseTimestamp(-Date.now()), null, 'negative');
  assert.equal(parseTimestamp('abc'), null, 'not a number');
  assert.equal(parseTimestamp(1.5e12 + 0.5), null, 'not an integer');
  assert.equal(parseTimestamp(null), null);
  assert.equal(parseTimestamp(undefined), null);
});

test('parseTimestamp tolerates modest client clock skew', () => {
  assert.equal(typeof parseTimestamp(Date.now() + 60_000), 'number');
});

test('parseStyle and parseSize only admit catalogue values', () => {
  assert.equal(parseStyle('fitted'), 'fitted');
  assert.equal(parseStyle('unisex'), 'unisex');
  assert.equal(parseStyle('UNISEX'), null);
  assert.equal(parseStyle('gold-plated'), null);
  assert.equal(parseSize('XL'), 'XL');
  assert.equal(parseSize('xl'), null);
  assert.equal(parseSize('XXL'), null);
});

test('every style maps to a Prodigi SKU and every size to a Prodigi size', () => {
  for (const style of ['fitted', 'unisex'] as Style[]) {
    assert.match(PRODUCTS[style].sku, /^GLOBAL-TEE-/);
  }
  assert.deepEqual(Object.keys(PRODIGI_SIZE), ['S', 'M', 'L', 'XL']);
  for (const v of Object.values(PRODIGI_SIZE)) assert.match(v, /^(s|m|l|xl)$/);
});

test('price formatting matches the storefront', () => {
  assert.equal(formatPrice(PRICE_CENTS), '$22.50');
  assert.equal(formatPrice(3000), '$30.00');
});

test('shirt description names the moment, cut, size and colour', () => {
  const d = describeShirt(1788579452594, 'unisex', 'L');
  assert.match(d, /1788579452594/);
  assert.match(d, /Unisex/);
  assert.match(d, /L/);
  assert.match(d, /black/);
});

test('artwork canvas matches the Prodigi front print area aspect ratio', () => {
  // Prodigi reports 4665 x 5844 for the US apparel lab.
  const labAspect = 4665 / 5844;
  const ours = ART_WIDTH / ART_HEIGHT;
  assert.ok(Math.abs(ours - labAspect) < 0.001, `aspect ${ours} vs ${labAspect}`);
});

test('font sizing keeps a 13-digit timestamp near the target print width', () => {
  const text = String(Date.now());
  assert.equal(text.length, 13);
  const size = artFontSizeFor(text);
  const estimatedWidth = size * 0.6 * text.length;
  const target = ART_WIDTH * ART_TEXT_WIDTH_FRACTION;
  assert.ok(Math.abs(estimatedWidth - target) / target < 0.02);
});

test('a fresh moment is purchasable but a stale one is not', async () => {
  const { isPurchasableMoment } = await import('../lib/catalog');
  assert.equal(isPurchasableMoment(Date.now()), true);
  assert.equal(isPurchasableMoment(Date.now() - 60_000), true, 'a minute ago is fine');
  assert.equal(isPurchasableMoment(Date.now() - 60 * 60 * 1000), false, 'an hour ago is not');
  // Artwork for old orders must still render, so parseTimestamp stays open.
  assert.equal(typeof parseTimestamp(Date.UTC(2018, 0, 1)), 'number');
});
