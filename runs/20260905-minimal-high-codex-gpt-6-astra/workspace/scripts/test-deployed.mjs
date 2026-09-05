// API-driven smoke test. Uses Stripe's official CLI fixture confirmation pattern.
// Creates only test payments and sandbox print orders; never use on a live store.
import fs from "node:fs/promises";
import Stripe from "stripe";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const base = process.env.APP_URL;
if (
  !process.env.STRIPE_SECRET_KEY?.includes("_test_") ||
  process.env.PRODIGI_ENVIRONMENT !== "sandbox"
)
  throw new Error("Test credentials required");
const fit = process.argv[2] ?? "unisex";
const input = {
  fit,
  size: fit === "fitted" ? "S" : "M",
  timestamp: Date.now(),
  requestId: crypto.randomUUID(),
};
const response = await fetch(base + "/api/checkout", {
  method: "POST",
  headers: { Origin: base, "Content-Type": "application/json" },
  body: JSON.stringify(input),
});
const checkout = await response.json();
if (!response.ok) throw new Error(checkout.error);
const original = await stripe.checkout.sessions.retrieve(checkout.sessionId);
console.log(
  "Deployed checkout created",
  original.id,
  original.amount_total,
  original.payment_status,
);
const repeated = await fetch(base + "/api/checkout", {
  method: "POST",
  headers: { Origin: base, "Content-Type": "application/json" },
  body: JSON.stringify(input),
}).then((r) => r.json());
if (repeated.sessionId !== original.id)
  throw new Error("Checkout idempotency failed");
console.log("Repeated checkout request returns the same session");
await stripe.checkout.sessions.expire(original.id);
// Stripe's CLI fixture bypasses hosted shipping collection. Supply the same
// fictitious shipping record on PaymentIntent creation for this automated test.
const shipping = {
  name: "Datetime Test Buyer",
  address: {
    line1: "510 Townsend St",
    city: "San Francisco",
    state: "CA",
    postal_code: "94103",
    country: "US",
  },
};
const fixture = await stripe.checkout.sessions.create({
  mode: "payment",
  payment_method_types: ["card"],
  client_reference_id: input.requestId,
  metadata: original.metadata,
  success_url: original.success_url,
  cancel_url: original.cancel_url,
  customer_email: "datetime-test@example.com",
  line_items: [
    {
      quantity: 1,
      price_data: {
        currency: "usd",
        unit_amount: 2250,
        product_data: {
          name: `Datetime tee — ${fit} ${input.size} (automated test)`,
        },
      },
    },
  ],
  payment_intent_data: {
    shipping,
    metadata: {
      store_id: process.env.STORE_ID,
      timestamp: String(input.timestamp),
    },
  },
});
await stripe.rawRequest("GET", `/v1/payment_pages/${fixture.id}`);
const pm = await stripe.paymentMethods.create({
  type: "card",
  card: { token: "tok_visa" },
  billing_details: {
    email: "datetime-test@example.com",
    name: shipping.name,
    address: shipping.address,
  },
});
await stripe.rawRequest("POST", `/v1/payment_pages/${fixture.id}/confirm`, {
  payment_method: pm.id,
  expected_amount: 2250,
});
const paid = await stripe.checkout.sessions.retrieve(fixture.id, {
  expand: ["payment_intent"],
});
if (paid.payment_status !== "paid" || paid.livemode)
  throw new Error("Expected a paid test session");
const record = {
  input,
  sessionId: fixture.id,
  token: checkout.orderToken,
  paymentIntent: paid.payment_intent.id,
  orderUrl: `${base}/order?session_id=${fixture.id}&token=${checkout.orderToken}`,
};
await fs.writeFile(`work/test-${fit}.json`, JSON.stringify(record, null, 2));
console.log("Stripe test payment confirmed", fixture.id);
// Do not visit the order API yet: first verify webhook-only fulfillment.
console.log(
  "Waiting for the independently delivered Stripe webhook; inspect the session metadata next.",
);
