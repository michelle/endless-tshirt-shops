import "server-only";
import Stripe from "stripe";

export function stripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Stripe checkout is not configured yet.");
  return new Stripe(key, { appInfo: { name: "Signal Atlas", version: "1.0.0" } });
}
