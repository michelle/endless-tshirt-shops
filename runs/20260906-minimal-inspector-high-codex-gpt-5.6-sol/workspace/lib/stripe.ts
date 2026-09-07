import Stripe from "stripe";
import { stripeSecretKey } from "./env";

let client: Stripe | undefined;

export function getStripe() {
  client ??= new Stripe(stripeSecretKey(), {
    appInfo: { name: "datetime.store", version: "1.0.0" },
  });
  return client;
}
