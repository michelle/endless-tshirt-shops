/**
 * Absolute origin of this deployment, used for artwork URLs handed to
 * Prodigi and for callbacks. Read at request time (not inlined at build).
 */
export function getSiteUrl(): string {
  const explicit = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

export function artworkUrl(timestamp: number | string): string {
  return `${getSiteUrl()}/api/artwork/${timestamp}.png`;
}
