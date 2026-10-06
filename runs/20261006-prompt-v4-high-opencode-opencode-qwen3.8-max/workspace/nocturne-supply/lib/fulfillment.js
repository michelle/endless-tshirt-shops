// Turns a paid order into a Prodigi print order.
// The rendered 4000px PNG master is cached under artwork/ and served publicly so
// Prodigi can pull it (assets must be reachable from their fulfilment network).
const fs = require('fs');
const path = require('path');
const { buildSVG, renderPNG } = require('./design');
const prodigi = require('./prodigi');
const orders = require('./orders');
const { PRODUCT, PRICING } = require('./catalog-config');

const ARTWORK_DIR = path.join(__dirname, '..', 'artwork');
fs.mkdirSync(ARTWORK_DIR, { recursive: true });

function publicBase() {
  return (process.env.PUBLIC_URL || '').replace(/\/+$/, '');
}

/** Render (or reuse) the print master PNG and return its public URL. */
function artworkFor(order) {
  const file = path.join(ARTWORK_DIR, `${order.id}.png`);
  if (!fs.existsSync(file)) {
    const spec = {
      utcDate: new Date(order.design.utcISO),
      lat: order.design.lat,
      lon: order.design.lon,
      headline: order.design.headline,
      dedication: order.design.dedication || null,
      subline: order.design.subline,
      coordsLine: order.design.coordsLine,
      shirtColor: order.items[0].color, // palette follows the first line's garment color
    };
    const svg = buildSVG(spec, { size: 4000, mwStep: 1 });
    const png = renderPNG(svg, 4000);
    fs.writeFileSync(file, png);
  }
  return `${publicBase()}/artwork/${order.id}.png`;
}

function buildPayload(order, assetUrl) {
  const a = order.shipping.address;
  return {
    merchantReference: order.id,
    idempotencyKey: `nocturne-${order.id}-v1`,
    shippingMethod: order.shipping.method,
    recipient: {
      name: order.shipping.name,
      email: order.shipping.email || undefined,
      phoneNumber: order.shipping.phone || undefined,
      address: {
        line1: a.line1,
        line2: a.line2 || undefined,
        townOrCity: a.city,
        stateOrCounty: a.state || undefined,
        postalOrZipCode: a.postal,
        countryCode: a.country,
      },
    },
    items: order.items.map((it, i) => ({
      merchantReference: `${order.id}-line${i + 1}`,
      sku: PRODUCT.sku,
      copies: it.qty,
      sizing: 'fitPrintArea',
      attributes: { color: it.color, size: it.size },
      recipientCost: {
        amount: ((PRICING.shirtUnit / 100) * it.qty).toFixed(2),
        currency: 'USD',
      },
      assets: [{ printArea: PRODUCT.printArea, url: assetUrl }],
    })),
    metadata: {
      store: 'nocturne-supply',
      moment: order.design.subline,
      location: order.design.coordsLine,
    },
  };
}

/**
 * Fulfill a paid order: render the master, POST to Prodigi once (idempotency
 * key guards retries). Returns the stored order.
 */
async function fulfill(order) {
  if (order.status !== 'paid') throw new Error(`cannot fulfill order in status ${order.status}`);
  orders.appendHistory(order, 'fulfillment_started');
  try {
    const assetUrl = artworkFor(order);
    const payload = buildPayload(order, assetUrl);
    const { status, json } = await prodigi.createOrder(payload);
    const outcome = json?.outcome;
    const ok = status === 200 && ['Created', 'onHold', 'CreatedWithIssues', 'alreadyExists'].includes(outcome);
    if (!ok) {
      throw new Error(`Prodigi returned ${status} ${outcome}: ${JSON.stringify(json).slice(0, 400)}`);
    }
    order.prodigi = {
      orderId: json.order?.id ?? null,
      outcome,
      submittedAt: new Date().toISOString(),
      assetUrl,
    };
    order.status = 'fulfilled';
    orders.appendHistory(order, 'fulfilled', { prodigiOrderId: order.prodigi.orderId });
  } catch (err) {
    order.status = 'fulfillment_failed';
    orders.appendHistory(order, 'fulfillment_failed', String(err.message));
  }
  return orders.save(order);
}

/** Poll Prodigi for production/shipping status of a fulfilled order. */
async function prodigiStatus(order) {
  if (!order.prodigi?.orderId) return null;
  const { status, json } = await prodigi.getOrder(order.prodigi.orderId);
  if (status !== 200 || !json?.order) return null;
  const o = json.order;
  return {
    stage: o.status?.stage,
    details: o.status?.details,
    issues: o.status?.issues ?? [],
    shipments: (o.shipments ?? []).map((s) => ({
      status: s.status,
      carrier: s.carrier?.name,
      service: s.carrier?.service,
      tracking: s.tracking?.number ? { number: s.tracking.number, url: s.tracking.url } : null,
      dispatched: s.dispatchDate ?? null,
      from: s.fulfillmentLocation?.countryCode ?? null,
    })),
  };
}

module.exports = { fulfill, prodigiStatus, artworkFor };
