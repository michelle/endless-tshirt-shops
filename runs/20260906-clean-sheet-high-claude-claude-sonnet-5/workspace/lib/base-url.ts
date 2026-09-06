// Derives the current deployment's absolute origin from request headers so
// asset URLs (sent to Stripe and to Prodigi) work on production, preview,
// and local dev without hardcoding a domain.
export function getBaseUrl(req: Request): string {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
