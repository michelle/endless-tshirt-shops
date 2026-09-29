// Turn a paid Stripe Checkout Session into a Prodigi print order.
// Safe to call repeatedly: Prodigi's idempotencyKey dedupes by session id.
import { createOrder } from './prodigi';
import { encodeDesign, metadataToDesign } from './params';
import { PRODUCT } from './design';

export function artworkUrlFor(baseUrl, design) {
  return `${baseUrl}/api/artwork?${encodeDesign(design)}`;
}

export async function fulfillSession(session, baseUrl) {
  if (!session || session.object !== 'checkout.session') {
    throw new Error('not a checkout session');
  }
  if (session.payment_status !== 'paid') {
    return { fulfilled: false, reason: `payment_status=${session.payment_status}` };
  }
  const md = session.metadata || {};
  const design = metadataToDesign(md);
  if (!design) throw new Error('session metadata is missing the design');

  const totalDollars = ((session.amount_total || 0) / 100).toFixed(2);
  const order = {
    merchantReference: session.id,
    idempotencyKey: session.id,
    shippingMethod: 'Standard',
    callbackUrl: `${baseUrl}/api/prodigi/callback`,
    recipient: {
      name: md.ship_name || 'Customer',
      email: session.customer_email || md.email || undefined,
      address: {
        line1: md.ship_line1,
        line2: md.ship_line2 || undefined,
        postalOrZipCode: md.ship_zip,
        countryCode: md.ship_country,
        townOrCity: md.ship_city,
        stateOrCounty: md.ship_state || undefined,
      },
    },
    items: [
      {
        merchantReference: `${session.id}:front`,
        sku: PRODUCT.sku,
        copies: 1,
        sizing: 'fitPrintArea',
        attributes: { color: md.color, size: (md.size || '').toLowerCase() },
        recipientCost: { amount: totalDollars, currency: (session.currency || 'usd').toUpperCase() },
        assets: [{ printArea: 'front', url: artworkUrlFor(baseUrl, design) }],
      },
    ],
    metadata: { source: 'celestee', stripeSessionId: session.id },
  };

  const res = await createOrder(order);
  const o = res.order || {};
  return {
    fulfilled: true,
    outcome: res.outcome,
    prodigiOrderId: o.id,
    stage: o.status?.stage || null,
    issues: o.status?.issues || [],
    charges: (o.charges || []).map((c) => ({
      type: c.chargeType,
      amount: c.totalCost?.amount,
      currency: c.totalCost?.currency,
    })),
  };
}
