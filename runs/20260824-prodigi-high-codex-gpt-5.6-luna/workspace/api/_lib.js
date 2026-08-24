import Stripe from 'stripe';

export const PRICE_CENTS = 2250;

export const PRODUCTS = {
  fitted: { sku: 'GLOBAL-TEE-BC-3001', label: 'Fitted / Bella+Canvas 3001' },
  unisex: { sku: 'GLOBAL-TEE-GIL-64000', label: 'Classic / Gildan 64000' },
};

export const SIZES = ['S', 'M', 'L', 'XL'];

export function stripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, { maxNetworkRetries: 2 });
}

export function originFromRequest(req) {
  const forwardedHost = req.headers['x-forwarded-host'] || req.headers.host;
  const host = String(forwardedHost || 'localhost:5173').split(',')[0].trim();
  const protocol = req.headers['x-forwarded-proto'] || (host.startsWith('localhost') ? 'http' : 'https');
  return `${protocol}://${host}`;
}

export function jsonError(res, status, message, code = 'bad_request') {
  return res.status(status).json({ error: { message, code } });
}

export function cleanString(value, max = 160) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function validOrderOptions(style, size) {
  return Boolean(PRODUCTS[style] && SIZES.includes(size));
}
