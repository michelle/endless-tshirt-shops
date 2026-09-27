// Absolute base URL of the deployed store, used in Stripe redirect URLs and
// in the artwork URLs handed to Prodigi (which must be publicly fetchable).

export function getBaseUrl(): string {
  const explicit = process.env.STORE_BASE_URL;
  if (explicit) return explicit.replace(/\/$/, '');
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  return 'http://localhost:3000';
}
