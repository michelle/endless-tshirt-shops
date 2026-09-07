/** Absolute, publicly reachable origin for this deployment (used for Prodigi asset URLs and Stripe redirects). */
export function siteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export type PaymentMode = "stripe" | "sandbox";

/** Stripe Checkout when keys are configured; otherwise a no-payment sandbox checkout that still places Prodigi orders. */
export function paymentMode(): PaymentMode {
  return process.env.STRIPE_SECRET_KEY ? "stripe" : "sandbox";
}
