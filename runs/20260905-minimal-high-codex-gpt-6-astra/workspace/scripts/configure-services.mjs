import fs from "node:fs";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import Stripe from "stripe";
const env = Object.fromEntries(
  fs
    .readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1)];
    }),
);
const stripe = new Stripe(env.STRIPE_SECRET_KEY);
const endpoint = await stripe.webhookEndpoints.create({
  url: env.APP_URL + "/api/stripe/webhook",
  enabled_events: [
    "checkout.session.completed",
    "checkout.session.async_payment_succeeded",
  ],
  description: env.STORE_ID + " fulfillment",
});
env.STRIPE_WEBHOOK_SECRET = endpoint.secret;
env.CRON_SECRET = crypto.randomBytes(32).toString("hex");
fs.writeFileSync(
  ".env.local",
  Object.entries(env)
    .map(([k, v]) => `${k}=${v}`)
    .join("\n") + "\n",
  { mode: 0o600 },
);
fs.writeFileSync(
  "work/webhook.json",
  JSON.stringify({ id: endpoint.id, url: endpoint.url }, null, 2),
);
for (const [key, value] of Object.entries(env)) {
  const args = ["env", "add", key, "production", "--yes"];
  if (
    ![
      "APP_URL",
      "STORE_ID",
      "PRODIGI_ENVIRONMENT",
      "NEXT_PUBLIC_APP_MODE",
    ].includes(key)
  )
    args.push("--sensitive");
  const r = spawnSync("vercel", args, { input: value, encoding: "utf8" });
  if (r.status !== 0) {
    console.error("Failed to configure", key, r.stderr);
    process.exit(1);
  }
  console.log("Configured", key);
}
console.log("Stripe webhook registered:", endpoint.id);
