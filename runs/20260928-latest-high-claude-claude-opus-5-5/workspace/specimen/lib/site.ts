import "server-only";

/** Public base URL of the store (used for Stripe redirects, preview images and Prodigi callbacks). */
export function siteUrl(req?: Request): string {
  const env = process.env.SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "");
  if (env) return env.replace(/\/$/, "");
  if (req) return new URL(req.url).origin;
  return "http://localhost:3000";
}
