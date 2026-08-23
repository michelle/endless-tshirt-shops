const test = require('node:test');
const assert = require('node:assert/strict');
const {validateProduct, artwork} = require('../api/_lib');

test('accepts supported shirt variants with a millisecond timestamp', () => {
  assert.equal(validateProduct({style:'fitted', size:'M', timestamp:1787454878000}), '1787454878000');
});
test('rejects unsafe fulfilment metadata', () => {
  assert.throws(() => validateProduct({style:'unknown', size:'M', timestamp:'not-a-time'}));
});
test('creates a transparent PNG print asset', () => {
  const image = artwork('1787454878000');
  assert.deepEqual([...image.subarray(0,8)], [137,80,78,71,13,10,26,10]);
  assert.ok(image.length > 1000);
});
