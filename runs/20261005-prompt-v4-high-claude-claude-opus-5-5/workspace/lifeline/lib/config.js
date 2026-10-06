// Runtime configuration. Environment variables always win; secrets.generated.js is an
// optional fallback written by scripts/deploy.sh for hosts where env vars can't be set
// (e.g. Vercel claimable deploys). It is gitignored and never served statically.
let fallback = {};
try {
  fallback = (await import('../secrets.generated.js')).default ?? {};
} catch {
  // not present — rely on environment variables
}

const get = (key, def = undefined) => process.env[key] || fallback[key] || def;

export const config = {
  stripeSecretKey: get('STRIPE_SECRET_KEY'),
  prodigiApiKey: get('PRODIGI_API_KEY'),
  prodigiBaseUrl:
    get('PRODIGI_ENV', 'sandbox') === 'live'
      ? 'https://api.prodigi.com/v4.0'
      : 'https://api.sandbox.prodigi.com/v4.0',
  signingSecret: get('PRINT_SIGNING_SECRET') || get('STRIPE_SECRET_KEY'),
  publicBaseUrl: get('PUBLIC_BASE_URL'),
};

export function baseUrl(req) {
  if (config.publicBaseUrl) return config.publicBaseUrl.replace(/\/$/, '');
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = req.headers['x-forwarded-proto'] || (host?.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}
