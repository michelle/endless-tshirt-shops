import { headers } from 'next/headers';

/**
 * Absolute origin of this deployment. Prefers the forwarded host so it works
 * behind Vercel's proxy, on preview URLs and on a future custom domain.
 */
export function baseUrlFromHeaders(h: Headers): string {
  const host = h.get('x-forwarded-host') ?? h.get('host');
  if (!host) throw new Error('cannot determine request host');
  const proto = h.get('x-forwarded-proto') ?? 'https';
  return `${proto}://${host}`;
}

/** For route handlers. */
export function baseUrlFromRequest(req: Request): string {
  return baseUrlFromHeaders(req.headers);
}

/** For server components / pages. */
export async function baseUrlFromServerHeaders(): Promise<string> {
  return baseUrlFromHeaders(await headers());
}
