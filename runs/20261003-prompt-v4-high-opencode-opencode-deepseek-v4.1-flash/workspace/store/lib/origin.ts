/** Derive the public origin of the current request (works behind Vercel proxies). */
export function originFromHeaders(h: Headers): string {
  const host = h.get('x-forwarded-host') || h.get('host') || 'localhost:3000';
  const isLocal = host.startsWith('localhost') || host.startsWith('127.0.0.1');
  const proto = h.get('x-forwarded-proto') || (isLocal ? 'http' : 'https');
  return `${proto}://${host}`;
}

export function originFromRequest(req: Request): string {
  const fromHeaders = originFromHeaders(req.headers);
  try {
    const u = new URL(req.url);
    // Vercel sets req.url to the deployment host; prefer it if headers were empty.
    if (!req.headers.get('host')) return u.origin;
  } catch {
    /* ignore */
  }
  return fromHeaders;
}
