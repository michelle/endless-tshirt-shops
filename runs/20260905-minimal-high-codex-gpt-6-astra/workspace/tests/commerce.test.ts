import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import sharp from "sharp";
import type Stripe from "stripe";
import { checkoutSchema, itemFor } from "../lib/catalog";
import {
  signDesign,
  verifyDesign,
  accessToken,
  safeEqual,
  assertOrigin,
  readJson,
} from "../lib/security";
import {
  validateSession,
  authorizeSession,
  fulfillmentBody,
  summarize,
} from "../lib/orders";
import { renderArtwork } from "../lib/artwork";
process.env.ORDER_SIGNING_SECRET =
  "test-only-secret-with-enough-entropy-for-unit-tests";
process.env.STORE_ID = "unit-test-store";
process.env.PRODIGI_ENVIRONMENT = "sandbox";
process.env.APP_URL = "https://datetime.example";
const input = {
  fit: "unisex" as const,
  size: "M" as const,
  timestamp: 1788610000000,
  requestId: crypto.randomUUID(),
};
function session(
  overrides: Partial<Stripe.Checkout.Session> = {},
): Stripe.Checkout.Session {
  return {
    id: "cs_test_example",
    object: "checkout.session",
    mode: "payment",
    amount_total: 2250,
    currency: "usd",
    payment_status: "paid",
    status: "complete",
    livemode: false,
    client_reference_id: input.requestId,
    metadata: { store_id: "unit-test-store", design_token: signDesign(input) },
    customer_details: { email: "test@example.com" },
    collected_information: {
      shipping_details: {
        name: "Test Buyer",
        address: {
          line1: "510 Townsend St",
          line2: null,
          city: "San Francisco",
          state: "CA",
          postal_code: "94103",
          country: "US",
        },
      },
    },
    ...overrides,
  } as Stripe.Checkout.Session;
}
test("rejects unsupported sizes, fits, extras and non-integer timestamps", () => {
  for (const value of [
    { ...input, size: "XXXL" },
    { ...input, fit: "custom" },
    { ...input, timestamp: 1.5 },
    { ...input, price: 1 },
    { ...input, requestId: "not-a-uuid" },
  ])
    assert.equal(checkoutSchema.safeParse(value).success, false);
});
test("signed designs preserve the exact timestamp and reject any modification", () => {
  const token = signDesign(input);
  assert.deepEqual(verifyDesign(token), input);
  assert.throws(() =>
    verifyDesign(token.replace(/.$/, token.endsWith("x") ? "y" : "x")),
  );
  const [body, sig] = token.split(".");
  const altered = JSON.parse(Buffer.from(body, "base64url").toString());
  altered.timestamp++;
  assert.throws(() =>
    verifyDesign(
      Buffer.from(JSON.stringify(altered)).toString("base64url") + "." + sig,
    ),
  );
  assert.throws(() => verifyDesign("a".repeat(1000)));
});
test("order capability is separate from the artwork signature", () => {
  const s = session();
  assert.equal(
    authorizeSession(s, accessToken(input.requestId)).timestamp,
    input.timestamp,
  );
  assert.throws(() => authorizeSession(s, "not-the-token"));
  assert.equal(safeEqual("abc", "abcd"), false);
});
test("fulfillment refuses unpaid, wrong price, currency, foreign store and mixed environments", () => {
  for (const s of [
    session({ payment_status: "unpaid" }),
    session({ status: "open" }),
    session({ amount_total: 1 }),
    session({ currency: "eur" }),
    session({ livemode: true }),
    session({ metadata: { store_id: "other" } }),
  ])
    assert.throws(() => fulfillmentBody(s));
});
test("fulfillment requires a complete US shipping address", () => {
  assert.throws(() =>
    fulfillmentBody(session({ collected_information: null })),
  );
  const s = session();
  s.collected_information!.shipping_details!.address!.country = "CA";
  assert.throws(() => fulfillmentBody(s));
});
test("Prodigi order mapping is deterministic and binds idempotency to Stripe session", () => {
  const s = session();
  const a = fulfillmentBody(s),
    b = fulfillmentBody(s);
  assert.deepEqual(a, b);
  assert.equal(a.idempotencyKey, s.id);
  assert.equal(a.items[0].sku, "GLOBAL-TEE-GIL-64000");
  assert.equal(a.items[0].attributes.size, "m");
  assert.equal(a.items[0].assets![0].printArea, "front");
  assert.equal(a.recipient.address.townOrCity, "San Francisco");
  assert.equal(
    itemFor({ fit: "fitted", size: "XL" }).sku,
    "GLOBAL-TEE-GIL-64000L",
  );
});
test("order summary distinguishes paid-but-pending from print acceptance without leaking address/email", () => {
  const summary = summarize(session(), null);
  assert.equal(summary.status, "processing");
  assert.equal(summary.paid, true);
  assert.ok(!JSON.stringify(summary).includes("test@example.com"));
  assert.ok(!JSON.stringify(summary).includes("Townsend"));
});
test("cross-origin and oversized requests are rejected", async () => {
  assert.throws(() =>
    assertOrigin(
      new Request("https://store.example/api/checkout", {
        headers: { origin: "https://evil.example" },
      }),
    ),
  );
  assert.throws(() =>
    assertOrigin(new Request("https://store.example/api/checkout")),
  );
  assertOrigin(
    new Request("https://store.example/api/checkout", {
      headers: { origin: "https://store.example" },
    }),
  );
  await assert.rejects(() =>
    readJson(
      new Request("https://store.example", {
        method: "POST",
        body: "x".repeat(3000),
      }),
    ),
  );
});
test("print file is deterministic, transparent, high resolution and contains visible white digits", async () => {
  const a = await renderArtwork(input.timestamp),
    b = await renderArtwork(input.timestamp),
    c = await renderArtwork(input.timestamp + 1);
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, c);
  const m = await sharp(a).metadata();
  assert.equal(m.width, 4677);
  assert.equal(m.height, 5881);
  assert.equal(m.density, 300);
  assert.equal(m.hasAlpha, true);
  const { data, info } = await sharp(a)
    .raw()
    .toBuffer({ resolveWithObject: true });
  let visible = 0;
  for (let i = 3; i < data.length; i += info.channels)
    if (data[i] > 0) visible++;
  assert.ok(visible > 10000);
  assert.ok(visible < 500000);
});

test("real Prodigi AlreadyExists response hydrates the existing order instead of resubmitting", async () => {
  const { resolveOrderResponse } = await import("../lib/prodigi");
  const existing = {
    id: "ord_existing",
    status: { stage: "InProgress", issues: [], details: {} },
    shipments: [],
  };
  let reads = 0;
  const result = await resolveOrderResponse(
    { order: { id: "ord_existing" } },
    async (id) => {
      reads++;
      assert.equal(id, "ord_existing");
      return existing;
    },
  );
  assert.equal(result.id, "ord_existing");
  assert.equal(reads, 1);
  assert.equal(result.status.stage, "InProgress");
});

test("fully refunded unsubmitted orders have an explicit status", () => {
  const s = session();
  s.metadata!.fulfillment_state = "refunded";
  assert.equal(summarize(s, null).status, "refunded");
});

test("trusted PaymentIntent shipping supports Stripe CLI fixtures and older Checkout records", () => {
  const s = session();
  const shipping = s.collected_information!.shipping_details!;
  s.collected_information = null;
  s.payment_intent = { shipping } as Stripe.PaymentIntent;
  assert.equal(fulfillmentBody(s).recipient.address.countryCode, "US");
});
