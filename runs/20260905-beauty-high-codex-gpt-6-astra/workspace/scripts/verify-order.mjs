import nextEnv from "@next/env";
import Stripe from "stripe";
import fs from "node:fs/promises";
nextEnv.loadEnvConfig(process.cwd());
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const paid = JSON.parse(await fs.readFile("artifacts/paid-order.json", "utf8"));
const session = await stripe.checkout.sessions.retrieve(paid.sessionId);
const response = await fetch(
  "https://api.sandbox.prodigi.com/v4.0/orders/" +
    session.metadata.prodigiOrderId,
  { headers: { "X-API-Key": process.env.PRODIGI_API_KEY } },
);
const result = await response.json();
const o = result.order;
console.log(
  JSON.stringify(
    {
      stripe: {
        status: session.status,
        paid: session.payment_status,
        amount: session.amount_total,
        metadata: session.metadata,
      },
      prodigi: {
        outcome: result.outcome,
        id: o?.id,
        status: o?.status,
        items: o?.items.map((i) => ({
          sku: i.sku,
          attributes: i.attributes,
          assets: i.assets.map((a) => ({
            printArea: a.printArea,
            status: a.status,
          })),
        })),
      },
    },
    null,
    2,
  ),
);
const asset = await fetch(o.items[0].assets[0].url);
console.log(
  "Public print asset:",
  asset.status,
  asset.headers.get("content-type"),
);
await fs.writeFile(
  "artifacts/print-artwork.png",
  Buffer.from(await asset.arrayBuffer()),
);
const events = await stripe.events.list({
  type: "checkout.session.completed",
  limit: 20,
});
const event = events.data.find((e) => e.data.object.id === session.id);
if (!event) throw new Error("Missing payment event");
const payload = JSON.stringify(event);
const signature = stripe.webhooks.generateTestHeaderString({
  payload,
  secret: process.env.STRIPE_WEBHOOK_SECRET,
});
const replay = await fetch(process.env.SITE_URL + "/api/webhooks/stripe", {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "stripe-signature": signature,
  },
  body: payload,
});
console.log("Duplicate signed webhook replay:", replay.status);
const again = await stripe.checkout.sessions.retrieve(session.id);
console.log(
  "Duplicate retains same print order:",
  again.metadata.prodigiOrderId === o.id,
);
const invalid = await fetch(process.env.SITE_URL + "/api/webhooks/stripe", {
  method: "POST",
  headers: { "stripe-signature": "invalid" },
  body: payload,
});
console.log("Invalid webhook rejected:", invalid.status);
const status = await fetch(
  process.env.SITE_URL + "/api/orders?session_id=" + session.id,
);
console.log("Public receipt:", await status.json());
await fs.writeFile(
  "artifacts/integration-result.json",
  JSON.stringify(
    {
      sessionId: session.id,
      prodigiOrderId: o.id,
      paid: session.payment_status,
      total: session.amount_total,
      prodigiStatus: o.status,
      assetStatus: o.items[0].assets[0].status,
      assetHttpStatus: asset.status,
      replayStatus: replay.status,
      duplicateOrderId: again.metadata.prodigiOrderId,
      invalidSignatureStatus: invalid.status,
    },
    null,
    2,
  ),
);
