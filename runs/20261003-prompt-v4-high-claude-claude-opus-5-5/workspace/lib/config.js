import Stripe from 'stripe';

export const PRODUCT = {
  sku: 'GLOBAL-TEE-BC-3001',
  name: 'Bella+Canvas 3001 Unisex Tee',
  unitAmount: 3800, // USD cents
  currency: 'usd',
  maxQty: 20,
};

// Prodigi ships the BC-3001 to all of these from its global network.
export const COUNTRIES = ['US', 'CA', 'GB', 'IE', 'DE', 'FR', 'NL', 'BE', 'LU', 'AT', 'ES', 'PT', 'IT', 'DK', 'SE', 'FI', 'NO', 'CH', 'PL', 'AU', 'NZ'];

export const SHIPPING = {
  Standard: { label: 'Standard tracked', first: 595, extra: 200, days: [5, 10] },
  Express: { label: 'Express', first: 2495, extra: 400, days: [2, 5] },
};

export const PRODIGI_BASE = process.env.PRODIGI_API_BASE || 'https://api.sandbox.prodigi.com/v4.0';

let stripe;
export function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY is not configured');
  stripe ??= new Stripe(process.env.STRIPE_SECRET_KEY, { maxNetworkRetries: 2 });
  return stripe;
}

export function baseUrl(request) {
  if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL.replace(/\/$/, '');
  const h = request.headers;
  const host = h.get('x-forwarded-host') || h.get('host');
  const proto = h.get('x-forwarded-proto') || (host?.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

export const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...headers } });
