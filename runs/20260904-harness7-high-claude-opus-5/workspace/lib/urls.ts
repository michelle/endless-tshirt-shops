import { headers } from 'next/headers';

/**
 * The public origin of this deployment.
 *
 * Prodigi downloads our artwork over the public internet and Stripe redirects
 * buyers back to us, so both need an absolute, externally reachable URL.
 * `PUBLIC_BASE_URL` wins when set (that is the stable production domain);
 * otherwise we fall back to the per-deployment Vercel URL, and finally to the
 * request's own headers so local development works with no configuration.
 */
export async function getBaseUrl(): Promise<string> {
  const configured = process.env.PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_BASE_URL;
  if (configured) return stripTrailingSlash(withScheme(configured));

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;

  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

function withScheme(url: string): string {
  return /^https?:\/\//.test(url) ? url : `https://${url}`;
}

function stripTrailingSlash(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}
