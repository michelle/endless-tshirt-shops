import "server-only";
import Stripe from "stripe";
import { env } from "./env";

let client: Stripe | null = null;
export function stripe(): Stripe {
  client ??= new Stripe(env.stripeSecretKey(), { appInfo: { name: "Overhead Tees" } });
  return client;
}

// Stripe metadata values are capped at 500 chars, so long design tokens are chunked.
export function chunkMetadata(prefix: string, value: string, size = 450): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i * size < value.length; i++) out[`${prefix}_${i}`] = value.slice(i * size, (i + 1) * size);
  return out;
}

export function unchunkMetadata(prefix: string, md: Record<string, string> | null | undefined): string {
  let s = "";
  for (let i = 0; md && md[`${prefix}_${i}`] !== undefined; i++) s += md[`${prefix}_${i}`];
  return s;
}
