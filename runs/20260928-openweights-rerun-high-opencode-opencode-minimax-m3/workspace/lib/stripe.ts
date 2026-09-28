// Thin wrapper around the stripe SDK so route handlers don't have to
// reach through node_modules every time. We instantiate lazily because the
// SDK validates the key at construction time and we want a useful error
// message rather than "Cannot read properties of undefined (reading ...)".

import Stripe from "stripe";
import { requiredEnv } from "./env";

let cached: Stripe | null = null;

export function stripe(): Stripe {
  if (cached) return cached;
  const key = requiredEnv("STRIPE_SECRET_KEY");
  cached = new Stripe(key, { apiVersion: "2025-02-24.acacia" });
  return cached;
}
