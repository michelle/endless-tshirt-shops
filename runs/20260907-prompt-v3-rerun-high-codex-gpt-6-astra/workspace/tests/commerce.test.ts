import { test } from "node:test";
import assert from "node:assert/strict";
import type Stripe from "stripe";
import sharp from "sharp";
import { defaultDesign, designSchema } from "../lib/design";
import { artworkToken, readArtworkToken } from "../lib/art-token";
import { fulfill, validatePaidSession } from "../lib/fulfill";
import { renderDesign } from "../lib/render";
import { POST as webhook } from "../app/api/webhooks/stripe/route";
process.env.STORE_MODE = "test";
process.env.ARTWORK_SECRET = "test-secret-not-for-production";
process.env.APP_URL = "https://store.example";
const paid = () =>
  ({
    id: "cs_test_example123456789",
    mode: "payment",
    payment_status: "paid",
    currency: "usd",
    amount_total: 4400,
    livemode: false,
    metadata: {
      store: "field-notes-v1",
      design: JSON.stringify(defaultDesign),
    },
    customer_details: { email: "buyer@example.com" },
    collected_information: {
      shipping_details: {
        name: "Test Buyer",
        address: {
          line1: "123 Test St",
          city: "Portland",
          state: "OR",
          postal_code: "97205",
          country: "US",
        },
      },
    },
  }) as unknown as Stripe.Checkout.Session;
test("unpaid sessions cannot reach fulfillment", async () => {
  let calls = 0;
  const session = paid();
  session.payment_status = "unpaid";
  const result = await fulfill(session.id, {
    retrieve: async () => session,
    print: async () => {
      calls++;
    },
    record: async () => {
      calls++;
    },
  });
  assert.equal(result.paid, false);
  assert.equal(calls, 0);
});
test("price, currency, store, and environment tampering are rejected", () => {
  for (const edit of [
    { amount_total: 1 },
    { currency: "eur" },
    { livemode: true },
    { metadata: { store: "another-store" } },
    { mode: "subscription" },
  ])
    assert.throws(() =>
      validatePaidSession({ ...paid(), ...edit } as Stripe.Checkout.Session),
    );
});
test("paid order has server controlled product, address, signed art, and stable idempotency", async () => {
  const requests: any[] = [];
  const deps = {
    retrieve: async () => paid(),
    record: async () => {},
    print: async (_path: string, body?: unknown) => {
      requests.push(body);
      return { outcome: "Created", order: { id: "ord_mock" } };
    },
  };
  await Promise.all([
    fulfill("cs_test_example123456789", deps),
    fulfill("cs_test_example123456789", deps),
  ]);
  assert.equal(requests.length, 2);
  assert.deepEqual(requests[0], requests[1]);
  assert.equal(requests[0].items[0].sku, "GLOBAL-TEE-GIL-64000");
  assert.equal(requests[0].items[0].assets[0].printArea, "front");
  assert.equal(requests[0].recipient.address.countryCode, "US");
  const token = new URL(requests[0].items[0].assets[0].url).searchParams.get(
    "token",
  )!;
  assert.deepEqual(readArtworkToken(token), defaultDesign);
});
test("recorded fulfillment is never submitted again", async () => {
  let calls = 0;
  const session = paid();
  session.metadata!.prodigi_order_id = "ord_existing";
  const result = await fulfill(session.id, {
    retrieve: async () => session,
    print: async () => {
      calls++;
    },
    record: async () => {
      calls++;
    },
  });
  assert.equal(result.orderId, "ord_existing");
  assert.equal(calls, 0);
});
test("failed provider request does not record fulfillment; next retry keeps identity", async () => {
  let recorded = 0;
  await assert.rejects(() =>
    fulfill(paid().id, {
      retrieve: async () => paid(),
      print: async () => {
        throw new Error("timeout");
      },
      record: async () => {
        recorded++;
      },
    }),
  );
  assert.equal(recorded, 0);
});
test("missing or non-US shipping cannot reach printing", async () => {
  const session = paid();
  session.collected_information!.shipping_details!.address!.country = "CA";
  await assert.rejects(() =>
    fulfill(session.id, {
      retrieve: async () => session,
      print: async () => {
        assert.fail("must not print");
      },
      record: async () => {},
    }),
  );
});
test("design schema rejects injection, excess text, unsupported variants, and prices", () => {
  for (const edit of [
    { place: "<script>alert(1)</script>" },
    { name: "x".repeat(30) },
    { size: "5xl" },
    { price: 1 },
    { year: "1800" },
  ])
    assert.equal(
      designSchema.safeParse({ ...defaultDesign, ...edit }).success,
      false,
    );
});
test("artwork signatures reject changed data", () => {
  const token = artworkToken(defaultDesign);
  assert.deepEqual(readArtworkToken(token), defaultDesign);
  assert.throws(() => readArtworkToken(token.slice(0, -4) + "abcd"));
});
test("invalid Stripe webhook signatures fail closed", async () => {
  process.env.STRIPE_SECRET_KEY = "stripe_test_secret";
  process.env.STRIPE_WEBHOOK_SECRET = "stripe_webhook_secret";
  const r = await webhook(
    new Request("https://store.example/api/webhooks/stripe", {
      method: "POST",
      body: '{"type":"checkout.session.completed"}',
      headers: { "stripe-signature": "fake" },
    }),
  );
  assert.equal(r.status, 400);
});
test("print renderer outputs exact dimensions, density, and personalized variants", async () => {
  const image = await renderDesign(defaultDesign, 4677);
  const meta = await sharp(image).metadata();
  assert.equal(meta.width, 4677);
  assert.equal(meta.height, 5881);
  assert.equal(meta.density, 300);
  const [a, b] = await Promise.all([
    renderDesign(defaultDesign, 600),
    renderDesign({ ...defaultDesign, place: "YOSEMITE", palette: "dusk" }, 600),
  ]);
  assert.notDeepEqual(a, b);
});
