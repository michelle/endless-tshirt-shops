import type Stripe from 'stripe';
import { log } from './log';
import { ScalablePressError, findOrderIdByToken, placeOrder } from './scalablepress';
import { readOrderMetadata, stripe } from './stripe';

export type FulfillmentState =
  | { status: 'placed'; orderId: string }
  /** Paid and the order is with Scalable Press, but we don't have the ID to hand yet. */
  | { status: 'placing' }
  | { status: 'awaiting_payment' }
  | { status: 'failed'; message: string };

/**
 * Hand a paid order to Scalable Press. Safe to call as many times as you like,
 * from as many places as you like — the Scalable Press order token is the
 * idempotency key, so a duplicate call cannot produce a duplicate shirt.
 *
 * Both the Stripe webhook and the customer's own success-page poll call this.
 * That redundancy is deliberate: the shop still fulfils orders if the webhook is
 * misconfigured or delayed, and it still fulfils them if the customer closes the
 * tab the moment they pay.
 */
export async function fulfill(pi: Stripe.PaymentIntent): Promise<FulfillmentState> {
  const meta = readOrderMetadata(pi);

  if (meta.sp_order_id) return { status: 'placed', orderId: meta.sp_order_id };
  if (meta.sp_status === 'failed') {
    return { status: 'failed', message: meta.sp_error ?? 'Order could not be placed.' };
  }
  if (pi.status !== 'succeeded') return { status: 'awaiting_payment' };

  const orderToken = meta.sp_order_token;
  if (!orderToken) {
    log.error('fulfill.missing_order_token', { paymentIntent: pi.id });
    await markFailed(pi.id, 'Internal error: order token missing.');
    return { status: 'failed', message: 'Internal error: order token missing.' };
  }

  log.info('fulfill.start', { paymentIntent: pi.id, orderToken });

  try {
    const result = await placeOrder(orderToken);

    if (!result.placed) {
      // The token was already turned into an order. Recovering the ID from
      // Scalable Press rather than from our own metadata matters: the order can
      // have been placed by a call whose write back to Stripe then failed, in
      // which case the ID exists only at the printer and waiting for it to
      // appear in metadata would stall the order forever.
      const recovered = await recoverOrderId(pi, orderToken);
      return recovered ? { status: 'placed', orderId: recovered } : { status: 'placing' };
    }

    const orderId = result.order.orderId;
    if (!orderId) {
      log.error('fulfill.no_order_id', { paymentIntent: pi.id, orderToken });
      return { status: 'placing' };
    }

    await stripe().paymentIntents.update(pi.id, {
      metadata: { sp_order_id: orderId, sp_status: 'placed' },
    });
    log.info('fulfill.placed', { paymentIntent: pi.id, orderId, spStatus: result.order.status });
    return { status: 'placed', orderId };
  } catch (err) {
    const message =
      err instanceof ScalablePressError
        ? err.customerMessage
        : 'We could not reach our print partner.';
    const retryable = !(err instanceof ScalablePressError) || err.status >= 500;

    log.error('fulfill.failed', {
      paymentIntent: pi.id,
      orderToken,
      retryable,
      message: (err as Error).message,
      issues: err instanceof ScalablePressError ? err.issues : undefined,
    });

    if (retryable) {
      // Leave sp_status pending so the webhook retry and the customer's poll
      // both try again. The money is already captured, so giving up silently
      // would be the worst outcome.
      return { status: 'placing' };
    }

    await markFailed(pi.id, message);
    return { status: 'failed', message };
  }
}

/**
 * Find the order ID for a token Scalable Press says is already placed.
 *
 * Asks the printer first, since that is the authoritative record, and records the
 * answer so subsequent calls short-circuit. Falls back to re-reading the
 * PaymentIntent in case a concurrent caller of ours wrote the ID in the meantime.
 */
async function recoverOrderId(
  pi: Stripe.PaymentIntent,
  orderToken: string,
): Promise<string | null> {
  try {
    const orderId = await findOrderIdByToken(orderToken);
    if (orderId) {
      log.info('fulfill.recovered_order_id', { paymentIntent: pi.id, orderToken, orderId });
      await stripe()
        .paymentIntents.update(pi.id, { metadata: { sp_order_id: orderId, sp_status: 'placed' } })
        .catch((err) =>
          // The order is real either way; we'll recover the ID again next time.
          log.error('fulfill.recover_write_failed', {
            paymentIntent: pi.id,
            message: (err as Error).message,
          }),
        );
      return orderId;
    }
    log.warn('fulfill.recover_not_found', { paymentIntent: pi.id, orderToken });
  } catch (err) {
    log.error('fulfill.recover_error', { paymentIntent: pi.id, message: (err as Error).message });
  }

  const fresh = await stripe().paymentIntents.retrieve(pi.id);
  return readOrderMetadata(fresh).sp_order_id ?? null;
}

/**
 * A permanent fulfilment failure on a captured payment needs a human. We record
 * it on the PaymentIntent so it is visible in the Stripe dashboard rather than
 * only in logs.
 */
async function markFailed(paymentIntentId: string, message: string) {
  try {
    await stripe().paymentIntents.update(paymentIntentId, {
      metadata: { sp_status: 'failed', sp_error: message.slice(0, 500) },
    });
  } catch (err) {
    log.error('fulfill.mark_failed_error', {
      paymentIntent: paymentIntentId,
      message: (err as Error).message,
    });
  }
}
