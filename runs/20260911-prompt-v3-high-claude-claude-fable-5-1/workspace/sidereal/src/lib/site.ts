/** Absolute public origin of this deployment, used for callback + asset URLs. */
export function siteUrl(): string {
  const explicit = process.env.SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (prod) return `https://${prod}`;
  const url = process.env.VERCEL_URL;
  if (url) return `https://${url}`;
  return "http://localhost:3000";
}
