'use strict';
// Thin Stripe REST client (form-encoded) so we depend on nothing but fetch.

const API = 'https://api.stripe.com/v1';

function key() {
  return process.env.STRIPE_SECRET_KEY || '';
}

function encode(params, prefix, out) {
  out = out || [];
  for (const k of Object.keys(params || {})) {
    const v = params[k];
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (Array.isArray(v)) {
      v.forEach((item, i) => encode({ [i]: item }, key, out));
    } else if (typeof v === 'object') {
      encode(v, key, out);
    } else {
      out.push(`${encodeURIComponent(key)}=${encodeURIComponent(v)}`);
    }
  }
  return out;
}

async function request(method, path, params) {
  if (!key()) throw new Error('STRIPE_SECRET_KEY is not configured');
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${key()}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Stripe-Version': '2024-06-20',
    },
    body: method === 'GET' ? undefined : encode(params).join('&'),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data && data.error ? data.error.message : `Stripe ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.stripe = data && data.error;
    throw err;
  }
  return data;
}

function createCheckoutSession(params) {
  return request('POST', '/checkout/sessions', params);
}

function retrieveCheckoutSession(id) {
  return request('GET', `/checkout/sessions/${encodeURIComponent(id)}`, {
    expand: ['line_items'],
  });
}

module.exports = { createCheckoutSession, retrieveCheckoutSession, key };
