import assert from "node:assert/strict";
import { test } from "node:test";
import { parseCheckoutRequest, ValidationError } from "../src/lib/checkout-request";

const NOW = 1_800_000_000_000;

function valid() {
  return {
    style: "unisex",
    size: "L",
    timestamp: NOW - 5_000,
    email: "Jenny@Example.com ",
    shipping: {
      name: " Jenny Rosen ",
      address: { line1: "185 Berry St", line2: "", city: "San Francisco", state: "CA", postal_code: "94107", country: "us" },
    },
  };
}

test("accepts a well-formed request and normalises it", () => {
  const req = parseCheckoutRequest(valid(), NOW);
  assert.equal(req.style, "unisex");
  assert.equal(req.size, "L");
  assert.equal(req.timestamp, NOW - 5_000);
  assert.equal(req.email, "jenny@example.com");
  assert.equal(req.shipping.name, "Jenny Rosen");
  assert.equal(req.shipping.address.country, "US");
  assert.equal(req.shipping.address.line2, undefined);
});

test("rejects unknown style and size", () => {
  assert.throws(() => parseCheckoutRequest({ ...valid(), style: "cropped" }, NOW), ValidationError);
  assert.throws(() => parseCheckoutRequest({ ...valid(), size: "XXL" }, NOW), ValidationError);
});

test("rejects stale, future, or non-integer timestamps", () => {
  assert.throws(() => parseCheckoutRequest({ ...valid(), timestamp: NOW - 48 * 3600 * 1000 }, NOW), /stale/);
  assert.throws(() => parseCheckoutRequest({ ...valid(), timestamp: NOW + 3600 * 1000 }, NOW), /stale/);
  assert.throws(() => parseCheckoutRequest({ ...valid(), timestamp: "1800000000000" }, NOW), /stale/);
  assert.throws(() => parseCheckoutRequest({ ...valid(), timestamp: 1.5 }, NOW), /stale/);
});

test("rejects bad email and unsupported countries", () => {
  assert.throws(() => parseCheckoutRequest({ ...valid(), email: "nope" }, NOW), /email/);
  const gb = valid();
  gb.shipping.address.country = "GB";
  assert.throws(() => parseCheckoutRequest(gb, NOW), /only ship/);
});

test("requires address fields", () => {
  const r = valid();
  r.shipping.address.postal_code = "";
  assert.throws(() => parseCheckoutRequest(r, NOW), /Postal code/);
  assert.throws(() => parseCheckoutRequest(null, NOW), ValidationError);
  assert.throws(() => parseCheckoutRequest({ ...valid(), shipping: undefined }, NOW), ValidationError);
});
