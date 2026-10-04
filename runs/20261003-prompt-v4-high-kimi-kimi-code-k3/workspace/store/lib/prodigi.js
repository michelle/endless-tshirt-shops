// Minimal Prodigi Print API v4 client.
const BASE = process.env.PRODIGI_BASE || 'https://api.sandbox.prodigi.com/v4.0';

async function prodigi(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'X-API-Key': process.env.PRODIGI_API_KEY,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { status: res.status, json };
}

function createOrder({ merchantReference, recipient, items, shippingMethod = 'Standard' }) {
  return prodigi('/orders', {
    method: 'POST',
    body: {
      merchantReference,
      idempotencyKey: merchantReference,
      shippingMethod,
      recipient,
      items,
    },
  });
}

module.exports = { prodigi, createOrder };
