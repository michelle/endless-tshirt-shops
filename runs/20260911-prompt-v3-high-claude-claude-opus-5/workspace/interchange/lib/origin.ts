/**
 * The public base URL. Prodigi fetches artwork over the internet, so this has
 * to be the real production origin rather than whatever host served the
 * request (a preview deployment may be behind Vercel auth).
 */
export function publicOrigin(req?: { headers: Headers }): string {
  const explicit = process.env.PUBLIC_BASE_URL;
  if (explicit) return explicit.replace(/\/$/, "");

  const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (prod) return `https://${prod}`;

  if (req) {
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
    const proto = req.headers.get("x-forwarded-proto") || (host?.startsWith("localhost") ? "http" : "https");
    if (host) return `${proto}://${host}`;
  }
  return "http://localhost:3000";
}
