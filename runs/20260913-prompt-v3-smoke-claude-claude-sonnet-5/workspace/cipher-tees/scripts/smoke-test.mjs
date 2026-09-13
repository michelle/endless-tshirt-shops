// One-off local smoke test: creates a real Stripe Checkout Session against
// the sandbox account (via our own /api/checkout route), then crafts a
// realistic `checkout.session.completed` webhook event (signed the same
// way Stripe signs real webhooks) and posts it to our local webhook route,
// to verify the full pay -> fulfill -> Prodigi order path without needing
// a browser to actually complete a Stripe-hosted checkout page.
import crypto from "node:crypto";

const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3100";
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
if (!WEBHOOK_SECRET) throw new Error("set STRIPE_WEBHOOK_SECRET");

const checkoutRes = await fetch(`${BASE}/api/checkout`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    items: [
      {
        id: "test-item-1",
        spec: { phrase: "SMOKE TEST", paletteId: "tidal", shirtColorId: "navy" },
        size: "l",
        qty: 1,
      },
    ],
  }),
});
const checkoutData = await checkoutRes.json();
if (!checkoutRes.ok) throw new Error(`checkout failed: ${JSON.stringify(checkoutData)}`);
console.log("Created checkout session, url:", checkoutData.url);

// Extract the real cs_test_... id embedded in the hosted checkout URL path.
const match = checkoutData.url.match(/(cs_test_[A-Za-z0-9]+)/);
if (!match) throw new Error("could not parse session id from " + checkoutData.url);
const realSessionId = match[1];
console.log("Session id:", realSessionId);

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const Stripe = (await import("stripe")).default;
const stripe = new Stripe(stripeSecret);
const session = await stripe.checkout.sessions.retrieve(realSessionId, { expand: ["payment_intent"] });
console.log("Session metadata:", session.metadata);

// A real Checkout Session's PaymentIntent isn't created until the hosted
// page actually loads, so for this headless test we create a standalone
// real PaymentIntent (with the same order metadata) to stand in for it —
// this still exercises the real `paymentIntents.update` write-back path.
const paymentIntent = await stripe.paymentIntents.create({
  amount: session.amount_total ?? 3895,
  currency: "usd",
  payment_method_types: ["card"],
  metadata: session.metadata,
});
console.log("Standalone payment intent id:", paymentIntent.id);

const fakeEvent = {
  id: "evt_test_" + crypto.randomBytes(8).toString("hex"),
  object: "event",
  type: "checkout.session.completed",
  data: {
    object: {
      ...session,
      payment_status: "paid",
      payment_intent: paymentIntent.id,
      customer_details: {
        email: "smoketest@example.com",
        name: "Smoke Test",
        address: {
          line1: "1 Test Way",
          city: "Testville",
          state: "CA",
          postal_code: "94000",
          country: "US",
        },
      },
      shipping_details: {
        name: "Smoke Test",
        address: {
          line1: "1 Test Way",
          city: "Testville",
          state: "CA",
          postal_code: "94000",
          country: "US",
        },
      },
    },
  },
};

const payload = JSON.stringify(fakeEvent);
const timestamp = Math.floor(Date.now() / 1000);
const signedPayload = `${timestamp}.${payload}`;
const signature = crypto.createHmac("sha256", WEBHOOK_SECRET).update(signedPayload).digest("hex");
const header = `t=${timestamp},v1=${signature}`;

const webhookRes = await fetch(`${BASE}/api/webhooks/stripe`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "stripe-signature": header },
  body: payload,
});
console.log("Webhook response status:", webhookRes.status);
console.log(await webhookRes.text());

// Give the (synchronous) handler a moment then check order-status.
const statusRes = await fetch(`${BASE}/api/order-status?session_id=${realSessionId}`);
console.log("Order status:", await statusRes.json());
