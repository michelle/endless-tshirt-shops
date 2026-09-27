// End-to-end test against a locally running dev server.
// Creates a real checkout session (real metadata), then delivers a
// correctly-signed checkout.session.completed event that carries the
// session's real data plus a shipping address, exactly like Stripe's
// hosted-page flow would produce after payment.
// Usage: node scripts/e2e-test.mjs [origin]
import fs from "fs";

for (const line of fs.readFileSync(".env.local", "utf8").split("\n")) {
  const i = line.indexOf("=");
  if (i > 0) process.env[line.slice(0, i)] = line.slice(i + 1);
}

const ORIGIN = process.argv[2] ?? "http://localhost:3001";
const Stripe = (await import("stripe")).default;
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const step = (m) => console.log(`\n== ${m} ==`);

step("1. Create checkout session via /api/checkout");
const res = await fetch(`${ORIGIN}/api/checkout`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    word: "Testperson",
    pos: "legend",
    definition: "",
    example: "",
    year: "1990",
    size: "l",
    color: "navy",
    accent: "rust",
  }),
});
const data = await res.json();
if (!res.ok || !data.url) throw new Error(`checkout failed: ${JSON.stringify(data)}`);
const m = data.url.match(/\/pay\/(cs_test_[a-zA-Z0-9]+)/);
const sessionId = m && m[1];
console.log("session:", sessionId);

step("2. Fetch real session and build paid-session event payload");
const s = await stripe.checkout.sessions.retrieve(sessionId);
const paidSession = {
  ...JSON.parse(JSON.stringify(s)),
  payment_status: "paid",
  status: "complete",
  shipping_details: {
    name: "Test Person",
    address: {
      line1: "1 Test Way",
      line2: "Apt 2",
      city: "Testville",
      state: "CA",
      postal_code: "90001",
      country: "US",
    },
  },
  customer_details: {
    email: "testperson@example.com",
    name: "Test Person",
    phone: "+15551234567",
  },
};

step("3. Sign and deliver checkout.session.completed to the webhook");
const payload = JSON.stringify({
  id: "evt_test_e2e",
  object: "event",
  type: "checkout.session.completed",
  data: { object: paidSession },
});
const header = stripe.webhooks.generateTestHeaderString({
  payload,
  secret: process.env.STRIPE_WEBHOOK_SECRET,
});
const wr = await fetch(`${ORIGIN}/api/webhooks/stripe`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "stripe-signature": header },
  body: payload,
});
console.log("webhook status:", wr.status, await wr.text());
if (wr.status !== 200) throw new Error("webhook failed");

step("4. Verify Prodigi sandbox order exists");
const pr = await fetch(
  `https://api.sandbox.prodigi.com/v4.0/Orders?merchantReference=${sessionId}`,
  { headers: { "X-API-Key": process.env.PRODIGI_API_KEY } }
);
const pd = await pr.json();
console.log(
  "prodigi:",
  JSON.stringify(
    (pd.orders ?? []).map((o) => ({
      id: o.id,
      stage: o.status?.stage,
      issues: o.status?.issues,
      sku: o.items?.[0]?.sku,
      attrs: o.items?.[0]?.attributes,
      assetUrl: o.items?.[0]?.assets?.[0]?.url?.slice(0, 100),
    })),
    null,
    2
  )
);

step("5. Session + order-status APIs");
console.log("session api:", JSON.stringify(await (await fetch(`${ORIGIN}/api/session?id=${sessionId}`)).json(), null, 2));
console.log(
  "status api:",
  JSON.stringify(await (await fetch(`${ORIGIN}/api/order-status?ref=${sessionId}`)).json(), null, 2)
);

step("6. Webhook idempotency (re-deliver same event)");
const wr2 = await fetch(`${ORIGIN}/api/webhooks/stripe`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "stripe-signature": header },
  body: payload,
});
console.log("re-delivery status:", wr2.status, await wr2.text());
const pr2 = await fetch(
  `https://api.sandbox.prodigi.com/v4.0/Orders?merchantReference=${sessionId}`,
  { headers: { "X-API-Key": process.env.PRODIGI_API_KEY } }
);
console.log("prodigi orders for ref:", (await pr2.json()).orders?.length);
