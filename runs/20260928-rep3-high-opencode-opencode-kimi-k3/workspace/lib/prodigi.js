// Prodigi Print API v4 client (sandbox by default).
const BASE = () => process.env.PRODIGI_API_BASE || 'https://api.sandbox.prodigi.com';

async function api(method, path, body) {
  const key = process.env.PRODIGI_API_KEY;
  if (!key) throw new Error('PRODIGI_API_KEY is not configured');
  const res = await fetch(`${BASE()}/v4.0${path}`, {
    method,
    headers: {
      'X-API-Key': key,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(json?.failures ? JSON.stringify(json.failures) : `Prodigi HTTP ${res.status} ${json?.outcome || ''}`);
    err.prodigi = json;
    throw err;
  }
  return json;
}

export function createOrder(order) {
  return api('POST', '/orders', order);
}

export function getOrder(id) {
  return api('GET', `/orders/${encodeURIComponent(id)}`);
}

export function findOrdersByMerchantReference(ref) {
  return api('GET', `/orders?merchantReferences=${encodeURIComponent(ref)}`);
}
