import Stripe from "stripe";

let cached: Stripe | null = null;

export function getStripe(): Stripe {
  if (!cached) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    cached = new Stripe(key);
  }
  return cached;
}
