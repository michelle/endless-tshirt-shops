// Minimal Prodigi Print API v4 client.
const BASE = process.env.PRODIGI_API_BASE || 'https://api.sandbox.prodigi.com/v4.0';

async function call(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'X-API-Key': process.env.PRODIGI_API_KEY, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !['Created', 'CreatedWithIssues', 'Ok', 'AlreadyExists', 'OnHold'].includes(json.outcome)) {
    const err = new Error(`Prodigi ${method} ${path} failed: ${res.status} ${JSON.stringify(json).slice(0, 800)}`);
    err.response = json;
    throw err;
  }
  return json;
}

export const prodigi = {
  createOrder: (payload) => call('POST', '/orders', payload),
  getOrder: (id) => call('GET', `/orders/${encodeURIComponent(id)}`),
  quote: (payload) => call('POST', '/quotes', payload),
  isSandbox: () => BASE.includes('sandbox'),
};
