import type Stripe from 'stripe';
import { stripe } from './stripe';
import { prodigi, type ProdigiOrder } from './prodigi';
import { selectionSchema, productItem, PRICE, type Selection } from './catalog';
import { artworkUrl } from './artwork';
import { assertPaymentMode } from './config';
export function paidSelection(session: Stripe.Checkout.Session): Selection {
  if (session.payment_status !== 'paid' || session.status !== 'complete')
    throw new Error('Payment has not completed');
  if (
    session.mode !== 'payment' ||
    session.currency !== 'usd' ||
    session.amount_total !== PRICE ||
    session.metadata?.product !== 'datetime-v1'
  )
    throw new Error('Payment does not match this product');
  assertPaymentMode(session.livemode);
  return selectionSchema.parse({
    fit: session.metadata.fit,
    size: session.metadata.size,
    timestamp: Number(session.metadata.timestamp),
  });
}
export function orderPayload(
  session: Stripe.Checkout.Session,
  selection: Selection,
) {
  const shipping = session.collected_information?.shipping_details;
  const a = shipping?.address;
  if (
    !shipping?.name ||
    !a?.line1 ||
    !a.city ||
    !a.postal_code ||
    a.country !== 'US'
  )
    throw new Error('A valid US shipping address is required');
  return {
    merchantReference: session.id,
    idempotencyKey: session.id,
    shippingMethod: 'Standard',
    recipient: {
      name: shipping.name,
      email: session.customer_details?.email || undefined,
      address: {
        line1: a.line1,
        line2: a.line2 || undefined,
        postalOrZipCode: a.postal_code,
        countryCode: a.country,
        townOrCity: a.city,
        stateOrCounty: a.state || undefined,
      },
    },
    items: [
      {
        ...productItem(selection),
        merchantReference: `datetime-${selection.timestamp}`,
        sizing: 'fitPrintArea',
        recipientCost: { amount: '22.50', currency: 'USD' },
        assets: [{ printArea: 'front', url: artworkUrl(selection) }],
      },
    ],
    metadata: {
      stripeSessionId: session.id,
      timestamp: String(selection.timestamp),
      fit: selection.fit,
      size: selection.size,
      source: 'datetime.store',
    },
  };
}
export async function fulfill(sessionId: string) {
  const session = await stripe().checkout.sessions.retrieve(sessionId);
  const selection = paidSelection(session);
  if (session.metadata?.prodigi_order_id)
    return {
      session,
      order: await prodigi<{ order: ProdigiOrder }>(
        `/orders/${session.metadata.prodigi_order_id}`,
      ).then((d) => d.order),
    };
  // Prodigi retains idempotency keys indefinitely. Concurrent webhook and return-page
  // requests receive the same order, even if a process dies before storing metadata.
  const result = await prodigi<{ outcome: string; order?: ProdigiOrder }>(
    '/orders',
    orderPayload(session, selection),
  );
  if (!result.order?.id)
    throw new Error('Fulfillment did not return an order ID');
  await stripe().checkout.sessions.update(sessionId, {
    metadata: {
      prodigi_order_id: result.order.id,
      fulfillment_state: result.order.status?.issues?.length
        ? 'needs_attention'
        : 'submitted',
    },
  });
  return { session, order: result.order };
}
