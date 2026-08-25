/**
 * Absolute origin for this deployment. Prodigi fetches artwork over the public
 * internet, so this has to resolve to something reachable from outside.
 */
export function siteOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, '');

  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (production) return `https://${production}`;

  const deployment = process.env.VERCEL_URL;
  if (deployment) return `https://${deployment}`;

  return `http://localhost:${process.env.PORT ?? 3000}`;
}

export function isPubliclyReachable(origin: string): boolean {
  return !/^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])/i.test(origin);
}
