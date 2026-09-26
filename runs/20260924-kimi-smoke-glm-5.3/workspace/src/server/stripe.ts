/**
 * Stripe server client. One instance per lambda; safe to import anywhere.
 * The SDK's pinned API version is used, so event shapes match the typings.
 */
import Stripe from "stripe";

export function stripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  return new Stripe(key, {
    typescript: true,
    maxNetworkRetries: 2,
  });
}

export const STRIPE_WEBHOOK_SECRET = () => process.env.STRIPE_WEBHOOK_SECRET ?? "";
