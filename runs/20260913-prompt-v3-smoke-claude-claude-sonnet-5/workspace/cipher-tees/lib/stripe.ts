import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  // Thrown lazily at request time in each route, not at build time —
  // but surfacing this clearly is worth the eager check.
  console.warn("STRIPE_SECRET_KEY is not set. Checkout and webhooks will fail.");
}

export const stripe = new Stripe(key ?? "sk_test_missing");
