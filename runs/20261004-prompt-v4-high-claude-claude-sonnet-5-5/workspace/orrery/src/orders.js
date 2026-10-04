import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { PRODUCT } from './catalog.js';
import { buildPrintSvg } from './design.js';
import { renderPng } from './render.js';
import { setPngDpi } from './png.js';

const MAX_AUTO_ATTEMPTS = 8;
const PAID_STATES = ['paid', 'submitting', 'submitted', 'fulfillment_failed'];

const hydrate = (row) =>
  row && {
    id: row.id,
    token: row.token,
    status: row.status,
    createdAt: row.created_at,
    email: row.email,
    recipient: JSON.parse(row.recipient_json),
    items: JSON.parse(row.items_json),
    currency: row.currency,
    subtotalCents: row.subtotal_cents,
    shippingCents: row.shipping_cents,
    totalCents: row.total_cents,
    paymentProvider: row.payment_provider,
    paymentRef: row.payment_ref,
    paidAt: row.paid_at,
    prodigiOrderId: row.prodigi_order_id,
    fulfillAttempts: row.fulfill_attempts,
    nextAttemptAt: row.next_attempt_at,
    lastError: row.last_error,
  };

export function createOrderService({ db, config, prodigi, payments, log = console }) {
  const now = () => Date.now();
  const get = (id) => hydrate(db.prepare('SELECT * FROM orders WHERE id = ?').get(id));

  function create({ items, recipient, email, shippingCents }) {
    const id = `ORR-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
    const token = crypto.randomBytes(16).toString('hex');
    const priced = items.map((i) => ({ ...i, unitCents: PRODUCT.priceCents }));
    const subtotal = priced.reduce((s, i) => s + i.unitCents * i.qty, 0);
    db.prepare(
      `INSERT INTO orders (id, token, status, created_at, updated_at, email, recipient_json, items_json, currency,
        subtotal_cents, shipping_cents, total_cents, payment_provider)
       VALUES (?, ?, 'pending_payment', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(id, token, now(), now(), email, JSON.stringify(recipient), JSON.stringify(priced), PRODUCT.currency,
      subtotal, shippingCents, subtotal + shippingCents, payments.name);
    return get(id);
  }

  function setPaymentRef(id, ref) {
    db.prepare('UPDATE orders SET payment_ref = ?, updated_at = ? WHERE id = ?').run(ref, now(), id);
  }

  function discard(id, status = 'canceled') {
    db.prepare("UPDATE orders SET status = ?, updated_at = ? WHERE id = ? AND status = 'pending_payment'").run(status, now(), id);
  }

  // The only path that moves an order to "paid". Verifies the payment really covers this order.
  function markPaid(orderId, { ref, amountCents, currency }) {
    const order = get(orderId);
    if (!order) throw new Error(`markPaid: unknown order ${orderId}`);
    if (PAID_STATES.includes(order.status)) return { order, changed: false };
    if (order.paymentRef && ref && order.paymentRef !== ref) throw new Error(`markPaid: payment ref mismatch for ${orderId}`);
    if (amountCents !== order.totalCents || String(currency).toLowerCase() !== order.currency) {
      throw new Error(`markPaid: amount mismatch for ${orderId}: got ${amountCents} ${currency}, expected ${order.totalCents} ${order.currency}`);
    }
    const res = db
      .prepare(
        `UPDATE orders SET status = 'paid', paid_at = ?, updated_at = ?, next_attempt_at = ?, payment_ref = COALESCE(payment_ref, ?)
         WHERE id = ? AND status IN ('pending_payment', 'payment_failed', 'expired', 'canceled')`,
      )
      .run(now(), now(), now(), ref ?? null, orderId);
    return { order: get(orderId), changed: res.changes === 1 };
  }

  function markPaymentFailed(orderId, status = 'payment_failed') {
    db.prepare("UPDATE orders SET status = ?, updated_at = ? WHERE id = ? AND status = 'pending_payment'").run(status, now(), orderId);
  }

  const printDir = path.join(config.dataDir === ':memory:' ? '/tmp' : config.dataDir, 'prints');
  const inflight = new Map();

  // Full-resolution transparent PNG for one line item; cached on disk, generated only for paid orders.
  async function printFile(order, idx) {
    if (!PAID_STATES.includes(order.status)) throw new Error('Order is not paid');
    const file = path.join(printDir, `${order.id}-${idx + 1}.png`);
    if (fs.existsSync(file)) return file;
    if (!inflight.has(file)) {
      inflight.set(
        file,
        (async () => {
          fs.mkdirSync(printDir, { recursive: true });
          const png = setPngDpi(renderPng(buildPrintSvg(order.items[idx]), PRODUCT.printWidth), 300);
          const tmp = `${file}.${process.pid}.tmp`;
          fs.writeFileSync(tmp, png);
          fs.renameSync(tmp, file);
          return file;
        })().finally(() => inflight.delete(file)),
      );
    }
    return inflight.get(file);
  }

  const assetUrl = (order, idx) => `${config.baseUrl}/print/${order.id}/${idx + 1}.png?t=${order.token}`;

  async function fulfill(orderId) {
    const claim = db
      .prepare("UPDATE orders SET status = 'submitting', fulfill_attempts = fulfill_attempts + 1, updated_at = ? WHERE id = ? AND status = 'paid'")
      .run(now(), orderId);
    if (claim.changes !== 1) return get(orderId);
    const order = get(orderId);
    try {
      for (let i = 0; i < order.items.length; i++) await printFile(order, i);
      let prodigiOrder = order.fulfillAttempts > 1 ? await prodigi.findByMerchantReference(order.id) : null;
      if (!prodigiOrder) {
        const res = await prodigi.createOrder(order, (idx) => assetUrl(order, idx));
        prodigiOrder = res.order;
        if (!prodigiOrder?.id) {
          const err = new Error(`Prodigi did not create the order: ${JSON.stringify(res).slice(0, 500)}`);
          err.retryable = false;
          throw err;
        }
      }
      db.prepare("UPDATE orders SET status = 'submitted', prodigi_order_id = ?, last_error = NULL, updated_at = ? WHERE id = ?").run(
        prodigiOrder.id, now(), order.id);
      log.info?.(`[fulfill] ${order.id} -> Prodigi ${prodigiOrder.id}`);
    } catch (e) {
      const retryable = e.retryable !== false && order.fulfillAttempts < MAX_AUTO_ATTEMPTS;
      const delay = Math.min(30e3 * 2 ** order.fulfillAttempts, 3600e3);
      db.prepare('UPDATE orders SET status = ?, next_attempt_at = ?, last_error = ?, updated_at = ? WHERE id = ?').run(
        retryable ? 'paid' : 'fulfillment_failed', now() + delay, String(e.message).slice(0, 1500), now(), order.id);
      log.error?.(`[fulfill] ${order.id} attempt ${order.fulfillAttempts} failed (${retryable ? 'will retry' : 'needs attention'}): ${e.message}`);
    }
    return get(orderId);
  }

  async function reconcile() {
    // 1) retry fulfilment for paid orders that are due; recover orders stuck mid-submit by a crash
    db.prepare("UPDATE orders SET status = 'paid' WHERE status = 'submitting' AND updated_at < ?").run(now() - 5 * 60e3);
    const due = db.prepare("SELECT id FROM orders WHERE status = 'paid' AND COALESCE(next_attempt_at, 0) <= ?").all(now());
    for (const { id } of due) await fulfill(id);

    // 2) pending Stripe checkouts: confirm with Stripe in case a webhook was missed
    if (payments.retrieveSession) {
      const pending = db
        .prepare("SELECT id, payment_ref FROM orders WHERE status = 'pending_payment' AND payment_ref IS NOT NULL AND created_at < ? AND created_at > ?")
        .all(now() - 2 * 60e3, now() - 48 * 3600e3);
      for (const p of pending) {
        try {
          await syncPayment(p.id);
        } catch (e) {
          log.error?.(`[reconcile] ${p.id}: ${e.message}`);
        }
      }
    }
    db.prepare("UPDATE orders SET status = 'expired', updated_at = ? WHERE status = 'pending_payment' AND created_at < ?").run(now(), now() - 48 * 3600e3);
  }

  // Pulls the payment state from the provider and applies it. Returns the (possibly updated) order.
  async function syncPayment(orderId) {
    const order = get(orderId);
    if (!order || order.status !== 'pending_payment' || !payments.retrieveSession || !order.paymentRef) return order;
    const s = await payments.retrieveSession(order.paymentRef);
    if (s.paid) {
      const { changed } = markPaid(order.id, s);
      if (changed) fulfill(order.id).catch((e) => log.error?.(e));
    } else if (s.expired) markPaymentFailed(order.id, 'expired');
    return get(orderId);
  }

  const list = (limit = 200) => db.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT ?').all(limit).map(hydrate);

  function retryNow(orderId) {
    const r = db
      .prepare("UPDATE orders SET status = 'paid', next_attempt_at = 0, fulfill_attempts = 1, updated_at = ? WHERE id = ? AND status = 'fulfillment_failed'")
      .run(now(), orderId);
    return r.changes === 1;
  }

  return { get, create, setPaymentRef, discard, markPaid, markPaymentFailed, fulfill, reconcile, syncPayment, printFile, list, retryNow, PAID_STATES };
}
