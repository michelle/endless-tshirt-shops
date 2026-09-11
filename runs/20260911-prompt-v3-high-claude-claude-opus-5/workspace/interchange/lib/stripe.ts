import Stripe from "stripe";

let client: Stripe | null = null;

export function stripeEnabled(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

export function stripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is not configured");
  if (!client) {
    client = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-08-27.basil",
      appInfo: { name: "Interchange", version: "1.0.0" },
    });
  }
  return client;
}

export const webhookSecret = () => process.env.STRIPE_WEBHOOK_SECRET || "";
