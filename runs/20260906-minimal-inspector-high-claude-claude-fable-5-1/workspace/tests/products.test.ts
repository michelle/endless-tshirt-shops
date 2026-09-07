import assert from "node:assert/strict";
import { test } from "node:test";
import { formatPrice, isSize, isStyle, PRODIGI_SIZE, SIZES, STYLE_INFO, STYLES } from "../src/lib/products";

test("catalog guards", () => {
  for (const s of STYLES) assert.ok(isStyle(s));
  for (const s of SIZES) assert.ok(isSize(s));
  assert.equal(isStyle("hoodie"), false);
  assert.equal(isSize("m"), false);
});

test("every style maps to a Prodigi SKU and every size to a Prodigi size", () => {
  for (const s of STYLES) assert.match(STYLE_INFO[s].sku, /^GLOBAL-TEE-/);
  for (const s of SIZES) assert.match(PRODIGI_SIZE[s], /^(xs|s|m|l|xl|2xl)$/);
});

test("price formatting", () => {
  assert.equal(formatPrice(2250), "$22.50");
  assert.equal(formatPrice(3000), "$30.00");
});
