import type Stripe from 'stripe';

import { FULFILLMENT_META, toOrderRecord, type OrderRecord } from './orders';
import {
  ScalablePressError,
  createDesign,
  createQuote,
  placeOrder,
  type SpIssue,
} from './scalablepress';
import { stripe } from './stripe';

/**
 * Fulfilment runs from two places — the browser right after `confirmPayment`
 * resolves, and the `payment_intent.succeeded` webhook. Both call `fulfill()`,
 * which is idempotent, so whichever gets there first wins and the other is a
 * no-op.
 *
 * The guard is the PaymentIntent itself: `sp_order_id` set means done, and a
 * recent `placing` state means another attempt is mid-flight.
 */

/** How long we assume a fulfilment attempt could still be running. */
const PLACING_LEASE_MS = 90_000;

export type FulfillOutcome =
  | { status: 'placed'; orderId: string; record: OrderRecord }
  | { status: 'already_placed'; orderId: string; record: OrderRecord }
  | { status: 'in_progress'; record: OrderRecord }
  | { status: 'not_paid'; record: OrderRecord }
  | { status: 'deferred'; reason: string; record: OrderRecord }
  | { status: 'failed'; reason: string; issues: SpIssue[]; record: OrderRecord };

function issuesToMessage(issues: SpIssue[], fallback: string): string {
  const parts = issues.map((i) => i.message ?? i.code).filter(Boolean);
  return parts.length ? parts.join('; ') : fallback;
}

/** Stripe metadata values are capped at 500 characters. */
function clamp(value: string): string {
  return value.length > 480 ? `${value.slice(0, 477)}...` : value;
}

async function updateMetadata(
  paymentIntentId: string,
  metadata: Record<string, string>,
): Promise<Stripe.PaymentIntent> {
  return stripe().paymentIntents.update(paymentIntentId, { metadata });
}

export async function fulfill(paymentIntentId: string): Promise<FulfillOutcome> {
  const pi = await stripe().paymentIntents.retrieve(paymentIntentId);
  let record = toOrderRecord(pi);

  if (record.spOrderId) {
    return { status: 'already_placed', orderId: record.spOrderId, record };
  }
  if (record.paymentStatus !== 'succeeded') {
    return { status: 'not_paid', record };
  }
  if (record.state === 'placing' && record.startedAt && Date.now() - record.startedAt < PLACING_LEASE_MS) {
    return { status: 'in_progress', record };
  }
  if (!record.address) {
    // Should be impossible: we set shipping when creating the intent.
    const updated = await updateMetadata(paymentIntentId, {
      [FULFILLMENT_META.state]: 'failed',
      [FULFILLMENT_META.error]: 'No shipping address on the payment.',
    });
    return {
      status: 'failed',
      reason: 'No shipping address on the payment.',
      issues: [],
      record: toOrderRecord(updated),
    };
  }

  // Captured before we re-read the record, so narrowing survives the reassign.
  const address = record.address;
  const attempts = record.attempts + 1;
  const claimed = await updateMetadata(paymentIntentId, {
    [FULFILLMENT_META.state]: 'placing',
    [FULFILLMENT_META.startedAt]: String(Date.now()),
    [FULFILLMENT_META.attempts]: String(attempts),
    [FULFILLMENT_META.error]: '',
  });
  record = toOrderRecord(claimed);

  const defer = async (reason: string): Promise<FulfillOutcome> => {
    const updated = await updateMetadata(paymentIntentId, {
      [FULFILLMENT_META.state]: 'deferred',
      [FULFILLMENT_META.error]: clamp(reason),
    });
    return { status: 'deferred', reason, record: toOrderRecord(updated) };
  };

  const fail = async (reason: string, issues: SpIssue[]): Promise<FulfillOutcome> => {
    const updated = await updateMetadata(paymentIntentId, {
      [FULFILLMENT_META.state]: 'failed',
      [FULFILLMENT_META.error]: clamp(reason),
    });
    return { status: 'failed', reason, issues, record: toOrderRecord(updated) };
  };

  try {
    // The design normally already exists (we make it during checkout so the
    // quote can validate it), but rebuild it if we're recovering.
    let designId = record.designId;
    if (!designId) {
      if (record.timestampMs === null) {
        return fail('Lost the shirt timestamp, cannot re-render artwork.', []);
      }
      const design = await createDesign(record.timestampMs);
      designId = design.designId;
      await updateMetadata(paymentIntentId, { [FULFILLMENT_META.designId]: designId });
    }

    // An orderToken from checkout is reused if we have one; otherwise re-quote.
    let orderToken = record.orderToken;
    if (!orderToken) {
      if (!record.style || !record.size) {
        return fail('Lost the shirt style/size, cannot re-quote.', []);
      }
      const quote = await createQuote({
        designId,
        style: record.style,
        size: record.size,
        address,
      });
      if (!quote.orderToken) {
        return fail(
          issuesToMessage(quote.orderIssues, 'Scalable Press would not quote this order.'),
          quote.orderIssues,
        );
      }
      orderToken = quote.orderToken;
      await updateMetadata(paymentIntentId, {
        [FULFILLMENT_META.orderToken]: orderToken,
        [FULFILLMENT_META.costCents]: String(quote.totalCents),
      });
    }

    const order = await placeOrder(orderToken);
    const updated = await updateMetadata(paymentIntentId, {
      [FULFILLMENT_META.state]: 'placed',
      [FULFILLMENT_META.orderId]: order.orderId,
      [FULFILLMENT_META.mode]: order.mode ?? '',
      [FULFILLMENT_META.error]: '',
    });
    return { status: 'placed', orderId: order.orderId, record: toOrderRecord(updated) };
  } catch (cause) {
    if (cause instanceof ScalablePressError) {
      if (cause.kind === 'unavailable') return defer(cause.message);
      // A used-up orderToken means a concurrent attempt already placed it.
      if (/already/i.test(cause.message) && /token|order/i.test(cause.message)) {
        return defer(`Order token already redeemed: ${cause.message}`);
      }
      return fail(issuesToMessage(cause.issues, cause.message), cause.issues);
    }
    return defer((cause as Error).message ?? 'Unknown fulfilment error');
  }
}
