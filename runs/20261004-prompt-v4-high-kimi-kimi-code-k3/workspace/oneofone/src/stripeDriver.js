'use strict';

// Stripe Checkout driver — the production payment path.
// Activated by setting STRIPE_SECRET_KEY (+ STRIPE_WEBHOOK_SECRET) in config/env.
// Uses plain HTTPS calls so there is no SDK dependency to audit.
const crypto = require('crypto');

const API = 'https://api.stripe.com/v1';

async function createCheckoutSession(cfg, order, amountUsd, urls) {
  const params = new URLSearchParams({
    mode: 'payment',
    success_url: urls.successUrl,
    cancel_url: urls.cancelUrl,
    'metadata[orderId]': order.id,
    'line_items[0][quantity]': '1',
    'line_items[0][price_data][currency]': 'usd',
    'line_items[0][price_data][unit_amount]': String(Math.round(amountUsd * 100)),
    'line_items[0][price_data][product_data][name]': `ONEOFONE tee “${order.word}” — ed. ${order.edition}`,
    'line_items[0][price_data][product_data][description]': `Bella+Canvas 3001, ${order.shirtColor}, size ${order.size.toUpperCase()}. One-of-one generative artwork.`,
    'line_items[0][price_data][product_data][images][0]': urls.imageUrl,
    customer_email: order.recipient.email,
  });
  const res = await fetch(`${API}/checkout/sessions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cfg.secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Stripe error: ${JSON.stringify(json).slice(0, 300)}`);
  return json; // { id, url, ... }
}

function verifyWebhookSignature(secret, payload, sigHeader) {
  const parts = Object.fromEntries(
    String(sigHeader || '')
      .split(',')
      .map((kv) => kv.split('='))
  );
  if (!parts.t || !parts.v1) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${parts.t}.${payload}`, 'utf8').digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(parts.v1);
  if (a.length !== b.length) return false;
  // 5 minute tolerance
  if (Math.abs(Date.now() / 1000 - Number(parts.t)) > 300) return false;
  return crypto.timingSafeEqual(a, b);
}

module.exports = { createCheckoutSession, verifyWebhookSignature };
