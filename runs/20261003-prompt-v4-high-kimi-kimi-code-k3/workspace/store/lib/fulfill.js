const { createOrder } = require('./prodigi');
const { designUrl } = require('./params');
const { orders } = require('./store');

const SKU = 'GLOBAL-TEE-GIL-64000';

// Create the Prodigi order for a paid Stripe session. Idempotent via
// Prodigi idempotencyKey = Stripe session id.
async function fulfill(session, base) {
  const m = session.metadata || {};
  const ship = session.shipping_details || {};
  const addr = ship.address || {};
  const designParams = {
    when: m.when, lat: m.lat, lon: m.lon, place: m.place, caption: m.caption,
  };
  const imageUrl = designUrl(base, designParams);

  // Prodigi rejects empty-string address fields — omit them instead
  const address = {
    line1: addr.line1 || '',
    postalOrZipCode: addr.postal_code || '',
    countryCode: addr.country || '',
    townOrCity: addr.city || '',
  };
  if (addr.line2) address.line2 = addr.line2;
  if (addr.state) address.stateOrCounty = addr.state;

  const { status, json } = await createOrder({
    merchantReference: session.id,
    shippingMethod: 'Standard',
    recipient: {
      name: ship.name || session.customer_details?.name || 'Customer',
      email: session.customer_details?.email,
      phoneNumber: session.customer_details?.phone || undefined,
      address,
    },
    items: [{
      merchantReference: `${session.id}-1`,
      sku: SKU,
      copies: 1,
      sizing: 'fitPrintArea',
      attributes: { color: m.color, size: m.size },
      assets: [{ printArea: 'front', url: imageUrl }],
    }],
  });

  if (status >= 200 && status < 300 && (json.outcome === 'Created' || json.order)) {
    orders.set(session.id, {
      status: 'sent_to_print',
      prodigiOrderId: json.order?.id,
      prodigiOutcome: json.outcome,
      design: designParams,
      at: new Date().toISOString(),
    });
  } else {
    orders.set(session.id, {
      status: 'fulfillment_error',
      error: `prodigi ${status}: ${JSON.stringify(json).slice(0, 400)}`,
      design: designParams,
      at: new Date().toISOString(),
    });
  }
  return orders.get(session.id);
}

module.exports = { fulfill };
