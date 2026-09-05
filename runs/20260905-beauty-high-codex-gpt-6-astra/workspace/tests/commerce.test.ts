import { test } from "node:test";
import assert from "node:assert/strict";
import {
  purchaseSchema,
  assertRecentTimestamp,
  readableMoment,
  PRICE,
} from "../lib/catalog";
import {
  signArtwork,
  validArtworkSignature,
  renderArtwork,
} from "../lib/artwork";
import {
  assertPaidOrder,
  fulfillmentKey,
  orderPayload,
} from "../lib/fulfillment";
import { verifyEnvironment } from "../lib/stripe";
import sharp from "sharp";
import type Stripe from "stripe";
process.env.ARTWORK_SIGNING_SECRET = "test-secret-not-for-production";
process.env.SITE_URL = "https://datetime-test.example";
process.env.STRIPE_SECRET_KEY = "sk_test_example";
process.env.PRODIGI_ENV = "sandbox";
const purchase = {
  timestamp: 1788600000000,
  color: "black",
  fit: "unisex",
  size: "M",
  requestId: "521c28f1-8c3c-463d-a6f7-1c3c388dcfba",
};
function paidSession(): Stripe.Checkout.Session {
  return {
    id: "cs_test_durable_order",
    metadata: {
      ...purchase,
      timestamp: String(purchase.timestamp),
      store: "datetime-v1",
    },
    amount_total: PRICE,
    currency: "usd",
    payment_status: "paid",
    status: "complete",
    livemode: false,
    collected_information: {
      shipping_details: {
        name: "Test Customer",
        address: {
          line1: "123 Test Street",
          line2: null,
          city: "San Francisco",
          state: "CA",
          postal_code: "94107",
          country: "US",
        },
      },
    },
  } as unknown as Stripe.Checkout.Session;
}
test("rejects client price injection and invalid variants", () => {
  assert.equal(purchaseSchema.safeParse(purchase).success, true);
  assert.equal(
    purchaseSchema.safeParse({ ...purchase, price: 1 }).success,
    false,
  );
  assert.equal(
    purchaseSchema.safeParse({ ...purchase, size: "xxs" }).success,
    false,
  );
  assert.equal(
    purchaseSchema.safeParse({ ...purchase, fit: "fitted", color: "natural" })
      .success,
    false,
  );
  assert.equal(
    purchaseSchema.safeParse({ ...purchase, timestamp: NaN }).success,
    false,
  );
});
test("timestamp freshness rejects stale and future captures", () => {
  const now = purchase.timestamp;
  assert.doesNotThrow(() => assertRecentTimestamp(now - 1000, now));
  assert.throws(() => assertRecentTimestamp(now - 1_800_001, now));
  assert.throws(() => assertRecentTimestamp(now + 30_001, now));
  assert.match(readableMoment(now), /UTC$/);
});
test("artwork signature binds color, timestamp and version", () => {
  const t = String(purchase.timestamp),
    sig = signArtwork(t, "black");
  assert.equal(validArtworkSignature(t, "black", sig), true);
  assert.equal(validArtworkSignature(t, "white", sig), false);
  assert.equal(
    validArtworkSignature(String(purchase.timestamp + 1), "black", sig),
    false,
  );
  assert.equal(validArtworkSignature(t, "black", "a"), false);
});
test("only paid completed orders with the server price can fulfill", () => {
  assert.doesNotThrow(() => assertPaidOrder(paidSession()));
  for (const change of [
    { payment_status: "unpaid" },
    { status: "open" },
    { amount_total: 1 },
    { currency: "eur" },
    { livemode: true },
    { metadata: { store: "another-store" } },
  ]) {
    assert.throws(() =>
      assertPaidOrder({
        ...paidSession(),
        ...change,
      } as Stripe.Checkout.Session),
    );
  }
});
test("fulfillment is tied to one permanent key and the frozen artwork", () => {
  const session = paidSession();
  const payload = orderPayload(session);
  assert.equal(payload.idempotencyKey, fulfillmentKey(session.id));
  assert.equal(payload.items[0].sku, "GLOBAL-TEE-GIL-64000");
  assert.equal(payload.items[0].copies, 1);
  assert.equal(payload.items[0].assets[0].printArea, "front");
  assert.match(payload.items[0].assets[0].url, /t=1788600000000&c=black&sig=/);
  assert.notEqual(fulfillmentKey(session.id), fulfillmentKey(session.id + "2"));
  assert.equal("email" in payload.recipient, false);
  const foreign = paidSession();
  foreign.collected_information!.shipping_details!.address.country = "CA";
  assert.throws(() => orderPayload(foreign));
});
test("live payments cannot accidentally enter sandbox printing", () => {
  process.env.STRIPE_SECRET_KEY = "sk_live_example";
  assert.throws(() => verifyEnvironment());
  process.env.PRODIGI_ENV = "live";
  assert.throws(() => verifyEnvironment());
  process.env.LIVE_ORDERS_ENABLED = "true";
  assert.doesNotThrow(() => verifyEnvironment(true));
  process.env.STRIPE_SECRET_KEY = "sk_test_example";
  process.env.PRODIGI_ENV = "sandbox";
  delete process.env.LIVE_ORDERS_ENABLED;
});
test("print artwork has transparent background, 300 dpi, and readable outlined ink", async () => {
  for (const color of ["black", "white"]) {
    const result = await renderArtwork(String(purchase.timestamp), color);
    const metadata = await sharp(result).metadata();
    assert.equal(metadata.width, 4665);
    assert.equal(metadata.height, 5844);
    assert.equal(metadata.density, 300);
    assert.equal(metadata.hasAlpha, true);
    const { data, info } = await sharp(result)
      .raw()
      .toBuffer({ resolveWithObject: true });
    assert.equal(data[3], 0);
    let minX = 4665,
      maxX = 0,
      minY = 5844,
      maxY = 0,
      count = 0;
    for (let y = 0; y < info.height; y++)
      for (let x = 0; x < info.width; x++) {
        const i = (y * info.width + x) * 4;
        if (data[i + 3] > 127) {
          count++;
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
      }
    assert.ok(count > 30000);
    assert.ok(maxX - minX > 2300 && maxX - minX < 2450);
    assert.ok(minY > 600 && maxY < 1200);
  }
});
