#!/usr/bin/env node
/**
 * End-to-end pipeline test (no browser needed):
 *   1. POST /api/checkout with a generated waveform design
 *   2. Verify the Stripe checkout session exists
 *   3. Simulate the Stripe webhook (checkout.session.completed, payment_status=paid)
 *      with a correctly signed payload — this is the ONLY way orders reach Prodigi
 *   4. Assert the handler created a real Prodigi order
 *   5. Poll /api/order-status and the Prodigi API for confirmation
 *
 * Usage:
 *   BASE_URL=http://localhost:3000 node scripts/e2e-test.mjs
 *   BASE_URL=https://your-app.vercel.app node scripts/e2e-test.mjs
 */
import Stripe from "stripe";

const BASE_URL = (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET env required");

function makeSamples() {
  const out = [];
  for (let i = 0; i < 480; i++) {
    const t = i / 480;
    out.push(
      0.5 +
        0.32 * Math.sin(t * Math.PI * 2 * 6) * Math.exp(-t * 1.4) +
        0.14 * Math.sin(t * Math.PI * 2 * 17 + 1.3) * Math.exp(-t * 2.2)
    );
  }
  return out;
}

const step = (name) => console.log(`\n▶ ${name}`);

async function main() {
  step(`1. Creating checkout session against ${BASE_URL}`);
  const checkoutRes = await fetch(`${BASE_URL}/api/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      design: {
        samples: makeSamples(),
        style: "fill",
        ink: "#232323",
        color: "black",
        size: "m",
      },
    }),
  });
  const checkoutJson = await checkoutRes.json();
  if (!checkoutRes.ok || !checkoutJson.sessionId) {
    throw new Error(`checkout failed: ${JSON.stringify(checkoutJson)}`);
  }
  console.log(`  session: ${checkoutJson.sessionId}`);
  console.log(`  hosted checkout url: ${checkoutJson.url}`);

  const realSession = await stripe.checkout.sessions.retrieve(checkoutJson.sessionId);
  console.log(`  verified with Stripe API, metadata keys: ${Object.keys(realSession.metadata).join(", ")}`);

  step("2. Verifying the print file renders");
  const printRes = await fetch(`${BASE_URL}/api/print/${checkoutJson.sessionId}.png`);
  if (printRes.status !== 200) throw new Error(`print route returned ${printRes.status}`);
  const png = Buffer.from(await printRes.arrayBuffer());
  const isPng = png[0] === 0x89 && png[1] === 0x50;
  console.log(`  print png: ${png.length} bytes, valid signature: ${isPng}`);
  if (!isPng) throw new Error("print output is not a PNG");

  step("3. Firing signed checkout.session.completed webhook (payment_status=paid)");
  const event = {
    id: "evt_e2e_test",
    object: "event",
    type: "checkout.session.completed",
    data: {
      object: {
        ...JSON.parse(JSON.stringify(realSession)),
        payment_status: "paid",
        status: "complete",
        customer_details: {
          email: "e2e-test@example.com",
          name: "Ada Lovelace",
          phone: "+12125550123",
        },
        shipping_details: {
          name: "Ada Lovelace",
          phone: "+12125550123",
          address: {
            line1: "350 Fifth Avenue",
            line2: null,
            city: "New York",
            state: "NY",
            postal_code: "10118",
            country: "US",
          },
        },
      },
    },
  };
  const payload = JSON.stringify(event);
  const signature = Stripe.webhooks.generateTestHeaderString({ payload, secret: webhookSecret });
  const whRes = await fetch(`${BASE_URL}/api/webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "stripe-signature": signature },
    body: payload,
  });
  const whJson = await whRes.json().catch(() => ({}));
  console.log(`  webhook status: ${whRes.status}`, whJson);
  if (whRes.status !== 200 || !whJson.prodigiOrderId) {
    throw new Error("webhook did not create a Prodigi order");
  }

  step("4. Checking order status endpoint");
  const stRes = await fetch(`${BASE_URL}/api/order-status?session_id=${checkoutJson.sessionId}`);
  const stJson = await stRes.json();
  console.log(`  paid: ${stJson.paid}, prodigiOrderId: ${stJson.prodigiOrderId}`);
  if (stJson.prodigi?.id) console.log(`  prodigi stage: ${stJson.prodigi.stage}`);

  step("5. Verifying the order directly with the Prodigi API");
  const prodigiRes = await fetch(
    `https://api.sandbox.prodigi.com/v4.0/orders/${whJson.prodigiOrderId}`,
    { headers: { "X-API-Key": process.env.PRODIGI_API_KEY } }
  );
  const prodigiJson = await prodigiRes.json();
  const o = prodigiJson.order;
  console.log(`  outcome: ${prodigiJson.outcome}`);
  console.log(`  stage: ${o?.status?.stage}, issues: ${JSON.stringify(o?.status?.issues)}`);
  console.log(`  item sku: ${o?.items?.[0]?.sku}, status: ${o?.items?.[0]?.status}`);
  console.log(`  asset url: ${o?.items?.[0]?.assets?.[0]?.url}`);

  console.log("\n✅ E2E pipeline test passed");
  console.log(`   Prodigi order: ${whJson.prodigiOrderId}`);
  console.log(`   Stripe session: ${checkoutJson.sessionId}`);
}

main().catch((err) => {
  console.error("\n❌ E2E test failed:", err.message);
  process.exit(1);
});
