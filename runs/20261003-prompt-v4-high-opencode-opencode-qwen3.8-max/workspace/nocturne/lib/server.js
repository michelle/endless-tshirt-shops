// Shared server-side configuration for NOCTURNE's API routes.
'use strict';

const PRODIGI_HOST = process.env.PRODIGI_HOST || 'api.sandbox.prodigi.com';
const PRODIGI_KEY = process.env.PRODIGI_API_KEY || '';
const APP_URL = process.env.APP_URL || '';

const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_PUBLISHABLE = process.env.STRIPE_PUBLISHABLE_KEY || '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

const SHIP_COUNTRIES = [
  'US', 'CA', 'GB', 'IE', 'FR', 'DE', 'ES', 'PT', 'IT', 'NL', 'BE', 'AT', 'CH', 'DK', 'SE', 'NO', 'FI',
  'PL', 'CZ', 'GR', 'AU', 'NZ', 'JP', 'SG', 'IS', 'LU', 'MX', 'BR', 'ZA', 'KR',
];

// ---------------------------------------------------------------- KV (order store)
// Uses Vercel KV (Upstash REST) when provisioned; otherwise degrades to an in-memory
// fallback so the app keeps working (single-instance caveat documented).
let memStore = null;
function kvAvailable() {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}
async function kvGet(key) {
  if (!kvAvailable()) {
    if (!memStore) memStore = globalThis.__nocturneMem || (globalThis.__nocturneMem = new Map());
    return memStore.get(key) ?? null;
  }
  const r = await fetch(`${process.env.KV_REST_API_URL}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` },
  });
  const j = await r.json();
  return j.result ?? null;
}
async function kvSet(key, value) {
  if (!kvAvailable()) {
    if (!memStore) memStore = globalThis.__nocturneMem || (globalThis.__nocturneMem = new Map());
    memStore.set(key, value);
    return true;
  }
  const r = await fetch(`${process.env.KV_REST_API_URL}/set`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([key, value]),
  });
  return r.ok;
}

function json(res, status, body, headers) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
  res.end(JSON.stringify(body));
}

function readBody(req, limit = 64 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(new Error('body too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

// -------- Prodigi helpers --------
async function prodigiCreateOrder(order) {
  const r = await fetch(`https://${PRODIGI_HOST}/v4.0/Orders`, {
    method: 'POST',
    headers: { 'X-API-Key': PRODIGI_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(order),
  });
  const j = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, body: j };
}
async function prodigiGetOrder(id) {
  const r = await fetch(`https://${PRODIGI_HOST}/v4.0/Orders/${encodeURIComponent(id)}`, {
    headers: { 'X-API-Key': PRODIGI_KEY },
  });
  const j = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, body: j };
}

const money = (cents) => `$${(cents / 100).toFixed(2)}`;

module.exports = {
  PRODIGI_HOST,
  PRODIGI_KEY,
  APP_URL,
  STRIPE_SECRET,
  STRIPE_PUBLISHABLE,
  STRIPE_WEBHOOK_SECRET,
  SHIP_COUNTRIES,
  kvGet,
  kvSet,
  kvAvailable,
  json,
  readBody,
  prodigiCreateOrder,
  prodigiGetOrder,
  money,
};
