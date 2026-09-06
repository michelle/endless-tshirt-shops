import Stripe from "stripe";

let _stripe: Stripe | null = null;

// Lazily constructed so the module can be imported at build time (e.g. by
// route handler type-checking) even before STRIPE_SECRET_KEY is configured.
export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error(
        "STRIPE_SECRET_KEY is not set. Add it to your environment (see .env.example)."
      );
    }
    _stripe = new Stripe(key, {
      apiVersion: "2024-06-20",
      appInfo: { name: "datetime.store", version: "2.0.0" },
    });
  }
  return _stripe;
}
