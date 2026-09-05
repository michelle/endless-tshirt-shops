/**
 * Resolve the public base URL of this deployment.
 * Prodigi needs a publicly reachable URL for the print asset, so we prefer
 * an explicit NEXT_PUBLIC_SITE_URL, then Vercel's production domain, then
 * the deployment URL, then the request origin.
 */
export function siteUrl(requestOrigin?: string): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (prod) return `https://${prod}`;
  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  if (requestOrigin) return requestOrigin.replace(/\/$/, "");
  return "http://localhost:3000";
}

export function artUrl(base: string, ts: number, ink: "white" | "black"): string {
  return `${base}/art/${ts}.png?ink=${ink}`;
}

export function previewUrl(base: string, ts: number, bg: "black" | "white"): string {
  return `${base}/art/${ts}.png?preview=1&bg=${bg}`;
}
