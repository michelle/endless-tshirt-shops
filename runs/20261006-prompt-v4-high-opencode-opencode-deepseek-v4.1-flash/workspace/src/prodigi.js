// Prodigi Print API client (sandbox by default).
// We only ever call createOrder() after Stripe confirms the payment.

import { CONFIG } from './config.js';
import { GARMENTS } from './brand.js';

function headers() {
  return {
    'X-API-Key': CONFIG.prodigiApiKey,
    'Content-Type': 'application/json',
  };
}

export function buildRecipient(session) {
  const details = session.customer_details || {};
  const shipping = session.shipping_details || session.collected_information?.shipping_details || null;
  const addr = (shipping && shipping.address) || details.address || {};
  const name = (shipping && shipping.name) || details.name || 'Echoform Customer';
  const parts = [addr.line1, addr.line2].filter(Boolean);
  return {
    name,
    email: details.email || session.customer_email || null,
    phoneNumber: details.phone || null,
    address: {
      line1: parts.join(', ') || addr.line1 || '',
      line2: addr.line2 || null,
      townOrCity: addr.city || '',
      stateOrCounty: addr.state || null,
      postalOrZipCode: addr.postal_code || '',
      countryCode: (addr.country || 'US').toUpperCase(),
    },
  };
}

export async function createOrder({ design, recipient, printUrl, idempotencyKey, merchantReference, metadata }) {
  const garment = GARMENTS[design.garment] || GARMENTS.black;
  const body = {
    shippingMethod: CONFIG.shippingMethod,
    recipient,
    items: [
      {
        sku: CONFIG.sku,
        copies: 1,
        sizing: 'fitPrintArea',
        attributes: { size: design.size, color: garment.pro },
        assets: [{ printArea: 'front', url: printUrl }],
      },
    ],
    idempotencyKey,
    merchantReference,
    metadata: metadata || {},
  };

  const res = await fetch(`${CONFIG.prodigiBase}/orders`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  if (!res.ok || !json.order || !json.order.id) {
    const err = new Error(`Prodigi order failed (${res.status}): ${JSON.stringify(json).slice(0, 500)}`);
    err.prodigi = json;
    err.status = res.status;
    err.outcome = json.outcome;
    throw err;
  }
  return json.order;
}

// Look up an order by the idempotency key we submitted (used to recover from
// Prodigi's transient 409 "already being processed" responses).
export async function findOrderByIdempotencyKey(key) {
  for (let skip = 0; skip <= 100; skip += 50) {
    const res = await fetch(`${CONFIG.prodigiBase}/orders?Top=50&Skip=${skip}`, { headers: headers() });
    if (!res.ok) return null;
    const json = await res.json();
    const found = (json.orders || []).find((o) => o.idempotencyKey === key);
    if (found) return found;
    if (!json.hasMore) break;
  }
  return null;
}

export async function getOrder(id) {
  const res = await fetch(`${CONFIG.prodigiBase}/orders/${encodeURIComponent(id)}`, {
    headers: headers(),
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json.order || null;
}

export async function getProduct(sku) {
  const res = await fetch(`${CONFIG.prodigiBase}/products/${encodeURIComponent(sku)}`, {
    headers: headers(),
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json.product || null;
}
