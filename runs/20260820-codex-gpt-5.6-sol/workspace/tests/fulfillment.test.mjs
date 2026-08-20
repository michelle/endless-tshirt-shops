import test from 'node:test';
import assert from 'node:assert/strict';
import { artworkSvg, PRODUCTS, SIZES } from '../lib/fulfillment.js';
test('supported variants map to current Scalable Press SKUs', () => {
  assert.equal(PRODUCTS.fitted, 'bella-ladies-favorite-t-shirt');
  assert.equal(PRODUCTS.unisex, 'next-level-fitted-crew');
  assert.deepEqual(Object.keys(SIZES), ['S', 'M', 'L', 'XL']);
});
test('artwork includes only a sanitized timestamp', () => {
  const svg = artworkSvg('1787200123456<script>');
  assert.match(svg, /1787200123456/); assert.doesNotMatch(svg, /script/); assert.match(svg, /UNIX TIME/);
});
