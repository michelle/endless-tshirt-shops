import { config } from './config.js';
import { SHIRT_SKU, SHIRTS } from './design.js';

async function call(method, path, body) {
  const res = await fetch(`${config.prodigiBase}${path}`, {
    method,
    headers: { 'X-API-Key': config.prodigiKey, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

export async function findOrderByReference(merchantReference) {
  const { status, json } = await call('GET', `/orders?merchantReferences=${encodeURIComponent(merchantReference)}&top=1`);
  if (status !== 200) return null;
  return json.orders?.[0] || null;
}

// Create (idempotently) a Prodigi order for a PAID order. `ref` is our unique order reference.
export async function createPrintOrder({ ref, design, printUrl, recipient }) {
  const order = {
    merchantReference: ref,
    shippingMethod: 'Standard',
    idempotencyKey: ref,
    recipient: {
      name: recipient.name,
      email: recipient.email || undefined,
      phoneNumber: recipient.phone || undefined,
      address: {
        line1: recipient.address.line1,
        line2: recipient.address.line2 || undefined,
        postalOrZipCode: recipient.address.postalCode,
        countryCode: recipient.address.country,
        townOrCity: recipient.address.city,
        stateOrCounty: recipient.address.state || undefined,
      },
    },
    items: [
      {
        merchantReference: `${ref}-1`,
        sku: SHIRT_SKU,
        copies: 1,
        sizing: 'fitPrintArea',
        attributes: { color: SHIRTS[design.shirt].prodigi, size: design.size },
        assets: [{ printArea: 'front', url: printUrl }],
      },
    ],
  };
  const { status, json } = await call('POST', '/orders', order);
  if (status === 409) {
    // Already created for this reference (webhook retry, success-page refresh): return the existing order.
    const existing = await findOrderByReference(ref);
    if (existing) return { ok: true, duplicate: true, order: existing };
  }
  if (status >= 200 && status < 300 && json.order) return { ok: true, order: json.order, outcome: json.outcome };
  return { ok: false, status, error: json.outcome || 'Prodigi error', details: json };
}
