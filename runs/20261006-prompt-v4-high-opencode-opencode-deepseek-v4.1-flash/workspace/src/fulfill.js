// Payment-gated fulfillment: Stripe session -> Prodigi order.
// Idempotent by Stripe session id, so the success redirect and the webhook can
// both call it without double-printing.

import { getOrder, upsertOrder } from './orders.js';
import { decodeToken, normalizeDesign, encodeToken } from './design.js';
import { buildRecipient, createOrder, findOrderByIdempotencyKey } from './prodigi.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// one in-flight fulfillment per Stripe session
const locks = new Map();

async function submitToProdigi({ id, design, recipient, printUrl, idempotencyKey }) {
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      return await createOrder({
        design,
        recipient,
        printUrl,
        idempotencyKey,
        merchantReference: `ECHO-${design.serial}`,
        metadata: { source: 'echoform', stripeSession: id, serial: design.serial },
      });
    } catch (err) {
      // Prodigi returns 409 while an earlier identical request is still being
      // processed. Look it up, and otherwise back off and retry.
      if (err.status === 409 || err.outcome === 'InProgress') {
        await sleep(1500 * attempt);
        const found = await findOrderByIdempotencyKey(idempotencyKey);
        if (found) return found;
        continue;
      }
      throw err;
    }
  }
  const found = await findOrderByIdempotencyKey(idempotencyKey);
  if (found) return found;
  throw new Error('Prodigi order did not complete after retries');
}

export async function fulfillFromSession(session, { publicBase }) {
  const id = session.id;
  const existing = getOrder(id);
  if (existing && existing.prodigiOrderId) return existing;

  if (locks.has(id)) return locks.get(id);
  const job = (async () => {
    try {
      if (session.payment_status !== 'paid' && session.status !== 'complete') {
        const design = decodeToken(session.metadata?.designToken) || null;
        return upsertOrder(id, {
          status: 'unpaid',
          paymentStatus: session.payment_status,
          email: session.customer_details?.email || null,
          amountTotal: session.amount_total,
          currency: session.currency,
          design,
        });
      }

      const fresh = getOrder(id);
      if (fresh && fresh.prodigiOrderId) return fresh;

      const design = decodeToken(session.metadata?.designToken) || normalizeDesign(session.metadata || {});
      const token = encodeToken(design);
      const printUrl = `${publicBase}/api/print.png?d=${encodeURIComponent(token)}`;
      const recipient = buildRecipient(session);

      upsertOrder(id, {
        status: 'submitting',
        paymentStatus: session.payment_status,
        email: session.customer_details?.email || null,
        amountTotal: session.amount_total,
        currency: session.currency,
        design,
        printUrl,
        recipient,
      });

      try {
        const order = await submitToProdigi({
          id,
          design,
          recipient,
          printUrl,
          idempotencyKey: `echoform-${id}`,
        });
        return upsertOrder(id, {
          status: 'submitted',
          prodigiOrderId: order.id,
          prodigiStatus: order.status?.stage || null,
          submittedAt: Date.now(),
          error: null,
        });
      } catch (err) {
        return upsertOrder(id, {
          status: 'error',
          error: String(err.message || err).slice(0, 800),
        });
      }
    } finally {
      locks.delete(id);
    }
  })();
  locks.set(id, job);
  return job;
}
