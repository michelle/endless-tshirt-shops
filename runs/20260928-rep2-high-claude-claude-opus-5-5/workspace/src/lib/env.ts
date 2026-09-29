import "server-only";

function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable ${name}`);
  return v;
}

export const env = {
  stripeSecretKey: () => req("STRIPE_SECRET_KEY"),
  stripeWebhookSecret: () => req("STRIPE_WEBHOOK_SECRET"),
  prodigiApiKey: () => req("PRODIGI_API_KEY"),
  prodigiApiUrl: () => process.env.PRODIGI_API_URL || "https://api.sandbox.prodigi.com/v4.0",
  signingSecret: () => req("ORDER_SIGNING_SECRET"),
  /** Public origin Prodigi downloads artwork from. Must not sit behind Vercel deployment protection. */
  siteUrl: () =>
    (process.env.SITE_URL ||
      (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000")
    ).replace(/\/$/, ""),
};
