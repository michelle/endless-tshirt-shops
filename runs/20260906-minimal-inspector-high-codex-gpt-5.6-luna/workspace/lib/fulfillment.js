import { getStripe } from './stripe';
import { submitProdigiOrder } from './prodigi';

export async function fulfillPaymentIntent(paymentIntentOrId) {
  const stripe = getStripe();
  const paymentIntent = typeof paymentIntentOrId === 'string'
    ? await stripe.paymentIntents.retrieve(paymentIntentOrId)
    : paymentIntentOrId;

  if (paymentIntent.status !== 'succeeded') {
    throw new Error(`Payment is not complete (status: ${paymentIntent.status})`);
  }

  if (paymentIntent.metadata?.prodigi_order_id) {
    return {
      paymentIntentId: paymentIntent.id,
      prodigiOrderId: paymentIntent.metadata.prodigi_order_id,
      alreadySubmitted: true,
    };
  }

  const metadata = paymentIntent.metadata || {};
  const order = await submitProdigiOrder({
    paymentIntentId: paymentIntent.id,
    email: paymentIntent.receipt_email,
    shipping: paymentIntent.shipping,
    size: metadata.size,
    style: metadata.style,
    artworkTimestamp: metadata.artwork_timestamp,
  });

  const orderId = order.id || order.orderId || order.order_id;
  if (!orderId) throw new Error('Prodigi accepted the request without returning an order id');

  await stripe.paymentIntents.update(paymentIntent.id, {
    metadata: {
      ...metadata,
      prodigi_order_id: String(orderId),
      fulfillment_status: 'submitted',
    },
  });

  return { paymentIntentId: paymentIntent.id, prodigiOrderId: String(orderId), alreadySubmitted: false };
}
