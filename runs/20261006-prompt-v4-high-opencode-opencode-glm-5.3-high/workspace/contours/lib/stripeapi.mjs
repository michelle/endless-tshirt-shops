// Minimal Stripe REST client (form-encoded) + webhook signature verification.
// The sandbox key is restricted (rkcs_test_…): it can create Checkout Sessions,
// fetch sessions/events and manage webhook endpoints — everything this store
// does — and nothing else. No SDK dependency needed.

import crypto from 'node:crypto';

const API = 'https://api.stripe.com/v1';

export class StripeError extends Error {
  constructor(message, status, body) {
    super(message);
    this.status = status || 502;
    this.body = body;
  }
}

// params: flat object; values may be primitives, arrays or nested objects.
// Nested keys encode as key[sub]=v, arrays as key[]=v (in order).
export function encodeForm(params, prefix = '') {
  const out = [];
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (Array.isArray(v)) {
      for (const item of v) {
        if (item !== null && typeof item === 'object') out.push(...encodeForm(item, `${key}[]`));
        else out.push([`${key}[]`, String(item)]);
      }
    } else if (typeof v === 'object') {
      out.push(...encodeForm(v, key));
    } else {
      out.push([key, String(v)]);
    }
  }
  return out;
}

export async function stripeFetch(method, path, params, apiKey) {
  const body = params ? new URLSearchParams(encodeForm(params)) : undefined;
  const res = await fetch(API + path, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body ? body.toString() : undefined,
    signal: AbortSignal.timeout(25000),
  });
  let json;
  try { json = await res.json(); } catch { json = {}; }
  if (!res.ok) {
    const msg = json?.error?.message || `Stripe ${method} ${path} → HTTP ${res.status}`;
    throw new StripeError(msg, res.status, json);
  }
  return json;
}

export function createStripeApi(apiKey) {
  return {
    createCheckoutSession: (params) => stripeFetch('POST', '/checkout/sessions', params, apiKey),
    getCheckoutSession: (id) => stripeFetch('GET', `/checkout/sessions/${encodeURIComponent(id)}`, undefined, apiKey),
    getEvent: (id) => stripeFetch('GET', `/events/${encodeURIComponent(id)}`, undefined, apiKey),
    listWebhookEndpoints: () => stripeFetch('GET', '/webhook_endpoints?limit=100', undefined, apiKey),
    createWebhookEndpoint: (params) => stripeFetch('POST', '/webhook_endpoints', params, apiKey),
    updateWebhookEndpoint: (id, params) => stripeFetch('POST', `/webhook_endpoints/${encodeURIComponent(id)}`, params, apiKey),
    deleteWebhookEndpoint: (id) => stripeFetch('DELETE', `/webhook_endpoints/${encodeURIComponent(id)}`, undefined, apiKey),
  };
}

// Stripe-Signature: t=…,v1=… over `${t}.${rawBody}`
export function verifyWebhookSignature(rawBody, header, secret, toleranceSec = 300) {
  if (!header || typeof header !== 'string') return false;
  const parts = Object.fromEntries(header.split(',').map((kv) => kv.split('=').map((s) => s.trim())).map(([k, v]) => [k, v]));
  const t = parts.t, v1 = parts.v1;
  if (!t || !v1) return false;
  const age = Math.abs(Date.now() / 1000 - Number(t));
  if (!Number.isFinite(age) || age > toleranceSec) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${t}.${rawBody}`).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(v1);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
