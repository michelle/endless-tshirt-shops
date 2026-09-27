/**
 * Absolute origin for links handed to third parties (Stripe success URLs,
 * artwork links Prodigi will fetch). APP_URL wins so production links stay
 * stable regardless of which deployment handled the request.
 */
export function originFor(req: Request): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const h = new Headers(req.headers);
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
