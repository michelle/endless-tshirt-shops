#!/usr/bin/env node
/**
 * Registers the Stripe webhook endpoint for the deployed app and configures
 * STRIPE_WEBHOOK_SECRET on the Vercel project (then you redeploy).
 *
 * Usage:
 *   SITE_URL=https://your-app.vercel.app node scripts/setup-stripe-webhook.mjs
 */
import Stripe from "stripe";
import { execFileSync } from "child_process";

const siteUrl = (process.env.SITE_URL || "").replace(/\/$/, "");
if (!siteUrl) throw new Error("SITE_URL env required, e.g. https://app.vercel.app");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const target = `${siteUrl}/api/webhook`;

const existing = await stripe.webhookEndpoints.list({ limit: 100 });
const found = existing.data.find((e) => e.url === target);

let secret;
if (found) {
  console.log(`Webhook endpoint already exists: ${found.id}`);
  console.log("  (reveal its signing secret in the Stripe dashboard, or delete it and re-run this script)");
  process.exit(0);
}

const created = await stripe.webhookEndpoints.create({
  url: target,
  enabled_events: ["checkout.session.completed", "checkout.session.async_payment_succeeded"],
  description: "Echostitch: payment confirmation -> Prodigi order submission",
});
secret = created.secret;
console.log(`Created webhook endpoint ${created.id} -> ${target}`);
console.log(`webhook signing secret: ${secret}`);

// Push the secret into the Vercel project's production environment.
try {
  execFileSync("vercel", ["env", "rm", "STRIPE_WEBHOOK_SECRET", "production", "-y"], {
    stdio: "ignore",
  });
} catch {
  /* didn't exist yet */
}
execFileSync("vercel", ["env", "add", "STRIPE_WEBHOOK_SECRET", "production"], {
  input: secret + "\n",
  stdio: ["pipe", "inherit", "inherit"],
});
console.log("STRIPE_WEBHOOK_SECRET added to Vercel (production). Redeploy to activate: vercel --prod");
