import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("storefront constants remain fulfillment-safe", async () => {
  const source = await readFile(new URL("../lib/store.ts", import.meta.url), "utf8");
  assert.match(source, /GLOBAL-TEE-BC-3001/);
  assert.match(source, /unitAmount: 2400/);
  assert.match(source, /"XS", "S", "M", "L", "XL", "2XL"/);
});

test("webhook uses Prodigi-backed idempotent fulfillment", async () => {
  const source = await readFile(new URL("../lib/prodigi.ts", import.meta.url), "utf8");
  assert.match(source, /idempotencyKey: `datetime-store-\$\{session\.id\}`/);
  assert.match(source, /payment_status !== "paid"/);
  assert.match(source, /printArea: "front"/);
});
