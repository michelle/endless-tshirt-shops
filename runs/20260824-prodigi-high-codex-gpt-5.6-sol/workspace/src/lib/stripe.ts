import "server-only";
import Stripe from "stripe";
import { stripeSecretKey } from "@/lib/env";

let stripeClient: Stripe | undefined;

export function stripe(): Stripe {
  stripeClient ??= new Stripe(stripeSecretKey(), {
    appInfo: { name: "datetime.store", version: "1.0.0" },
    maxNetworkRetries: 2,
  });
  return stripeClient;
}
