'use strict';

// BTCPay Server (Greenfield API) driver — crypto checkout, used here against
// the public testnet demo instance. Kept as a fully-working alternative driver.
const crypto = require('crypto');

async function call(cfg, method, path, body) {
  const res = await fetch(cfg.baseUrl + path, {
    method,
    headers: {
      Authorization: `token ${cfg.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`BTCPay ${method} ${path} -> HTTP ${res.status}: ${JSON.stringify(json).slice(0, 300)}`);
  return json;
}

function createInvoice(cfg, order, amountUsd, urls) {
  return call(cfg, 'POST', `/api/v1/stores/${cfg.storeId}/invoices`, {
    amount: amountUsd.toFixed(2),
    currency: 'USD',
    metadata: { orderId: order.id, itemDesc: `ONEOFONE tee "${order.word}" ed. ${order.edition}` },
    checkout: {
      redirectURL: urls.successUrl,
      redirectAutomatically: true,
    },
  });
}

function getInvoice(cfg, invoiceId) {
  return call(cfg, 'GET', `/api/v1/stores/${cfg.storeId}/invoices/${invoiceId}`);
}

function verifyWebhookSignature(secret, payload, sigHeader) {
  // header format: sha256=<hex hmac>
  const m = String(sigHeader || '').match(/sha256=([a-f0-9]+)/i);
  if (!m) return false;
  const expected = crypto.createHmac('sha256', secret).update(payload, 'utf8').digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(m[1].toLowerCase());
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

module.exports = { createInvoice, getInvoice, verifyWebhookSignature };
