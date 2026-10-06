'use strict';
const config = require('./config');
const catalog = require('./catalog');
const { sign } = require('./sign');

async function call(method, path, body) {
  const res = await fetch(config.prodigi.baseUrl + path, {
    method,
    headers: { 'X-API-Key': config.prodigi.apiKey, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(25000),
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* non-JSON error body */ }
  return { status: res.status, json, text };
}

function printUrl(order, item) {
  const token = sign({ d: item.d, c: item.c });
  return `${order.origin}/print/${token}.png`;
}

function toProdigiOrder(order) {
  const r = order.recipient;
  return {
    merchantReference: order.id,
    idempotencyKey: `asterism-${order.id}`,
    shippingMethod: 'Standard',
    recipient: {
      name: r.name,
      email: r.email,
      phoneNumber: r.phone,
      address: {
        line1: r.line1,
        line2: r.line2 || null,
        postalOrZipCode: r.postal,
        countryCode: r.country,
        townOrCity: r.city,
        stateOrCounty: r.state || null,
      },
    },
    items: order.items.map((it, n) => ({
      merchantReference: `${order.id}-${n + 1}`,
      sku: catalog.SKU,
      copies: it.q,
      sizing: 'fillPrintArea',
      attributes: { color: it.c, size: it.s },
      recipientCost: { amount: (catalog.UNIT_PRICE_CENTS / 100).toFixed(2), currency: 'USD' },
      assets: [{ printArea: 'front', url: printUrl(order, it) }],
    })),
    metadata: { source: 'asterism', orderId: order.id },
  };
}

async function findByReference(ref) {
  const r = await call('GET', `/orders?merchantReferences=${encodeURIComponent(ref)}&top=1`);
  return r.json && r.json.orders && r.json.orders[0] ? r.json.orders[0] : null;
}

// Creates the print order. Safe to call repeatedly: the idempotency key stops duplicates.
async function submitOrder(order) {
  const existing = await findByReference(order.id);
  if (existing) return existing;
  const r = await call('POST', '/orders', toProdigiOrder(order));
  const outcome = r.json && r.json.outcome;
  if (r.status === 200 && r.json.order && ['Created', 'CreatedWithIssues', 'AlreadyExists'].includes(outcome)) return r.json.order;
  const dup = await findByReference(order.id);
  if (dup) return dup;
  throw new Error(`Prodigi rejected order ${order.id}: HTTP ${r.status} ${outcome || ''} ${r.text.slice(0, 400)}`);
}

module.exports = { submitOrder, findByReference, toProdigiOrder };
