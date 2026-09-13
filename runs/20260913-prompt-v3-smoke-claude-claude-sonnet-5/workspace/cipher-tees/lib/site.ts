// Canonical site URL used to build absolute art/asset URLs that are handed
// to Stripe (line item images) and Prodigi (print file assets). Pinned to
// an explicit env var rather than trusted per-request headers so the URL
// generated at checkout time always matches the one used later inside the
// webhook (which has no incoming request to read an Origin from).
export function getSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}
