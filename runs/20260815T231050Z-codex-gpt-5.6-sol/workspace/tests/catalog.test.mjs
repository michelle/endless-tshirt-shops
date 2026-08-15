import test from "node:test";
import assert from "node:assert/strict";
import { timestampLabel, validSelection } from "../lib/catalog.js";

test("validates catalog selections", () => {
  assert.equal(validSelection("fitted", "M"), true);
  assert.equal(validSelection("hoodie", "M"), false);
  assert.equal(validSelection("unisex", "XXL"), false);
});

test("accepts a current safe timestamp and rejects nonsense", () => {
  assert.equal(timestampLabel(Date.now())?.length, 13);
  assert.equal(timestampLabel("nope"), null);
  assert.equal(timestampLabel(Date.now() + 120000), null);
});
