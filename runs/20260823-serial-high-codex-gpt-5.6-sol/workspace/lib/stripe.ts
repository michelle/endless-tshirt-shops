import Stripe from "stripe";

let stripeClient: Stripe | undefined;

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  if (!stripeClient) {
    stripeClient = new Stripe(key, {
      appInfo: { name: "datetime.store", version: "1.0.0" },
      maxNetworkRetries: 2,
    });
  }
  return stripeClient;
}
