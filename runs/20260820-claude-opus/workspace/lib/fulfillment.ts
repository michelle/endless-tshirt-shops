/**
 * Fulfillment orchestration.
 *
 * The PaymentIntent is the durable order record: everything Scalable Press
 * needs to print and ship lives in its metadata. That keeps this deployment
 * stateless (no database) while still making fulfillment idempotent and
 * recoverable — if the print partner is down at checkout time, the payment
 * still succeeds and the order is left in a `deferred` state that can be
 * replayed later against the same PaymentIntent.
 */

import type Stripe from 'stripe';
import { stripe } from './stripe';
import { submitOrder, ScalablePressError } from './scalablepress';
import { env } from './env';

export type FulfillmentState =
  /** Order-ready quote in hand; ready to submit once payment succeeds. */
  | 'ready'
  /** Paid and submitted to Scalable Press. */
  | 'submitted'
  /** Paid, but no order token — needs a replay before it can be printed. */
  | 'deferred'
  /** Paid, submission attempted and rejected; needs a human. */
  | 'failed';

export interface FulfillmentResult {
  state: FulfillmentState;
  orderId: string | null;
  /** A customer-facing reference that always exists, even when deferred. */
  reference: string;
  message: string;
}

/** Short, human-quotable reference derived from the PaymentIntent id. */
export function referenceFor(paymentIntentId: string): string {
  return `DT-${paymentIntentId.replace(/^pi_/, '').slice(0, 10).toUpperCase()}`;
}

function metaString(pi: Stripe.PaymentIntent, key: string): string {
  const value = pi.metadata?.[key];
  return typeof value === 'string' ? value : '';
}

/**
 * Submit the order to Scalable Press for a *paid* PaymentIntent.
 * Safe to call more than once — the second call short-circuits on metadata.
 */
export async function fulfillPaymentIntent(
  paymentIntentId: string,
): Promise<FulfillmentResult> {
  const sdk = stripe();
  const pi = await sdk.paymentIntents.retrieve(paymentIntentId);
  const reference = referenceFor(pi.id);

  if (pi.status !== 'succeeded') {
    throw new FulfillmentError(`PaymentIntent ${pi.id} is ${pi.status}, not succeeded.`, {
      clientMessage: 'Payment has not completed yet.',
      statusCode: 409,
    });
  }

  // Already fulfilled — idempotent replay.
  const existingOrderId = metaString(pi, 'sp_order_id');
  if (existingOrderId) {
    return {
      state: 'submitted',
      orderId: existingOrderId,
      reference,
      message: 'Order already submitted for printing.',
    };
  }

  const orderToken = metaString(pi, 'sp_order_token');

  if (!orderToken) {
    await setState(pi.id, 'deferred');
    return {
      state: 'deferred',
      orderId: null,
      reference,
      message:
        'Payment captured. Your shirt is queued for printing and will be submitted automatically.',
    };
  }

  if (env.dryRunFulfillment) {
    await sdk.paymentIntents.update(pi.id, {
      metadata: { fulfillment_state: 'submitted', sp_order_id: `dryrun_${pi.id}` },
    });
    return {
      state: 'submitted',
      orderId: `dryrun_${pi.id}`,
      reference,
      message: 'Order accepted (dry-run mode: not sent to the printer).',
    };
  }

  try {
    const orderId = await submitOrder(orderToken);
    await sdk.paymentIntents.update(pi.id, {
      metadata: { fulfillment_state: 'submitted', sp_order_id: orderId },
    });
    return {
      state: 'submitted',
      orderId,
      reference,
      message: 'Order submitted for printing.',
    };
  } catch (error) {
    const retryable = error instanceof ScalablePressError ? error.retryable : true;
    await setState(pi.id, retryable ? 'deferred' : 'failed');

    if (retryable) {
      // The customer has paid and we hold the order token: this will succeed on
      // replay, so don't alarm them.
      return {
        state: 'deferred',
        orderId: null,
        reference,
        message:
          'Payment captured. Your shirt is queued for printing and will be submitted automatically.',
      };
    }
    throw error;
  }
}

async function setState(paymentIntentId: string, state: FulfillmentState): Promise<void> {
  try {
    await stripe().paymentIntents.update(paymentIntentId, {
      metadata: { fulfillment_state: state },
    });
  } catch (error) {
    console.error('[fulfillment] failed to record state', state, error);
  }
}

export class FulfillmentError extends Error {
  readonly clientMessage: string;
  readonly statusCode: number;
  constructor(message: string, opts: { clientMessage?: string; statusCode?: number } = {}) {
    super(message);
    this.name = 'FulfillmentError';
    this.clientMessage = opts.clientMessage ?? 'Could not complete fulfillment.';
    this.statusCode = opts.statusCode ?? 500;
  }
}
