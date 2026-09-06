import { headers } from "next/headers";

// Resolve the public origin of the running app, preferring an explicit env
// var, then Vercel's runtime URL, then the incoming request's own headers.
export async function getSiteOrigin(): Promise<string> {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  const h = await headers();
  const host = h.get("host") || "localhost:3000";
  const proto = h.get("x-forwarded-proto") || "http";
  return `${proto}://${host}`;
}

// A generous but explicit allowlist of countries Prodigi can print & ship
// to. Stripe's shipping_address_collection requires an explicit list.
export const SHIPPING_COUNTRIES: string[] = [
  "US",
  "CA",
  "GB",
  "IE",
  "AU",
  "NZ",
  "DE",
  "FR",
  "ES",
  "IT",
  "NL",
  "BE",
  "AT",
  "SE",
  "NO",
  "DK",
  "FI",
  "PT",
  "CH",
  "PL",
  "JP",
  "SG",
];
