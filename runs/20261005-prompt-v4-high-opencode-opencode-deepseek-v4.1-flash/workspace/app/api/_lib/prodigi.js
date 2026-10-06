'use strict';
// Minimal Prodigi Print API v4 client.

function base() {
  return process.env.PRODIGI_API_BASE || 'https://api.sandbox.prodigi.com/v4.0';
}
function key() {
  return process.env.PRODIGI_API_KEY || '';
}

async function call(method, path, body) {
  if (!key()) throw new Error('PRODIGI_API_KEY is not configured');
  const res = await fetch(`${base()}${path}`, {
    method,
    headers: { 'X-API-Key': key(), 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(`Prodigi ${res.status}`);
    err.status = res.status;
    err.prodigi = data;
    throw err;
  }
  return data;
}

function createOrder(order) {
  return call('POST', '/orders', order);
}
function getOrder(id) {
  return call('GET', `/orders/${encodeURIComponent(id)}`);
}

module.exports = { createOrder, getOrder, key, base };
