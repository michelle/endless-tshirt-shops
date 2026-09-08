export const SITE_NAME = "Department of Obsolete Futures";
export const SITE_TAGLINE = "Official apparel for the futures that never arrived.";

/** Absolute public origin of the deployed site, used for Stripe redirect URLs and Prodigi asset URLs. */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
