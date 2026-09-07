function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export function stripeSecretKey() {
  return required("STRIPE_SECRET_KEY");
}

export function stripeWebhookSecret() {
  return required("STRIPE_WEBHOOK_SECRET");
}

export function prodigiApiKey() {
  return required("PRODIGI_API_KEY");
}

export function artworkSigningSecret() {
  return required("ARTWORK_SIGNING_SECRET");
}

export function prodigiApiBase() {
  return (process.env.PRODIGI_API_BASE || "https://api.sandbox.prodigi.com").replace(/\/$/, "");
}

export function siteUrl(requestUrl?: string) {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (requestUrl) return new URL(requestUrl).origin;
  return "http://localhost:3000";
}
