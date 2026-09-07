/** Small helpers for reading server config without scattering `process.env`. */

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function optionalEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

/**
 * The publicly reachable origin for this deployment. Prodigi fetches print
 * artwork from us, so this has to be a real, external URL — never localhost in
 * production. Prefer the stable production domain over the per-deploy one so
 * artwork URLs stored on an order keep resolving.
 */
export function siteOrigin(requestUrl?: string): string {
  const explicit = optionalEnv('NEXT_PUBLIC_SITE_URL');
  if (explicit) return explicit.replace(/\/$/, '');

  const productionUrl = optionalEnv('VERCEL_PROJECT_PRODUCTION_URL');
  if (productionUrl) return `https://${productionUrl}`;

  const deploymentUrl = optionalEnv('VERCEL_URL');
  if (deploymentUrl) return `https://${deploymentUrl}`;

  if (requestUrl) return new URL(requestUrl).origin;
  return 'http://localhost:3000';
}
