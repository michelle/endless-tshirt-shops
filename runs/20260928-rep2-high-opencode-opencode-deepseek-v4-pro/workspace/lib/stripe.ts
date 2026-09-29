// Stripe client singleton.

import Stripe from "stripe";

let stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
    stripe = new Stripe(key, {
      apiVersion: "2024-06-20",
      appInfo: { name: "stellar-star-map-tees", version: "1.0.0" },
    });
  }
  return stripe;
}
