/**
 * Local webhook test: builds a signed Stripe event envelope and posts it to
 * the running server. Local tool only — the deployed webhook is driven by
 * Stripe itself.
 */
import { createHmac } from "node:crypto";

async function main() {
const [,, port, secret, sessionId] = process.argv;
if (!port || !secret || !sessionId) {
  console.error("usage: tsx scripts/send-test-webhook.ts <port> <whsec> <session_id>");
  process.exit(2);
}

const payload = JSON.stringify({
  id: "evt_local_test_" + Date.now(),
  object: "event",
  api_version: "2024-06-20",
  type: "checkout.session.completed",
  data: { object: { id: sessionId, object: "checkout.session" } },
});

const t = Math.floor(Date.now() / 1000);
const v1 = createHmac("sha256", secret).update(`${t}.${payload}`).digest("hex");

const res = await fetch(`http://localhost:${port}/api/webhooks/stripe`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Stripe-Signature": `t=${t},v1=${v1}`,
  },
  body: payload,
});
console.log("status:", res.status, "body:", await res.text());
}

main().catch((err) => { console.error(err); process.exit(1); });
