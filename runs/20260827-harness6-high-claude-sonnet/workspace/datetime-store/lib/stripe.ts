import Stripe from "stripe";

let _stripe: Stripe | null = null;

/** Lazily-constructed server-side Stripe client (test mode). */
export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set. Add it to your environment (see README).",
    );
  }
  _stripe = new Stripe(key, {
    appInfo: { name: "datetime.store", version: "1.0.0" },
  });
  return _stripe;
}
