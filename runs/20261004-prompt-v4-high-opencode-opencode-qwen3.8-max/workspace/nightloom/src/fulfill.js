'use strict';
/**
 * Fulfillment: render the print-ready artwork, publish it at a public URL and
 * submit the order to Prodigi. Runs ONLY after a payment succeeded.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('./config');
const store = require('./store');
const { renderDesign } = require('./design');
const prodigi = require('./prodigi');

const ART_DIR = path.join(config.ROOT, 'data', 'art');
fs.mkdirSync(ART_DIR, { recursive: true });

const inflight = new Map(); // orderId -> Promise (simple mutex)

function artPathFor(orderId) {
  return path.join(ART_DIR, `${orderId}.png`);
}

function renderPrintFile(order) {
  const buf = renderDesign(order.design, { width: config.prodigi.printWidth, quality: 'print' });
  const file = artPathFor(order.id);
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, buf);
  fs.renameSync(tmp, file);
  return { file, buf };
}

async function urlReachable(url) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 10000);
      const res = await fetch(url, { method: 'HEAD', signal: ctrl.signal });
      clearTimeout(t);
      if (res.ok) return true;
    } catch { /* retry */ }
    await new Promise(r => setTimeout(r, 700));
  }
  return false;
}

/**
 * Render + submit. Idempotent: safe to call repeatedly (webhook retries,
 * manual retry button). Never throws for expected failures; records them.
 */
async function fulfill(orderId) {
  if (inflight.has(orderId)) return inflight.get(orderId);
  const p = (async () => {
    const order = store.getOrder(orderId);
    if (!order) throw new Error(`Unknown order ${orderId}`);
    if (order.payment.status !== 'paid') throw new Error(`Order ${orderId} is not paid`);
    if (order.fulfillment.status === 'sent') return order;

    order.fulfillment.attempts = (order.fulfillment.attempts || 0) + 1;
    order.fulfillment.status = 'rendering';
    order.fulfillment.error = null;
    store.event(order, 'fulfillment.rendering');
    store.save();

    try {
      const { buf } = renderPrintFile(order);
      const md5 = crypto.createHash('md5').update(buf).digest('hex');
      const assetUrl = `${config.publicBase()}/art/${order.id}.png`;
      order.fulfillment.assetUrl = assetUrl;

      const reachable = await urlReachable(assetUrl);
      store.event(order, reachable ? 'asset.published' : 'asset.unreachable', { assetUrl });

      const res = await prodigi.createTeeOrder(order, assetUrl, md5);
      const outcome = res.json && res.json.outcome;
      const ok = res.status === 200 && ['Created', 'OnHold', 'AlreadyExists', 'CreatedWithIssues'].includes(outcome);
      if (!ok) {
        order.fulfillment.status = 'failed';
        order.fulfillment.error = `Prodigi ${res.status}: ${outcome || res.text.slice(0, 300)}`;
        store.event(order, 'fulfillment.failed', order.fulfillment.error);
        store.save();
        return order;
      }
      const pgOrder = res.json.order || {};
      order.fulfillment.status = 'sent';
      order.fulfillment.prodigiOrderId = pgOrder.id || null;
      order.fulfillment.outcome = outcome;
      order.fulfillment.sentAt = new Date().toISOString();
      order.fulfillment.issues = pgOrder.status && pgOrder.status.issues ? pgOrder.status.issues : [];
      order.fulfillment.assetReachable = reachable;
      store.event(order, 'fulfillment.sent', { prodigiOrderId: pgOrder.id, outcome });
      store.save();
      return order;
    } catch (err) {
      order.fulfillment.status = 'failed';
      order.fulfillment.error = String(err && err.message || err);
      store.event(order, 'fulfillment.failed', order.fulfillment.error);
      store.save();
      return order;
    }
  })();
  inflight.set(orderId, p);
  try { return await p; } finally { inflight.delete(orderId); }
}

/** Refresh + return Prodigi status snapshot for an order (best effort). */
async function refreshProdigiStatus(orderId) {
  const order = store.getOrder(orderId);
  if (!order || !order.fulfillment.prodigiOrderId) return null;
  const terminal = order.fulfillment.prodigiStage === 'Complete' || order.fulfillment.prodigiStage === 'Cancelled';
  if (terminal) return order.fulfillment.prodigiSnapshot || null;
  try {
    const res = await prodigi.getOrder(order.fulfillment.prodigiOrderId);
    if (res.status === 200 && res.json && res.json.order) {
      const o = res.json.order;
      order.fulfillment.prodigiStage = o.status && o.status.stage;
      order.fulfillment.prodigiSnapshot = {
        stage: o.status && o.status.stage,
        details: o.status && o.status.details,
        issues: o.status && o.status.issues,
        shipments: (o.shipments || []).map(sh => ({
          status: sh.status,
          carrier: sh.carrier,
          tracking: sh.tracking,
          dispatchDate: sh.dispatchDate,
          fulfillmentLocation: sh.fulfillmentLocation,
        })),
      };
      store.save();
      return order.fulfillment.prodigiSnapshot;
    }
  } catch { /* keep cached */ }
  return order.fulfillment.prodigiSnapshot || null;
}

module.exports = { fulfill, refreshProdigiStatus, renderPrintFile, artPathFor };
