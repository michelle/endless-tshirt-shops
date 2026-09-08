import Stripe from "stripe";

export function getStripe() {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) throw new Error("Stripe checkout is not configured yet.");
  return new Stripe(secret);
}
