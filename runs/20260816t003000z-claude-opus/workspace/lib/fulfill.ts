/**
 * Fulfillment: turn a succeeded PaymentIntent into a Scalable Press order.
 *
 * Called from two places — the browser right after payment (fast path, so the
 * customer sees their order number) and the Stripe webhook (safety net, so a
 * customer who closes the tab mid-redirect still gets a shirt). Both routes run
 * through here, and the PaymentIntent itself is the idempotency record.
 */

import type Stripe from 'stripe';
import { stripe } from './stripe';
import { submitOrder } from './scalablepress';

export interface FulfillResult {
  orderId: string;
  /** True when Scalable Press actually queued a garment for production. */
  live: boolean;
  /** True when this call was a no-op because the order already existed. */
  alreadyFulfilled: boolean;
}

export class PaymentNotReadyError extends Error {
  readonly status = 409;
  constructor(public readonly paymentStatus: string) {
    super(`PaymentIntent is ${paymentStatus}, not succeeded`);
    this.name = 'PaymentNotReadyError';
  }
}

export async function fulfillPaymentIntent(
  intent: Stripe.PaymentIntent,
): Promise<FulfillResult> {
  if (intent.status !== 'succeeded') {
    throw new PaymentNotReadyError(intent.status);
  }

  // Already shipped off to production — return the recorded id rather than
  // ordering a second shirt.
  const existing = intent.metadata?.sp_order_id;
  if (existing) {
    return {
      orderId: existing,
      live: intent.metadata?.sp_order_live === 'true',
      alreadyFulfilled: true,
    };
  }

  const orderToken = intent.metadata?.sp_order_token;
  if (!orderToken) {
    throw new Error(`PaymentIntent ${intent.id} has no sp_order_token in metadata`);
  }

  const { orderId, live } = await submitOrder(orderToken);

  await stripe().paymentIntents.update(intent.id, {
    metadata: {
      ...intent.metadata,
      sp_order_id: orderId,
      sp_order_live: String(live),
    },
  });

  return { orderId, live, alreadyFulfilled: false };
}

/** Human-facing order reference. Scalable Press ids are long and ugly. */
export function orderReference(intent: Stripe.PaymentIntent): string {
  return `DT-${intent.id.slice(-8).toUpperCase()}`;
}
