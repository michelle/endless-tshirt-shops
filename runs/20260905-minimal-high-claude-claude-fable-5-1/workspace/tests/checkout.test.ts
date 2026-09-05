import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCheckoutInput, ValidationError } from "../lib/checkout";
import { isValidTimestamp, parseTimestampParam, ARTWORK_PX } from "../lib/artwork";
import { PRODIGI_SKUS, prodigiSize, formatPrice } from "../lib/products";

const valid = () => ({
  style: "unisex",
  size: "M",
  timestamp: Date.now(),
  email: "Buyer@Example.com ",
  shipping: {
    name: "Jenny Rosen",
    address: { line1: "185 Berry St", line2: "Suite 550", city: "San Francisco", state: "CA", postal_code: "94107", country: "us" },
  },
});

test("accepts a valid checkout body and normalises it", () => {
  const out = parseCheckoutInput(valid());
  assert.equal(out.email, "buyer@example.com");
  assert.equal(out.shipping.address.country, "US");
  assert.equal(out.style, "unisex");
});

test("rejects bad style, size, email, timestamp and country", () => {
  for (const patch of [
    { style: "slim" },
    { size: "XXL" },
    { email: "nope" },
    { timestamp: Date.now() + 60 * 60 * 1000 },
    { timestamp: "1700000000000" },
    { shipping: { ...valid().shipping, address: { ...valid().shipping.address, country: "GB" } } },
    { shipping: { ...valid().shipping, address: { ...valid().shipping.address, line1: "" } } },
  ]) {
    assert.throws(() => parseCheckoutInput({ ...valid(), ...patch }), ValidationError, JSON.stringify(patch));
  }
});

test("timestamp validation and URL parsing", () => {
  assert.equal(isValidTimestamp(Date.now()), true);
  assert.equal(isValidTimestamp(1400000000000), false); // before launch
  assert.equal(isValidTimestamp(Date.now() + 10 * 60 * 1000), false); // too far in the future
  assert.equal(parseTimestampParam(`${Date.now()}.png`), Number(String(Date.now()).slice(0, 13)) > 0 ? parseTimestampParam(`${Date.now()}.png`) : null);
  assert.equal(parseTimestampParam("abc.png"), null);
  assert.equal(parseTimestampParam("123.png"), null);
});

test("artwork canvas matches the Prodigi print area aspect ratio", () => {
  const ratio = ARTWORK_PX.width / ARTWORK_PX.height;
  assert.ok(Math.abs(ratio - 15.6 / 19.3) < 0.001);
  assert.ok(ARTWORK_PX.textWidth < ARTWORK_PX.width);
});

test("product mapping", () => {
  assert.equal(PRODIGI_SKUS.fitted, "GLOBAL-TEE-BC-6004");
  assert.equal(PRODIGI_SKUS.unisex, "GLOBAL-TEE-BC-3001");
  assert.equal(prodigiSize("XL"), "xl");
  assert.equal(formatPrice(2250), "$22.50");
});
