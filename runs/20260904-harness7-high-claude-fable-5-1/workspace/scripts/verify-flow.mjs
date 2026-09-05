#!/usr/bin/env node
/**
 * API-level verification of the whole purchase pipeline against a running
 * instance (local or deployed), using Stripe test mode and the Prodigi sandbox.
 *
 *   STRIPE_SECRET_KEY=sk_test_... BASE_URL=https://... node scripts/verify-flow.mjs
 *
 * 1. POST /api/checkout          -> PaymentIntent for a shirt with "now"
 * 2. Stripe API: confirm the PI   -> pm_card_visa + shipping address (what the browser does)
 * 3. POST /api/orders/finalize    -> places the Prodigi order (idempotent)
 * 4. POST again                   -> proves idempotency (already_fulfilled)
 * 5. Prodigi API: fetch the order -> asset URL points back at /api/artwork
 * 6. GET the artwork URL          -> Prodigi can download the print file
 */
import Stripe from "stripe";

const BASE_URL = (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const secret = process.env.STRIPE_SECRET_KEY;
if (!secret) throw new Error("STRIPE_SECRET_KEY is required");
const stripe = new Stripe(secret);

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
async function json(url, init) {
  const res = await fetch(url, init);
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

// 1. start checkout
const timestamp = Date.now();
const start = await json(`${BASE_URL}/api/checkout`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ style: "fitted", size: "M", timestamp }),
});
if (start.status !== 200) throw new Error(`checkout failed: ${start.status} ${JSON.stringify(start.body)}`);
const piId = start.body.paymentIntentId;
log(`1. PaymentIntent ${piId} for ${timestamp} (${start.body.amount} ${start.body.currency})`);

// 2. pay (server-side stand-in for Stripe Elements)
const paid = await stripe.paymentIntents.confirm(piId, {
  payment_method: "pm_card_visa",
  receipt_email: "jenny.rosen@example.com",
  shipping: {
    name: "Jenny Rosen",
    address: { line1: "185 Berry St", line2: "Suite 550", city: "San Francisco", state: "CA", postal_code: "94107", country: "US" },
  },
  return_url: `${BASE_URL}/`,
});
if (paid.status !== "succeeded") throw new Error(`payment not succeeded: ${paid.status}`);
log(`2. paid: ${paid.status}, ${paid.amount_received} received`);

// 3. fulfil
const fin = await json(`${BASE_URL}/api/orders/finalize`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ paymentIntentId: piId }),
});
log(`3. finalize: ${fin.status} ${JSON.stringify(fin.body)}`);
if (!["fulfilled", "already_fulfilled"].includes(fin.body.status)) throw new Error("fulfilment failed");
const orderId = fin.body.prodigiOrderId;

// 4. idempotency
const again = await json(`${BASE_URL}/api/orders/finalize`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ paymentIntentId: piId }),
});
if (again.body.status !== "already_fulfilled" || again.body.prodigiOrderId !== orderId) throw new Error("finalize is not idempotent");
log(`4. second finalize -> ${again.body.status} (same order ${orderId})`);

// 5. Prodigi order
const prodigiKey = process.env.PRODIGI_API_KEY;
if (prodigiKey) {
  const base = process.env.PRODIGI_API_BASE || "https://api.sandbox.prodigi.com";
  const res = await fetch(`${base}/v4.0/Orders/${orderId}`, { headers: { "X-API-Key": prodigiKey } });
  const body = await res.json();
  const item = body.order.items[0];
  log(`5. Prodigi ${body.order.id}: stage=${body.order.status.stage} sku=${item.sku} attrs=${JSON.stringify(item.attributes)} ref=${body.order.merchantReference}`);
  log(`   ship to: ${body.order.recipient.name}, ${body.order.recipient.address.townOrCity} ${body.order.recipient.address.countryCode}`);
  const assetUrl = item.assets[0].url;
  log(`   asset: ${assetUrl} (status ${item.assets[0].status ?? "n/a"})`);
  // 6. artwork reachable
  const art = await fetch(assetUrl);
  log(`6. artwork download: ${art.status} ${art.headers.get("content-type")} ${art.headers.get("content-length")} bytes`);
  if (art.status !== 200) throw new Error("artwork not downloadable");
} else {
  log("5. (skipped Prodigi lookup: PRODIGI_API_KEY not set)");
}

// Customer-facing status endpoint
const status = await json(`${BASE_URL}/api/orders/${piId}`, { headers: { authorization: `Bearer ${paid.client_secret}` } });
log(`7. order status: ${JSON.stringify(status.body)}`);
log("OK — full flow verified");
