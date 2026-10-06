// Prodigi Print API v4 client: quotes, order creation, order lookup.
import { config } from './config.js';
import { PRODUCT, shirtColor } from '../public/catalog.js';

async function prodigi(method, path, body) {
  if (!config.prodigiApiKey) throw new Error('PRODIGI_API_KEY is not configured');
  const res = await fetch(`${config.prodigiBaseUrl}${path}`, {
    method,
    headers: { 'X-API-Key': config.prodigiApiKey, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = data?.failures ? JSON.stringify(data.failures) : data?.outcome ?? res.status;
    throw new Error(`Prodigi ${method} ${path}: ${detail}`);
  }
  return data;
}

export const SHIPPING_METHODS = [
  { method: 'Standard', label: 'Standard', estimate: { min: 5, max: 12 } },
  { method: 'Express', label: 'Express', estimate: { min: 2, max: 6 } },
];

// What we charge the customer for shipping: Prodigi's cost rounded up to the dollar.
export async function shippingOptions({ country, shirt, items }) {
  const color = shirtColor(shirt).prodigi;
  const results = await Promise.all(
    SHIPPING_METHODS.map(async (m) => {
      try {
        const q = await prodigi('POST', '/quotes', {
          shippingMethod: m.method,
          destinationCountryCode: country,
          currencyCode: 'USD',
          items: items.map((it) => ({
            sku: PRODUCT.sku, copies: it.qty, attributes: { color, size: it.size }, assets: [{ printArea: 'front' }],
          })),
        });
        const quote = q.quotes?.[0];
        if (!quote) return null;
        const cost = Number(quote.costSummary.shipping.amount);
        return { ...m, amount: Math.max(400, Math.ceil(cost) * 100) };
      } catch (e) {
        console.error('quote failed', m.method, e.message);
        return null;
      }
    })
  );
  return results.filter(Boolean);
}

export function createOrder(order) {
  return prodigi('POST', '/orders', order);
}

export function getOrder(id) {
  return prodigi('GET', `/orders/${encodeURIComponent(id)}`);
}
