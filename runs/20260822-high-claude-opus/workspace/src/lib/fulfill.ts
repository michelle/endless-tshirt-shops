/**
 * Fulfillment.
 *
 * A shirt is only sent to the printer once Stripe says the money arrived. The
 * PaymentIntent doubles as the order record: everything needed to place the
 * Scalable Press order lives in its metadata, so there is no database to keep
 * in sync with Stripe.
 *
 * Two paths call in here — the Stripe webhook, and the confirmation page when a
 * customer lands on it. Both are safe to run concurrently and repeatedly:
 * Scalable Press refuses to place an already-placed order, which we treat as
 * success.
 */

import type Stripe from 'stripe';
import { stripe } from './stripe';
import { placeOrder } from './scalablepress';

export type OrderMetadata = {
  sp_design_id?: string;
  sp_order_token?: string;
  sp_order_status?: 'pending' | 'placed';
  sp_quote_total?: string;
  shirt_style?: string;
  shirt_size?: string;
  epoch_ms?: string;
};

export type FulfillmentResult = {
  status: 'placed' | 'awaiting_payment' | 'failed' | 'not_fulfillable';
  orderToken?: string;
  error?: string;
};

/**
 * Place the printer order for a paid PaymentIntent.
 *
 * Returns `awaiting_payment` when the money has not landed yet, which is a
 * normal state rather than an error.
 */
export async function fulfillPaymentIntent(
  intent: Stripe.PaymentIntent,
): Promise<FulfillmentResult> {
  const metadata = (intent.metadata ?? {}) as OrderMetadata;
  const orderToken = metadata.sp_order_token;

  if (!orderToken) {
    // Not one of ours, or created before the quote succeeded.
    return { status: 'not_fulfillable', error: 'No Scalable Press order token.' };
  }

  if (metadata.sp_order_status === 'placed') {
    return { status: 'placed', orderToken };
  }

  if (intent.status !== 'succeeded') {
    return { status: 'awaiting_payment', orderToken };
  }

  try {
    await placeOrder(orderToken);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown printer error.';
    console.error('[fulfill] Scalable Press order failed', {
      paymentIntent: intent.id,
      orderToken,
      message,
    });
    // Leave the metadata unplaced so a webhook retry or a page reload tries again.
    return { status: 'failed', orderToken, error: message };
  }

  try {
    await stripe().paymentIntents.update(intent.id, {
      metadata: { ...intent.metadata, sp_order_status: 'placed' },
    });
  } catch (err) {
    // The shirt is ordered; failing to record that is not worth failing the
    // request over. The next attempt is a no-op at Scalable Press anyway.
    console.error('[fulfill] could not record fulfillment on PaymentIntent', {
      paymentIntent: intent.id,
      error: err instanceof Error ? err.message : err,
    });
  }

  console.log('[fulfill] order placed', { paymentIntent: intent.id, orderToken });
  return { status: 'placed', orderToken };
}

export async function fulfillPaymentIntentById(id: string): Promise<FulfillmentResult> {
  const intent = await stripe().paymentIntents.retrieve(id);
  return fulfillPaymentIntent(intent);
}
