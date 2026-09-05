/** Centralised environment access with clear failure messages. */

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
}

export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  // Vercel exposes the production domain / deployment URL without a scheme.
  const vercel =
    process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

export function shipCountries(): string[] {
  return (process.env.SHIP_COUNTRIES || "US")
    .split(",")
    .map((c) => c.trim().toUpperCase())
    .filter(Boolean);
}

export function prodigiBaseUrl(): string {
  if (process.env.PRODIGI_API_BASE) return process.env.PRODIGI_API_BASE.replace(/\/$/, "");
  return process.env.PRODIGI_ENV === "live"
    ? "https://api.prodigi.com"
    : "https://api.sandbox.prodigi.com";
}

export function isProdigiLive(): boolean {
  return prodigiBaseUrl() === "https://api.prodigi.com";
}
