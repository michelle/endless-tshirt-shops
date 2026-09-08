import "server-only";
import Stripe from "stripe";

let client: Stripe | null = null;

export class PaymentsNotConfiguredError extends Error {
  constructor() {
    super("Payments are not configured: set STRIPE_SECRET_KEY");
  }
}

export function stripe(): Stripe {
  if (client) return client;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new PaymentsNotConfiguredError();
  client = new Stripe(key, { appInfo: { name: "Bloomprint", version: "0.1.0" } });
  return client;
}
