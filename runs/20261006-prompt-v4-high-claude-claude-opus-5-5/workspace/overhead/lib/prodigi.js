import { env, PRODUCT } from './config.js';

const base = () => process.env.PRODIGI_API_URL || 'https://api.sandbox.prodigi.com/v4.0';

async function call(path, init = {}) {
  const res = await fetch(`${base()}${path}`, {
    ...init,
    headers: { 'X-API-Key': env('PRODIGI_API_KEY'), 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(`Prodigi ${res.status}: ${JSON.stringify(body).slice(0, 600)}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

const quoteCache = new Map();

/** Prodigi's own cost for shipping `copies` tees to `country` (USD). */
export async function shippingCost(country, copies = 1) {
  const key = `${country}:${copies}`;
  const hit = quoteCache.get(key);
  if (hit && hit.at > Date.now() - 6 * 3600e3) return hit.value;
  const body = await call('/quotes', {
    method: 'POST',
    body: JSON.stringify({
      shippingMethod: 'Standard',
      destinationCountryCode: country,
      currencyCode: 'USD',
      items: [{ sku: PRODUCT.sku, copies, attributes: { color: 'black', size: 'l' }, assets: [{ printArea: 'front' }] }],
    }),
  });
  const q = body.quotes?.[0];
  if (!q) throw new Error(`No Prodigi quote for ${country}`);
  const value = {
    shipping: Number(q.costSummary.shipping.amount),
    items: Number(q.costSummary.items.amount),
    tax: Number(q.costSummary.totalTax?.amount || 0),
  };
  quoteCache.set(key, { at: Date.now(), value });
  return value;
}

/** What we charge the customer for shipping, in cents: Prodigi's cost rounded up to x.95, min $4.95. */
export async function shippingChargeCents(country, copies) {
  const { shipping } = await shippingCost(country, copies);
  return Math.max(495, Math.ceil(shipping + 0.05) * 100 - 5);
}

export async function createOrder({ idempotencyKey, merchantReference, recipient, color, size, copies, assetUrl, metadata }) {
  const body = await call('/orders', {
    method: 'POST',
    body: JSON.stringify({
      merchantReference,
      idempotencyKey,
      shippingMethod: 'Standard',
      recipient,
      items: [
        {
          merchantReference: `${merchantReference}-1`,
          sku: PRODUCT.sku,
          copies,
          sizing: 'fitPrintArea',
          attributes: { color, size },
          assets: [{ printArea: 'front', url: assetUrl }],
        },
      ],
      metadata,
    }),
  });
  return body.order;
}

export async function getOrder(id) {
  return (await call(`/orders/${encodeURIComponent(id)}`)).order;
}
