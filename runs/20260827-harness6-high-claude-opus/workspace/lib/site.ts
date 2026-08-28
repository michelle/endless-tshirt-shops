import { headers } from 'next/headers';

/**
 * The absolute origin Prodigi (and Stripe) should call back to.
 *
 * Preference order matters: an explicit env var wins so you can pin a custom
 * domain, otherwise we trust the host the request actually arrived on, which is
 * what makes preview deployments work without reconfiguration.
 */
export async function siteOrigin(): Promise<string> {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, '');

  const h = await headers();
  const forwardedHost = h.get('x-forwarded-host') ?? h.get('host');
  if (forwardedHost) {
    const proto = h.get('x-forwarded-proto') ?? (forwardedHost.startsWith('localhost') ? 'http' : 'https');
    return `${proto}://${forwardedHost}`;
  }

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;

  return 'http://localhost:3000';
}

export function artworkUrl(origin: string, ts: number, style: string): string {
  return `${origin}/api/artwork?ts=${ts}&style=${encodeURIComponent(style)}&print=1`;
}
