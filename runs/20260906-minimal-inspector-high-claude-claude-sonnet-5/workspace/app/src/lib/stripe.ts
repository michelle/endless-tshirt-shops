import Stripe from "stripe";

const secretKey = process.env.STRIPE_SECRET_KEY;

if (!secretKey) {
  // Thrown lazily (at request time, via the getter below) so the build
  // doesn't fail when the env var is only missing at build time.
  console.warn("STRIPE_SECRET_KEY is not set — Stripe calls will fail.");
}

// Archive-only redaction: original fallback was a nonfunctional build placeholder.
export const stripe = new Stripe(secretKey ?? "REDACTED_BUILD_PLACEHOLDER", {
  apiVersion: "2026-08-26.dahlia",
  appInfo: { name: "datetime.store", version: "2.0.0" },
});
