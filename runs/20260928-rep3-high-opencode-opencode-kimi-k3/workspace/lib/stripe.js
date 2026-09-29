// Minimal Stripe REST client (no SDK) + webhook signature verification.
import crypto from 'node:crypto';

const API = 'https://api.stripe.com';

function encode(params, prefix) {
  if (params === undefined || params === null) return [];
  if (typeof params !== 'object') {
    return [`${encodeURIComponent(prefix)}=${encodeURIComponent(String(params))}`];
  }
  const parts = [];
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (Array.isArray(v)) {
      v.forEach((item, i) => parts.push(...encode(item, `${key}[${i}]`)));
    } else if (typeof v === 'object') {
      parts.push(...encode(v, key));
    } else {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`);
    }
  }
  return parts;
}

async function api(method, path, params) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured');
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      ...(params ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    },
    body: params ? encode(params).join('&') : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json?.error?.message || `Stripe HTTP ${res.status}`;
    const err = new Error(msg);
    err.stripe = json?.error;
    throw err;
  }
  return json;
}

export function createCheckoutSession(params) {
  return api('POST', '/v1/checkout/sessions', params);
}

export function retrieveCheckoutSession(id) {
  return api('GET', `/v1/checkout/sessions/${encodeURIComponent(id)}`);
}

// Verify a Stripe webhook signature header against the raw body.
export function verifyWebhookSignature(rawBody, sigHeader, secret, toleranceSec = 300) {
  if (!sigHeader || !secret) return false;
  const parts = Object.fromEntries(
    sigHeader.split(',').map((kv) => {
      const i = kv.indexOf('=');
      return [kv.slice(0, i), kv.slice(i + 1)];
    })
  );
  const t = parts.t;
  const v1 = parts.v1;
  if (!t || !v1) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${t}.${rawBody}`, 'utf8').digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(v1);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  if (Math.abs(Math.floor(Date.now() / 1000) - Number(t)) > toleranceSec) return false;
  return true;
}
