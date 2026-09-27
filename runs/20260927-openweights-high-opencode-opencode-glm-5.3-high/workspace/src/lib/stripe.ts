/**
 * Stripe server client. The secret key lives only in server env; the browser
 * never sees any of this — checkout happens on Stripe's hosted page.
 */

import Stripe from "stripe";

let cached: Stripe | null = null;

export function stripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  if (!cached) cached = new Stripe(key);
  return cached;
}
