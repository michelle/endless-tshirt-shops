/* eslint-disable @typescript-eslint/no-require-imports */
// End-to-end test: simulate a Stripe `checkout.session.completed` event
// with the same shape the production webhook will receive, sign it with
// the same secret `stripe listen` is using so signature verification
// passes, and POST it to the local Next.js server.
//
// Run with:  npx tsx scripts/test-webhook.ts

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const TARGET = process.env.WEBHOOK_TARGET ?? "http://localhost:3000/api/stripe-webhook";
const DATA_DIR = path.join(process.cwd(), "data");

if (!SECRET) {
  console.error("STRIPE_WEBHOOK_SECRET must be set in env so the signature matches stripe listen");
  process.exit(1);
}

const SESSION_ID = process.env.TEST_SESSION_ID ?? "cs_test_" + crypto.randomBytes(12).toString("hex");

const payload = {
  id: "evt_" + crypto.randomBytes(12).toString("hex"),
  object: "event",
  api_version: "2025-02-24.acacia",
  created: Math.floor(Date.now() / 1000),
  type: "checkout.session.completed",
  livemode: false,
  request: { id: null, idempotency_key: null },
  data: {
    object: {
      id: SESSION_ID,
      object: "checkout.session",
      amount_total: 3499,
      currency: "usd",
      payment_intent: "pi_test_" + crypto.randomBytes(8).toString("hex"),
      payment_status: "paid",
      status: "complete",
      customer_details: {
        email: "test+buyer@example.com",
        name: "Ada Lovelace",
      },
      shipping_details: {
        name: "Ada Lovelace",
        address: {
          line1: "221B Baker Street",
          line2: null,
          city: "London",
          state: null,
          postal_code: "NW1 6XE",
          country: "GB",
        },
      },
      metadata: {
        sm_design_v: "1",
        sm_date: "2024-08-19",
        sm_lat: "40.71",
        sm_lon: "-74.01",
        sm_place: "Brooklyn",
        sm_title: "Blue Moon Night",
        sm_color: "navy blue",
        sm_size: "m",
      },
    },
  },
};

const body = JSON.stringify(payload);
const timestamp = Math.floor(Date.now() / 1000);
const signedPayload = `${timestamp}.${body}`;
const signature = crypto
  .createHmac("sha256", SECRET)
  .update(signedPayload, "utf8")
  .digest("hex");
const header = `t=${timestamp},v1=${signature}`;

console.log(`Posting test event ${payload.id} to ${TARGET}`);
console.log(`Stripe signature header: ${header.slice(0, 50)}...`);

(async () => {
  const resp = await fetch(TARGET, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Stripe-Signature": header,
    },
    body,
  });

  const text = await resp.text();
  console.log(`\nHTTP ${resp.status}\n${text}`);

  // Read the order record the handler should have written.
  const safeKey = SESSION_ID.replace(/[^a-zA-Z0-9_-]/g, "_");
  const recordPath = path.join(DATA_DIR, `${safeKey}.json`);
  if (fs.existsSync(recordPath)) {
    const rec = JSON.parse(fs.readFileSync(recordPath, "utf8"));
    console.log(`\nOrder record at ${recordPath}:`);
    console.log(JSON.stringify(rec, null, 2));
  } else {
    console.error(`\nNo order record at ${recordPath} - handler may have failed silently`);
  }
})();
