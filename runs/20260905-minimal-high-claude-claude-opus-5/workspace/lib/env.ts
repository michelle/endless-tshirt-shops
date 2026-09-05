/** Small helpers for reading required server configuration. */

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function optionalEnv(name: string): string | undefined {
  return process.env[name] || undefined;
}

/**
 * The public origin of this deployment. Prodigi fetches print assets over the
 * public internet, so this has to be an absolute, externally reachable URL.
 */
export function siteOrigin(req?: Request): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, '');

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;

  if (req) return new URL(req.url).origin;
  return 'http://localhost:3000';
}
