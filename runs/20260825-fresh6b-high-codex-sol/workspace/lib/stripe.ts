import "server-only";
import Stripe from "stripe";

let client: Stripe | undefined;

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured.");
  client ??= new Stripe(key, { appInfo: { name: "datetime.store", version: "1.0.0" } });
  return client;
}
