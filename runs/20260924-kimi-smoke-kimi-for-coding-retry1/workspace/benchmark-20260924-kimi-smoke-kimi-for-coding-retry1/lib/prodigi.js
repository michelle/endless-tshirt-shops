// Thin client for the Prodigi Print API v4.

const BASE = () => process.env.PRODIGI_BASE || 'https://api.sandbox.prodigi.com/v4.0';

async function call(method, path, body) {
  const res = await fetch(`${BASE()}${path}`, {
    method,
    headers: {
      'X-API-Key': process.env.PRODIGI_API_KEY || '',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const err = new Error(`Prodigi ${method} ${path} failed: HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export function createOrder(payload) {
  return call('POST', '/orders', payload);
}

export function getOrder(id) {
  return call('GET', `/orders/${encodeURIComponent(id)}`);
}

export function listOrdersByReference(ref) {
  return call('GET', `/orders?merchantReferences=${encodeURIComponent(ref)}&top=10`);
}
