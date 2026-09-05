import Stripe from "stripe";
import { required } from "./config";
let client: Stripe | undefined;
export function stripe() {
  return (client ??= new Stripe(required("STRIPE_SECRET_KEY"), {
    maxNetworkRetries: 2,
    timeout: 20000,
  }));
}
