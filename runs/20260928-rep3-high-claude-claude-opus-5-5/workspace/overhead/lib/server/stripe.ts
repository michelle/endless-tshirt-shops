import "server-only";
import Stripe from "stripe";
import { env } from "./env";

let client: Stripe | null = null;
export function stripe(): Stripe {
  client ??= new Stripe(env.stripeSecretKey(), { appInfo: { name: "Overhead" } });
  return client;
}
