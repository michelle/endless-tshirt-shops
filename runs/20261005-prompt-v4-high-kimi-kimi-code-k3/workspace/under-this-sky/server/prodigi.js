// Minimal Prodigi Print API v4.0 client.
const BASE = process.env.PRODIGI_BASE || 'https://api.sandbox.prodigi.com/v4.0';
const KEY = process.env.PRODIGI_API_KEY;

async function call(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'X-API-Key': KEY, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { status: res.status, json };
}

export function createOrder(order) {
  return call('POST', '/orders', order);
}
export function getOrder(id) {
  return call('GET', `/orders/${encodeURIComponent(id)}`);
}
export function getProduct(sku) {
  return call('GET', `/products/${encodeURIComponent(sku)}`);
}
export function createQuote(quote) {
  return call('POST', '/quotes', quote);
}
