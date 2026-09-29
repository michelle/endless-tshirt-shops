import "server-only";

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable ${name}`);
  return v;
}

export const env = {
  stripeSecretKey: () => required("STRIPE_SECRET_KEY"),
  stripeWebhookSecret: () => required("STRIPE_WEBHOOK_SECRET"),
  prodigiApiKey: () => required("PRODIGI_API_KEY"),
  prodigiBaseUrl: () => process.env.PRODIGI_API_URL || "https://api.sandbox.prodigi.com/v4.0",
  artSigningSecret: () => required("ART_SIGNING_SECRET"),
};

/** Public origin of the site, used for links that leave our servers (Stripe, Prodigi). */
export function siteUrl(req?: Request): string {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (req) return new URL(req.url).origin;
  return "http://localhost:3000";
}
