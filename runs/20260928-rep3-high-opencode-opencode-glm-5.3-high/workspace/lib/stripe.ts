// 4000 Fridays — Stripe (server only).
// Chosen payment provider: Stripe Checkout (hosted), test/sandbox keys.

import Stripe from "stripe";

let client: Stripe | null = null;

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  if (!client) client = new Stripe(key);
  return client;
}

export function stripeKeyMode(): "test" | "live" | "unknown" {
  const key = process.env.STRIPE_SECRET_KEY ?? "";
  if (key.startsWith("sk_test") || key.startsWith("rk_test") || key.startsWith("rkcs_test")) return "test";
  if (key.startsWith("sk_live") || key.startsWith("rk_live")) return "live";
  return "unknown";
}
