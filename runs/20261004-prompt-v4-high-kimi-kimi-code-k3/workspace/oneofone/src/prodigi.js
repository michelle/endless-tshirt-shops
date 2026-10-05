'use strict';

const API_BASE = process.env.PRODIGI_API_BASE || 'https://api.sandbox.prodigi.com';
const API_KEY = process.env.PRODIGI_API_KEY;

async function call(method, path, body) {
  const res = await fetch(API_BASE + path, {
    method,
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Prodigi ${method} ${path} -> HTTP ${res.status}: ${text.slice(0, 300)}`);
  }
  if (!res.ok) {
    const err = new Error(`Prodigi ${method} ${path} -> HTTP ${res.status}: ${JSON.stringify(json).slice(0, 500)}`);
    err.status = res.status;
    err.body = json;
    throw err;
  }
  return json;
}

function createOrder({ merchantReference, idempotencyKey, callbackUrl, recipient, sku, attributes, imageUrl }) {
  return call('POST', '/v4.0/orders', {
    merchantReference,
    idempotencyKey,
    shippingMethod: 'Budget',
    callbackUrl,
    recipient: {
      name: recipient.name,
      email: recipient.email,
      address: {
        line1: recipient.line1,
        ...(recipient.line2 ? { line2: recipient.line2 } : {}),
        postalOrZipCode: recipient.postalOrZipCode,
        countryCode: recipient.countryCode,
        townOrCity: recipient.townOrCity,
        ...(recipient.stateOrCounty ? { stateOrCounty: recipient.stateOrCounty } : {}),
      },
    },
    items: [
      {
        merchantReference: `${merchantReference}-1`,
        sku,
        copies: 1,
        sizing: 'fillPrintArea',
        attributes,
        assets: [{ printArea: 'front', url: imageUrl }],
      },
    ],
  });
}

function getOrder(id) {
  return call('GET', `/v4.0/orders/${id}`);
}

module.exports = { createOrder, getOrder };
