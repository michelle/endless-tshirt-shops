// Run after a Stripe TEST secret key is supplied. Never prints credentials.
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import Stripe from "stripe";
const local = Object.fromEntries(
  fs
    .readFileSync(".env.local", "utf8")
    .trim()
    .split("\n")
    .filter((s) => s.includes("="))
    .map((s) => [s.slice(0, s.indexOf("=")), s.slice(s.indexOf("=") + 1)]),
);
let config = "";
if (
  process.env.BENCHMARK_STRIPE_CONFIG &&
  fs.existsSync(process.env.BENCHMARK_STRIPE_CONFIG)
)
  config = fs.readFileSync(process.env.BENCHMARK_STRIPE_CONFIG, "utf8");
const key =
  process.env.STRIPE_SECRET_KEY ||
  local.STRIPE_SECRET_KEY ||
  config.match(/sk_test_[A-Za-z0-9]+/)?.[0];
if (!key?.startsWith("sk_test_")) {
  console.error(
    "A Stripe test secret key is required. Set STRIPE_SECRET_KEY or add it to BENCHMARK_STRIPE_CONFIG.",
  );
  process.exit(1);
}
const stripe = new Stripe(key);
const url = local.APP_URL + "/api/webhooks/stripe";
const endpoints = await stripe.webhookEndpoints.list({ limit: 100 });
const existing = endpoints.data.find(
  (e) => e.url === url && e.status === "enabled",
);
let secret = process.env.STRIPE_WEBHOOK_SECRET || local.STRIPE_WEBHOOK_SECRET;
if (existing && !secret) {
  console.error(
    "An endpoint already exists. Set its STRIPE_WEBHOOK_SECRET locally and run again; no endpoint was replaced.",
  );
  process.exit(1);
}
if (!existing) {
  const endpoint = await stripe.webhookEndpoints.create({
    url,
    enabled_events: [
      "checkout.session.completed",
      "checkout.session.async_payment_succeeded",
    ],
    description: "Field Notes Club payment-gated shirt fulfillment",
  });
  secret = endpoint.secret;
  console.log("Stripe test webhook created.");
}
const values = { STRIPE_SECRET_KEY: key, STRIPE_WEBHOOK_SECRET: secret };
fs.writeFileSync(
  ".env.local",
  Object.entries({ ...local, ...values })
    .map(([k, v]) => k + "=" + v)
    .join("\n") + "\n",
  { mode: 0o600 },
);
for (const [name, value] of Object.entries(values)) {
  try {
    execFileSync("vercel", ["env", "add", name, "production", "--force"], {
      input: value,
      stdio: ["pipe", "pipe", "pipe"],
    });
    console.log(name + " configured in Vercel.");
  } catch {
    console.error(
      "Could not configure " +
        name +
        ". Set it in the Vercel project environment settings.",
    );
    process.exit(1);
  }
}
console.log("Payment configuration saved. Run: vercel --prod --yes");
