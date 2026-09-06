/**
 * Absolute-URL helper.
 *
 * Prodigi fetches the print file over the public internet, so the artwork URL
 * we hand it has to resolve from outside the request. We prefer an explicitly
 * configured public URL, then Vercel's production domain, and only fall back to
 * the incoming request's host.
 */

export function siteOrigin(req?: Request): string {
  const configured = process.env.PUBLIC_BASE_URL ?? process.env.NEXT_PUBLIC_BASE_URL;
  if (configured) return configured.replace(/\/+$/, '');

  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (production) return `https://${production}`;

  if (req) {
    const url = new URL(req.url);
    const host = req.headers.get('x-forwarded-host') ?? url.host;
    const proto = req.headers.get('x-forwarded-proto') ?? url.protocol.replace(':', '');
    return `${proto}://${host}`;
  }

  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  return 'http://localhost:3000';
}

export function artworkUrl(origin: string, ink: string, timestamp: string): string {
  return `${origin}/api/art/${ink}/${timestamp}.png`;
}
