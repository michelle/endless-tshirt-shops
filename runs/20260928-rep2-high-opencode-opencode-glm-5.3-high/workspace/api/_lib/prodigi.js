// Prodigi Print API v4 client. Orders are the only write we make, and they
// always carry an idempotency key, so a retried or concurrently raced
// fulfillment collapses into a single physical order.

import { PRODIGI_SKU, PRODIGI_SIZING, findColor, findSize } from './config.js';

const SANDBOX = 'https://api.sandbox.prodigi.com';
const LIVE = 'https://api.prodigi.com';

function baseUrl() {
  if (process.env.PRODIGI_API_BASE) return process.env.PRODIGI_API_BASE.replace(/\/$/, '');
  const key = process.env.PRODIGI_API_KEY || '';
  return key.startsWith('test_') ? SANDBOX : LIVE;
}

async function prodigiRequest(method, path, body) {
  const headers = { 'X-API-Key': process.env.PRODIGI_API_KEY || '' };
  if (body !== undefined) headers['content-type'] = 'application/json';
  const response = await fetch(`${baseUrl()}/v4.0${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data };
}

// Creates the print order; throws nothing, reports instead.
export function createProdigiOrder(order) {
  return prodigiRequest('POST', '/orders', order);
}

export function getProdigiOrder(id) {
  return prodigiRequest('GET', `/orders/${encodeURIComponent(id)}`);
}

export function listProdigiOrders({ merchantReference, top = 20 } = {}) {
  const query = merchantReference
    ? `?merchantReferences=${encodeURIComponent(merchantReference)}&top=${top}`
    : `?top=${top}`;
  return prodigiRequest('GET', `/orders${query}`);
}

// The order body for one star-map tee order, from Stripe metadata.
export function prodigiOrderBody({ design, garment, address, print }, { merchantReference, idempotencyKey, orderKey }) {
  const color = findColor(garment.c || garment.color);
  const size = findSize(garment.s || garment.size);
  const quantity = Number(garment.q || garment.quantity) || 1;
  return {
    merchantReference,
    idempotencyKey,
    shippingMethod: 'Standard',
    recipient: {
      name: address.name,
      email: address.email || undefined,
      address: {
        line1: address.line1,
        line2: address.line2 || undefined,
        townOrCity: address.city,
        stateOrCounty: address.state || undefined,
        postalOrZipCode: address.zip,
        countryCode: address.country,
      },
    },
    items: [
      {
        merchantReference: orderKey,
        sku: PRODIGI_SKU,
        copies: quantity,
        sizing: PRODIGI_SIZING,
        attributes: {
          color: color.prodigi,
          size: size.id,
        },
        recipientCost: {
          amount: (size.cents / 100).toFixed(2),
          currency: 'USD',
        },
        assets: [
          {
            printArea: 'front',
            url: print,
          },
        ],
      },
    ],
    metadata: {
      designTitle: design.ti || design.title,
      designPlace: design.pl || design.placeLabel,
      designMoment: design.t || design.wallISO,
    },
  };
}
