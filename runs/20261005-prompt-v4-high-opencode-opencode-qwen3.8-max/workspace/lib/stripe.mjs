// Stripe REST helper (no SDK dependency; plain fetch against the v1 API).
const BASE = 'https://api.stripe.com/v1';

function auth(pk) {
  const key = pk || process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured');
  return `Basic ${Buffer.from(key + ':').toString('base64')}`;
}

async function call(method, path, form, secretKey) {
  const r = await fetch(BASE + path, {
    method,
    headers: {
      Authorization: auth(secretKey),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form ? new URLSearchParams(form) : undefined,
  });
  const j = await r.json();
  if (j.error) {
    const e = new Error(j.error.message || 'Stripe error');
    e.stripe = j.error;
    throw e;
  }
  return j;
}

export const stripe = {
  createCheckoutSession(form) { return call('POST', '/checkout/sessions', form); },
  retrieveCheckoutSession(id, expand = []) {
    const q = expand.map((e, i) => `expand[${i}]=${encodeURIComponent(e)}`).join('&');
    return call('GET', `/checkout/sessions/${encodeURIComponent(id)}${q ? '?' + q : ''}`);
  },
  retrievePaymentIntent(id) { return call('GET', `/payment_intents/${encodeURIComponent(id)}`); },
  updatePaymentIntent(id, form) { return call('POST', `/payment_intents/${encodeURIComponent(id)}`, form); },
  createWebhookEndpoint(form) { return call('POST', '/webhook_endpoints', form); },
  deleteWebhookEndpoint(id) {
    return fetch(`${BASE}/webhook_endpoints/${id}`, { method: 'DELETE', headers: { Authorization: auth() } }).then((r) => r.json());
  },
  listWebhookEndpoints() { return call('GET', '/webhook_endpoints?limit=100'); },
  verifySignature: async (rawBody, header, secret) => {
    const { createHmac, timingSafeEqual } = await import('node:crypto');
    const parts = Object.fromEntries(header.split(',').map((kv) => kv.split('=')));
    const t = parts.t;
    const signed = `${t}.${rawBody}`;
    const expected = createHmac('sha256', secret).update(signed).digest('hex');
    const presented = (header.match(/v1=([a-f0-9]+)/) || [])[1] || '';
    if (!timingSafeEqual(Buffer.from(expected), Buffer.from(presented))) throw new Error('webhook signature mismatch');
    if (Math.abs(Date.now() / 1000 - Number(t)) > 300) throw new Error('webhook timestamp too old');
    return JSON.parse(rawBody);
  },
};
