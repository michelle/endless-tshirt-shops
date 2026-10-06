// Central configuration. Everything sensitive comes from environment variables.
export const PRODUCT = {
  name: 'Overhead Tee — your sky, printed',
  sku: 'GLOBAL-TEE-BC-3001', // Bella+Canvas 3001 unisex tee, 100% cotton (ideal for DTG)
  priceCents: Number(process.env.TEE_PRICE_CENTS || 3400),
  currency: 'usd',
  maxQty: 10,
};

// Countries we sell to (all supported by Prodigi for this SKU). Label shown in the UI.
export const COUNTRIES = {
  US: 'United States', CA: 'Canada', GB: 'United Kingdom', IE: 'Ireland', AU: 'Australia', NZ: 'New Zealand',
  DE: 'Germany', FR: 'France', NL: 'Netherlands', BE: 'Belgium', LU: 'Luxembourg', AT: 'Austria', CH: 'Switzerland',
  ES: 'Spain', PT: 'Portugal', IT: 'Italy', DK: 'Denmark', SE: 'Sweden', NO: 'Norway', FI: 'Finland',
  PL: 'Poland', CZ: 'Czechia', JP: 'Japan', SG: 'Singapore', HK: 'Hong Kong', MX: 'Mexico',
};

export function env(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable ${name}`);
  return v;
}

export function siteUrl(request) {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, '');
  const h = request.headers;
  const host = h.get('x-forwarded-host') || h.get('host');
  const proto = h.get('x-forwarded-proto') || (host?.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

export const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...headers } });
