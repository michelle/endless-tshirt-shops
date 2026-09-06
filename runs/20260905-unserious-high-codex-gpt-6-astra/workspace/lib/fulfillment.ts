import type Stripe from 'stripe';
import { PRICE_CENTS } from './catalog';
import { appUrl, isTestMode, storeId, stripeClient, verifyMoment, safeError } from './server';
import { prodigi, printItem, type ProdigiOrder } from './prodigi';

export function validatePaidSession(session: Stripe.Checkout.Session) {
  if (session.metadata?.store_id !== storeId()) throw new Error('Session does not belong to this store');
  if (session.livemode === isTestMode()) throw new Error('Payment environment mismatch');
  if (session.payment_status !== 'paid' || session.status !== 'complete') throw new Error('Payment has not completed');
  if (session.amount_total !== PRICE_CENTS || session.currency !== 'usd') throw new Error('Payment amount mismatch');
  const moment = verifyMoment(session.metadata.artwork_token || '');
  if (String(moment.timestamp) !== session.metadata.timestamp || moment.style !== session.metadata.style || moment.size !== session.metadata.size) throw new Error('Order details do not match signed artwork');
  return moment;
}

export async function fulfillSession(sessionId: string): Promise<{ session: Stripe.Checkout.Session; order: ProdigiOrder }> {
  const stripe = stripeClient();
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const moment = validatePaidSession(session);
  const existingId = session.metadata?.prodigi_order_id;
  if (existingId) {
    const existing = await prodigi<{ order: ProdigiOrder }>(`/orders/${encodeURIComponent(existingId)}`);
    return { session, order: existing.order };
  }
  // Stripe CLI fixtures and older sessions can store shipping on the PaymentIntent.
  // Both sources are retrieved directly from Stripe, never from the browser.
  let shipping: Stripe.Checkout.Session.CollectedInformation.ShippingDetails | Stripe.PaymentIntent.Shipping | null | undefined = session.collected_information?.shipping_details;
  if (!shipping && session.payment_intent) {
    const intentId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent.id;
    shipping = (await stripe.paymentIntents.retrieve(intentId)).shipping;
  }
  if (!shipping?.name || !shipping.address?.line1 || !shipping.address.city || !shipping.address.postal_code || shipping.address.country !== 'US') throw new Error('Shipping details missing or unsupported');
  const address = shipping.address;
  const artworkUrl = `${appUrl()}/api/artwork/${session.metadata!.artwork_token}`;
  const result = await prodigi<{ order: ProdigiOrder; outcome: string }>('/orders', {
    shippingMethod: 'Standard',
    merchantReference: session.id,
    idempotencyKey: `datetime-${storeId()}-${session.id}`,
    recipient: { name: shipping.name, email: session.customer_details?.email || undefined, address: { line1: address.line1, line2: address.line2 || undefined, postalOrZipCode: address.postal_code, countryCode: address.country, townOrCity: address.city, stateOrCounty: address.state || undefined } },
    items: [printItem(moment, artworkUrl)],
    metadata: { stripeSessionId: session.id, timestamp: moment.timestamp, style: moment.style, size: moment.size, storeId: storeId(), environment: isTestMode() ? 'sandbox' : 'live' },
  });
  if (!result.order?.id) throw new Error('Print service did not return an order');
  // Prodigi keeps idempotency keys indefinitely. If this metadata write fails,
  // webhook retries resolve the SAME order, including after a server restart.
  await stripe.checkout.sessions.update(session.id, { metadata: { prodigi_order_id: result.order.id, fulfillment: 'submitted' } });
  const finalOrder = result.order.status ? result.order : (await prodigi<{ order: ProdigiOrder }>(`/orders/${encodeURIComponent(result.order.id)}`)).order;
  return { session, order: finalOrder };
}

export async function recordFulfillmentFailure(sessionId: string, error: unknown) {
  safeError('fulfillment_failed', error);
  try { await stripeClient().checkout.sessions.update(sessionId, { metadata: { fulfillment: 'retrying' } }); } catch (recordError) { safeError('fulfillment_record_failed', recordError); }
}
