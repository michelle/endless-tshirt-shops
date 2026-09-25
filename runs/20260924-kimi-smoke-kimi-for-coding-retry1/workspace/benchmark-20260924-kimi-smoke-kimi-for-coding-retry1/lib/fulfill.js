// Fulfillment: renders the print artwork URL(s) and submits the order to Prodigi.
// This MUST only be called after payment has succeeded (Stripe webhook
// `checkout.session.completed`, verified by signature, or the explicit
// sandbox-pay path when Stripe keys are not configured).

import crypto from 'crypto';
import { signPayload } from './artworkSig.js';
import { createOrder } from './prodigi.js';
import { normalizeDesign } from './scene.js';
import { priceOrder } from './pricing.js';

export const SKU = 'GLOBAL-TEE-BC-3001'; // Bella+Canvas 3001, DTG

export function siteUrl() {
  return (
    process.env.SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3100')
  ).replace(/\/$/, '');
}

export function newOrderRef() {
  return `sw-${crypto.randomBytes(6).toString('hex')}`;
}

export function artworkUrlFor(design, { full = true } = {}) {
  const token = signPayload({ d: design, f: full ? 1 : 0 });
  return `${siteUrl()}/api/artwork/${token}.png`;
}

function callbackUrl() {
  const seg = process.env.PRODIGI_CALLBACK_SECRET || 'unset';
  return `${siteUrl()}/api/prodigi-callback/${seg}`;
}

// cartItems: [{design}] (design.qty = copies of that design)
// shipping:   {name, email, line1, line2, city, state, zip, country}
export async function fulfillOrder({ orderRef, cartItems, shipping }) {
  const items = cartItems.map(({ design }) => {
    const d = normalizeDesign(design);
    return {
      d,
      payload: {
        sku: SKU,
        copies: d.qty,
        sizing: 'fillPrintArea',
        attributes: { color: d.color, size: d.size },
        assets: [{ printArea: 'front', url: artworkUrlFor(d, { full: true }) }],
      },
    };
  });

  const totals = priceOrder(items.map((i) => ({ qty: i.d.qty })));

  const payload = {
    merchantReference: orderRef,
    idempotencyKey: orderRef, // replays are deduplicated by Prodigi
    shippingMethod: 'Standard',
    callbackUrl: callbackUrl(),
    recipient: {
      name: shipping.name,
      email: shipping.email || undefined,
      address: {
        line1: shipping.line1,
        line2: shipping.line2 || undefined,
        townOrCity: shipping.city,
        stateOrCounty: shipping.state || undefined,
        postalOrZipCode: shipping.zip,
        countryCode: (shipping.country || 'US').toUpperCase(),
      },
    },
    items: items.map((i) => i.payload),
    metadata: {
      orderRef,
      designs: JSON.stringify(items.map((i) => i.d)),
      customerEmail: shipping.email || '',
    },
  };
  // recipientCost only makes sense per item; attach order total on first item.
  payload.items[0].recipientCost = {
    amount: (totals.totalCents / 100).toFixed(2),
    currency: 'USD',
  };

  const result = await createOrder(payload);
  return { prodigiOrderId: result.order?.id || null, outcome: result.outcome, result };
}
