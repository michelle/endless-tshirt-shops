import assert from "node:assert/strict";
import test from "node:test";
import { fits, PRICE_CENTS, prodigiSize, sizes } from "../lib/catalog";

test("catalog preserves the original price and supported options", () => {
  assert.equal(PRICE_CENTS, 2250);
  assert.deepEqual(Object.keys(fits), ["fitted", "unisex"]);
  assert.deepEqual(sizes, ["S", "M", "L", "XL"]);
});

test("sizes map to Prodigi's lowercase attributes", () => {
  assert.equal(prodigiSize("XL"), "xl");
});
