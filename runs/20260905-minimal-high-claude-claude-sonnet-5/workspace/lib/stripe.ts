import Stripe from "stripe";

let stripe: Stripe | null = null;

/** Lazily-constructed singleton Stripe client (server-side only). */
export function getStripe(): Stripe {
  if (!stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    stripe = new Stripe(key);
  }
  return stripe;
}
