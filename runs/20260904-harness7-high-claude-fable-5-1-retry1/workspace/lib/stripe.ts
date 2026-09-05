import Stripe from "stripe";
import { requireEnv } from "./env";

let client: Stripe | null = null;

export function stripe(): Stripe {
  if (!client) {
    client = new Stripe(requireEnv("STRIPE_SECRET_KEY"), {
      appInfo: { name: "datetime.store", url: "https://github.com/michelle/datetime.store" },
    });
  }
  return client;
}
