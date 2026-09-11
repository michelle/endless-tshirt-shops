import Stripe from "stripe";

let client: Stripe | null = null;

export function stripe(): Stripe {
  if (client) return client;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  client = new Stripe(key, { appInfo: { name: "Sidereal", version: "0.1.0" } });
  return client;
}
