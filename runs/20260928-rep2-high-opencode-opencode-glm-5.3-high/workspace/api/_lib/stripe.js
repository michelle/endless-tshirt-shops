// Minimal Stripe REST client — form-encoded, no SDK. Checkout Sessions,
// PaymentIntents and webhook signature verification are all we use, and
// each call is shaped here explicitly.

import { createHmac, timingSafeEqual } from 'node:crypto';

const STRIPE_API = 'https://api.stripe.com/v1';

function encodeParams(params, prefix = '') {
  // Stripe's form encoding: line_items[0][price_data][currency]=usd
  const parts = [];
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    const name = prefix ? `${prefix}[${key}]` : key;
    if (Array.isArray(value)) {
      value.forEach((entry, index) => {
        parts.push(...encodeParams(entry, `${name}[${index}]`));
      });
    } else if (typeof value === 'object') {
      parts.push(...encodeParams(value, name));
    } else {
      parts.push([name, String(value)]);
    }
  }
  return parts;
}

export async function stripeRequest(method, path, params = {}, { idempotencyKey } = {}) {
  const headers = {
    authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
    'content-type': 'application/x-www-form-urlencoded',
  };
  if (idempotencyKey) headers['idempotency-key'] = idempotencyKey;
  const body = encodeParams(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
  const response = await fetch(`${STRIPE_API}${path}`, {
    method,
    headers,
    body: method === 'GET' ? undefined : body,
  });
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data };
}

export function createCheckoutSession(params) {
  // No idempotency key: a retried checkout simply creates a second,
  // unpaid session; only the one the customer pays matters.
  return stripeRequest('POST', '/checkout/sessions', params);
}

export function retrieveCheckoutSession(id, expand = []) {
  const query = expand.length ? `?expand[]=${expand.map(encodeURIComponent).join('&expand[]=')}` : '';
  return stripeRequest('GET', `/checkout/sessions/${encodeURIComponent(id)}${query}`);
}

// Updates metadata in place, merging over what's already there so the
// fulfillment marker never clobbers other keys.
export async function updatePaymentIntentMetadata(id, additions) {
  const current = await stripeRequest('GET', `/payment_intents/${encodeURIComponent(id)}`);
  if (!current.ok) return current;
  const merged = { ...(current.data.metadata || {}), ...additions };
  return stripeRequest('POST', `/payment_intents/${encodeURIComponent(id)}`, { metadata: merged });
}

// Stripe's v1 webhook signature: `t=<unix>,v1=<hex>` over `${t}.${rawBody}`.
export function verifyWebhookSignature(rawBody, header, secret) {
  if (!secret || !header) return false;
  const parts = Object.fromEntries(
    header.split(',').map((piece) => piece.split('=').map((s) => s.trim())),
  );
  const timestamp = parts.t;
  const provided = parts.v1;
  if (!timestamp || !provided) return false;
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > 300) return false; // 5-minute replay window
  const expected = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(provided, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}
