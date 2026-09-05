import Stripe from "stripe";
let client: Stripe | undefined;
export function stripe() {
  if (!process.env.STRIPE_SECRET_KEY)
    throw new Error("Stripe is not configured");
  return (client ??= new Stripe(process.env.STRIPE_SECRET_KEY, {
    maxNetworkRetries: 2,
    timeout: 20_000,
  }));
}
export function siteUrl() {
  const url = process.env.SITE_URL;
  if (!url) throw new Error("SITE_URL is required");
  return new URL(url).origin;
}
export function verifyEnvironment(livemode?: boolean) {
  const live = process.env.PRODIGI_ENV === "live";
  const keyLive = /^(sk|rk)_live_/.test(process.env.STRIPE_SECRET_KEY || "");
  if (keyLive !== live || (livemode !== undefined && livemode !== live))
    throw new Error("Payment and fulfillment environments do not match");
  if (live && process.env.LIVE_ORDERS_ENABLED !== "true")
    throw new Error("Live orders are not enabled");
}
