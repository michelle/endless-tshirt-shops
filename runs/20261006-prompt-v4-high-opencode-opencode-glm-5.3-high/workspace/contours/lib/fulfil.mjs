// Fulfilment: Stripe session → Prodigi order. Idempotent by construction:
//  - the local order record is keyed by Stripe session id
//  - the Prodigi order carries idempotencyKey = session id (duplicate-proof)
// Fulfilment only ever runs after Stripe reports payment_status === 'paid',
// and the session is re-fetched from Stripe each time (never trusted from the
// browser).

import crypto from 'node:crypto';
import { SKU, unitPriceCents, colorByKey, extentByKey, validateColorSize } from '../public/catalog.js';
import { getOrderByStripeSession, upsertOrder, getOrder } from './orders.mjs';
import { mintSignedParams } from './signedurl.mjs';

function designPayloadFromMetadata(meta) {
  if (!meta) return null;
  let d;
  try { d = typeof meta.design === 'string' ? JSON.parse(meta.design) : null; } catch { return null; }
  if (!d) return null;
  const design = {
    title: d.t, place: d.p,
    lat: Number(d.la), lng: Number(d.lo),
    extentKey: d.e,
    extentKm: extentByKey(d.e)?.km,
    colorKey: d.ck, sizeKey: d.sz,
    qty: Number(d.q) || 1,
    shippingMethod: d.sm || 'budget',
  };
  if (!Number.isFinite(design.lat) || !Number.isFinite(design.lng)) return null;
  if (!design.extentKm || !design.extentKey) return null;
  if (!colorByKey(design.colorKey)) return null;
  if (!validateColorSize(design.colorKey, design.sizeKey)) return null;
  design.qty = Math.min(Math.max(design.qty, 1), 10);
  return design;
}

function orderIdFromSession(sessionId) {
  return 'ctx-' + crypto.createHash('sha1').update(sessionId).digest('hex').slice(0, 10);
}

function recipientFromSession(session) {
  const ci = session.collected_information || {};
  const s =
    ci.shipping_details || ci.shipping ||
    session.shipping_details || session.shipping || {};
  const a = s.address || {};
  if (!a.line1 || !a.city || !a.country || !(a.postal_code || a.postalOrZipCode)) return null;
  const r = {
    name: s.name || 'Customer',
    address: {
      line1: a.line1,
      line2: a.line2 || undefined,
      townOrCity: a.city,
      stateOrCounty: a.state || undefined,
      postalOrZipCode: a.postal_code || a.postalOrZipCode,
      countryCode: a.country,
    },
  };
  const email = session.customer_details?.email || session.collected_information?.email;
  const phone = s.phone || session.customer_details?.phone;
  if (email) r.email = email;
  if (phone) r.phoneNumber = phone;
  return r;
}

export function createOrderRecordFromSession(session) {
  const design = designPayloadFromMetadata(session.metadata);
  if (!design) throw new Error('order metadata incomplete/invalid');
  const id = orderIdFromSession(session.id);
  const existing = getOrder(id);
  const record = existing || {
    id,
    createdAt: new Date().toISOString(),
  };
  record.sessionId = session.id;
  record.design = design;
  record.unitPriceCents = unitPriceCents(design.sizeKey) * design.qty;
  record.amountTotalCents = session.amount_total;
  record.currency = session.currency || 'usd';
  record.prodigiOrderId = record.prodigiOrderId || null;
  record.paymentStatus = session.payment_status;
  record.customerEmail = session.customer_details?.email || null;
  record.lastUpdate = new Date().toISOString();
  return record;
}

// Called from the success page, the webhook, or the status poll.
// baseUrl: absolute origin for asset URLs (e.g. https://…trycloudflare.com)
export async function fulfilFromSession({ stripe, prodigi, config, sessionId, baseUrl }) {
  const session = await stripe.getCheckoutSession(sessionId);
  const record = createOrderRecordFromSession(session);

  if (session.payment_status !== 'paid') {
    record.paymentStatus = session.payment_status || 'unpaid';
    record.status = 'awaiting_payment';
    upsertOrder(record);
    return { record, fulfilled: false, reason: `payment_status=${session.payment_status}` };
  }
  record.paymentStatus = 'paid';

  // already fulfilled?
  if (record.prodigiOrderId) {
    record.status = 'fulfilled';
    upsertOrder(record);
    return { record, fulfilled: true };
  }
  // don't hammer retries after a hard failure in the last 90 s
  if (record.status === 'fulfil_error' && record.lastAttemptAt &&
      Date.now() - Date.parse(record.lastAttemptAt) < 90_000) {
    return { record, fulfilled: false, reason: 'recently failed; backing off' };
  }

  const design = record.design;
  const color = colorByKey(design.colorKey);
  const recipient = recipientFromSession(session);
  if (!recipient) {
    record.status = 'fulfil_error';
    record.error = 'shipping address incomplete in Stripe session';
    record.lastAttemptAt = new Date().toISOString();
    upsertOrder(record);
    return { record, fulfilled: false, reason: record.error };
  }

  const { d, sig } = mintSignedParams(
    { t: design.title, p: design.place, la: design.lat, lo: design.lng, e: design.extentKey, ck: design.colorKey, sz: design.sizeKey, q: design.qty },
    config.printSigningSecret
  );
  const printUrl = `${baseUrl}/api/print.png?d=${d}&sig=${sig}`;
  const previewUrl = `${baseUrl}/api/preview.png?d=${d}&sig=${sig}`;

  const methodMap = { budget: 'Budget', standard: 'Standard' };

  try {
    const res = await prodigi.createOrder({
      merchantReference: record.id,
      idempotencyKey: session.id,
      shippingMethod: methodMap[design.shippingMethod] || 'Standard',
      recipient,
      items: [
        {
          merchantReference: record.id,
          sku: SKU,
          copies: design.qty,
          sizing: 'fillPrintArea',
          attributes: { size: design.sizeKey, color: color.prodigi },
          assets: [{ printArea: 'front', url: printUrl }],
          recipientCost: { amount: (record.amountTotalCents / 100).toFixed(2), currency: record.currency || 'usd' },
        },
      ],
      metadata: { sessionId: session.id, orderId: record.id, preview: previewUrl },
    });
    record.prodigiOrderId = res.order?.id || null;
    record.prodigiOutcome = res.outcome || null;
    record.status = record.prodigiOrderId ? 'fulfilled' : 'fulfil_error';
    if (!record.prodigiOrderId) record.error = 'Prodigi returned no order id';
    record.printUrl = printUrl;
    record.lastAttemptAt = new Date().toISOString();
    upsertOrder(record);
    return { record, fulfilled: !!record.prodigiOrderId };
  } catch (e) {
    record.status = 'fulfil_error';
    record.error = String(e.message || e).slice(0, 500);
    record.lastAttemptAt = new Date().toISOString();
    upsertOrder(record);
    return { record, fulfilled: false, reason: record.error };
  }
}

export async function prodigiStatus(prodigi, prodigiOrderId) {
  try {
    const res = await prodigi.getOrder(prodigiOrderId);
    const o = res.order;
    const shipment = o?.shipments?.[0];
    return {
      id: o?.id,
      stage: o?.status?.stage,
      details: o?.status?.details,
      tracking: shipment?.tracking ? { number: shipment.tracking.number, url: shipment.tracking.url, carrier: shipment.carrier?.name } : null,
      issues: o?.status?.issues || [],
    };
  } catch (e) {
    return { id: prodigiOrderId, error: String(e.message || e) };
  }
}

export { designPayloadFromMetadata };
