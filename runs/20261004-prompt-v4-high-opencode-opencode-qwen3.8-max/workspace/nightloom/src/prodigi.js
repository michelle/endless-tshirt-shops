'use strict';
/**
 * Minimal Prodigi Print API v4 client.
 * Docs: https://www.prodigi.com/print-api/docs/reference/
 */
const config = require('./config');

const TIMEOUT_MS = 45000;

async function request(method, route, body) {
  if (!config.prodigi.apiKey) throw new Error('PRODIGI_API_KEY is not configured');
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${config.prodigi.baseUrl}${route}`, {
      method,
      headers: {
        'X-API-Key': config.prodigi.apiKey,
        'Content-Type': 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: ctrl.signal,
    });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* non-JSON */ }
    return { status: res.status, json, text };
  } finally {
    clearTimeout(t);
  }
}

/**
 * Submit a print order for one personalized tee.
 * @param {object} o our order record
 * @param {string} assetUrl publicly accessible PNG of the print-ready design
 * @param {string} md5Hash md5 hex of the PNG
 */
async function createTeeOrder(o, assetUrl, md5Hash) {
  const unit = (config.pricing.unitAmount / 100).toFixed(2);
  const qty = o.product.qty;
  const payload = {
    merchantReference: o.id,
    idempotencyKey: `nightloom-${o.id}`,
    shippingMethod: config.prodigi.shippingMethod,
    recipient: {
      name: o.customer.name,
      email: o.customer.email,
      phoneNumber: o.customer.phone || undefined,
      address: {
        line1: o.customer.line1,
        line2: o.customer.line2 || undefined,
        postalOrZipCode: o.customer.zip,
        countryCode: o.customer.country,
        townOrCity: o.customer.city,
        stateOrCounty: o.customer.state || undefined,
      },
    },
    items: [
      {
        merchantReference: `${o.id}-tee`,
        sku: config.prodigi.sku,
        copies: qty,
        sizing: config.prodigi.sizing,
        attributes: {
          color: o.product.color,
          size: o.product.size,
        },
        recipientCost: {
          amount: (unit * qty).toFixed(2),
          currency: 'USD',
        },
        assets: [
          {
            printArea: config.prodigi.printArea,
            url: assetUrl,
            md5Hash,
          },
        ],
      },
    ],
    metadata: {
      store: 'nightloom',
      designSummary: `${o.design.title || 'Untitled sky'} · ${o.design.date} ${o.design.time} · ${o.design.placeName} (${o.design.lat},${o.design.lon}) · ${o.design.palette}`,
    },
  };
  return request('POST', '/Orders', payload);
}

async function getOrder(prodigiOrderId) {
  return request('GET', `/Orders/${encodeURIComponent(prodigiOrderId)}`);
}

async function getProduct(sku) {
  return request('GET', `/products/${encodeURIComponent(sku || config.prodigi.sku)}`);
}

module.exports = { createTeeOrder, getOrder, getProduct };
