import Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { createQuote, submitOrder, ScalablePressError } from '@/lib/scalablepress';
import { ShirtSize, ShirtStyle } from '@/lib/products';

export interface FulfillmentResult {
  status: 'ordered' | 'failed' | 'pending';
  orderId?: string | null;
  error?: string | null;
}

// Submits the print order to Scalable Press for a paid Checkout Session and
// records the outcome on the PaymentIntent's metadata. Safe to call more than
// once for the same session — a session already marked "ordered"/"failed" is
// left untouched, so this can run from both the Stripe webhook and the
// success-page poller without double-submitting the print order.
export async function fulfillCheckoutSession(session: Stripe.Checkout.Session): Promise<FulfillmentResult> {
  const stripe = getStripe();
  const paymentIntentId =
    typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id;

  if (!paymentIntentId) {
    return { status: 'failed', error: 'Checkout session has no payment intent' };
  }

  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  const currentStatus = paymentIntent.metadata?.fulfillment_status;
  if (currentStatus === 'ordered' || currentStatus === 'failed') {
    return {
      status: currentStatus,
      orderId: paymentIntent.metadata?.sp_order_id || null,
      error: paymentIntent.metadata?.fulfillment_error || null,
    };
  }

  const { style, size, designId } = session.metadata || {};
  const shipping = session.collected_information?.shipping_details;

  if (!style || !size || !designId || !shipping?.address) {
    const error = 'Missing order details from checkout session';
    await stripe.paymentIntents.update(paymentIntentId, {
      metadata: { fulfillment_status: 'failed', fulfillment_error: error },
    });
    return { status: 'failed', error };
  }

  try {
    const address = shipping.address;
    const orderToken = await createQuote(style as ShirtStyle, size as ShirtSize, designId, {
      name: shipping.name || session.customer_details?.name || 'Customer',
      address1: address.line1 || '',
      address2: address.line2 || undefined,
      city: address.city || '',
      state: address.state || '',
      zip: address.postal_code || '',
      country: address.country || 'US',
    });

    const orderId = await submitOrder(orderToken);

    await stripe.paymentIntents.update(paymentIntentId, {
      metadata: { fulfillment_status: 'ordered', sp_order_id: orderId },
    });
    return { status: 'ordered', orderId };
  } catch (err) {
    const message = err instanceof ScalablePressError ? err.message : 'Fulfillment failed';
    console.error('[fulfill] failed', err);
    await stripe.paymentIntents.update(paymentIntentId, {
      metadata: { fulfillment_status: 'failed', fulfillment_error: message.slice(0, 490) },
    });
    return { status: 'failed', error: message };
  }
}
