// Thin Prodigi Print API v4 client (sandbox by default).
const BASE = () => (process.env.PRODIGI_API_BASE || 'https://api.sandbox.prodigi.com/v4.0').replace(/\/$/, '');

function key() {
  const k = process.env.PRODIGI_API_KEY;
  if (!k) throw new Error('PRODIGI_API_KEY is not configured');
  return k;
}

async function call(method, path, body) {
  const r = await fetch(`${BASE()}${path}`, {
    method,
    headers: { 'X-API-Key': key(), 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!r.ok) {
    const msg = data?.failures ? JSON.stringify(data.failures) : data?.message || data?.raw || r.statusText;
    throw new Error(`Prodigi ${method} ${path} -> ${r.status}: ${msg}`);
  }
  return data;
}

export const isSandbox = () => BASE().includes('sandbox');

export async function createOrder(order) {
  const res = await call('POST', '/orders', order);
  const ok = ['Created', 'CreatedWithIssues', 'AlreadyExists', 'OnHold'].includes(res.outcome);
  if (!ok) throw new Error(`Prodigi order not created: ${res.outcome} ${JSON.stringify(res.issues || res.failures || res)}`);
  return res; // { outcome, order: { id, status: { stage }, shipments, ... } }
}

export async function getOrder(id) {
  return call('GET', `/orders/${encodeURIComponent(id)}`);
}
