const PRODUCT_SKU = 'GLOBAL-TEE-GIL-64000';
const PRICE_CENTS = 3400;
const ALLOWED_COLORS = ['black', 'natural', 'navy blue', 'sport grey', 'white'];
const ALLOWED_SIZES = ['xs', 's', 'm', 'l', 'xl', '2xl', '3xl'];
const ALLOWED_STYLES = ['ORBIT', 'PULSE', 'ECHO'];
const ALLOWED_INKS = ['coral', 'lime', 'lilac', 'sky'];

function cleanText(value, max) {
  return String(value || '').replace(/[<>]/g, '').trim().slice(0, max);
}

export function normalizeDesign(input = {}) {
  const phrase = cleanText(input.phrase, 24).toUpperCase() || 'KEEP GOING';
  const style = ALLOWED_STYLES.includes(String(input.style).toUpperCase()) ? String(input.style).toUpperCase() : 'ORBIT';
  const ink = ALLOWED_INKS.includes(String(input.ink).toLowerCase()) ? String(input.ink).toLowerCase() : 'coral';
  const shirtColor = ALLOWED_COLORS.includes(String(input.shirtColor).toLowerCase()) ? String(input.shirtColor).toLowerCase() : 'black';
  const shirtSize = ALLOWED_SIZES.includes(String(input.shirtSize).toLowerCase()) ? String(input.shirtSize).toLowerCase() : 'm';
  return { phrase, style, ink, shirtColor, shirtSize };
}

export function parseItems(items) {
  if (!Array.isArray(items) || items.length < 1 || items.length > 10) throw new Error('Your bag is empty or too large.');
  return items.map((item) => {
    const design = normalizeDesign(item.design || item);
    const quantity = Math.max(1, Math.min(5, Number.parseInt(item.quantity, 10) || 1));
    return { design, quantity };
  });
}

export function artworkPath(design) {
  const params = new URLSearchParams({ phrase: design.phrase, style: design.style, ink: design.ink });
  return `/api/artwork?${params.toString()}`;
}

export function originForRequest(req) {
  const forwarded = req.headers['x-forwarded-proto'] || 'https';
  const host = process.env.PUBLIC_APP_URL || `${forwarded}://${req.headers.host || process.env.VERCEL_URL || 'localhost:3000'}`;
  return String(host).replace(/\/$/, '');
}

export function stripeForm(params) {
  const body = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => body.set(key, String(value)));
  return body;
}

export async function stripeRequest(path, params, method = 'POST') {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('Stripe is not configured. Add STRIPE_SECRET_KEY to the deployment.');
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method,
    headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: method === 'GET' ? undefined : stripeForm(params),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || 'Stripe request failed.');
  return data;
}

export async function submitToProdigi(order) {
  if (!process.env.PRODIGI_API_KEY) throw new Error('Prodigi is not configured.');
  const response = await fetch('https://api.sandbox.prodigi.com/v4.0/orders', {
    method: 'POST',
    headers: { 'X-API-Key': process.env.PRODIGI_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(order),
  });
  const data = await response.json();
  if (!response.ok || ['BadRequest', 'Unauthorized', 'EntityNotFound'].includes(data?.outcome)) {
    throw new Error(data?.issues?.[0]?.description || data?.outcome || 'Prodigi order failed.');
  }
  return data;
}

export { PRODUCT_SKU, PRICE_CENTS };
