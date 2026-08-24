import "server-only";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export function stripeSecretKey(): string {
  return required("STRIPE_SECRET_KEY");
}

export function webhookSecret(): string {
  return required("STRIPE_WEBHOOK_SECRET");
}

export function prodigiApiKey(): string {
  return required("PRODIGI_API_KEY");
}

export function artworkSigningSecret(): string {
  const secret = required("ARTWORK_SIGNING_SECRET");
  if (secret.length < 32) {
    throw new Error("ARTWORK_SIGNING_SECRET must be at least 32 characters");
  }
  return secret;
}

export function canonicalOrigin(fallback?: string): string {
  const origin = process.env.NEXT_PUBLIC_SITE_URL || fallback;
  if (!origin) throw new Error("NEXT_PUBLIC_SITE_URL is not configured");
  return origin.replace(/\/$/, "");
}

export function prodigiBaseUrl(): string {
  return (process.env.PRODIGI_API_BASE ?? "https://api.sandbox.prodigi.com").replace(
    /\/$/,
    "",
  );
}
