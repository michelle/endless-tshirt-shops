import type Stripe from 'stripe';
import { stripe } from './stripe';
import { createOrder, type Recipient } from './prodigi';
import { PRODUCT, SHIPPING, artUrl, specFromMetadata, type ShippingKey } from './spec';

export type Fulfilment = {
  state: 'unpaid' | 'pending' | 'placed' | 'failed';
  prodigiOrderId?: string;
  error?: string;
};

function recipientFrom(session: Stripe.Checkout.Session): Recipient | null {
  // Stripe moved shipping onto collected_information; accept either shape.
  const details =
    (session as any).collected_information?.shipping_details ??
    (session as any).shipping_details ??
    null;
  const a = details?.address;
  if (!a?.line1 || !a?.country) return null;
  return {
    name: details.name || session.customer_details?.name || 'Customer',
    email: session.customer_details?.email || undefined,
    phoneNumber: session.customer_details?.phone || undefined,
    address: {
      line1: a.line1,
      line2: a.line2 || undefined,
      postalOrZipCode: a.postal_code || '',
      countryCode: a.country,
      townOrCity: a.city || '',
      stateOrCounty: a.state || undefined,
    },
  };
}

function shippingKeyFrom(session: Stripe.Checkout.Session): ShippingKey {
  const rate = session.shipping_cost?.shipping_rate;
  const meta = typeof rate === 'object' && rate ? rate.metadata?.shipping_key : undefined;
  if (meta && meta in SHIPPING) return meta as ShippingKey;
  // Fall back to the amount actually charged for shipping.
  return (session.shipping_cost?.amount_total ?? 0) >= SHIPPING.express.amount
    ? 'express'
    : 'standard';
}

/**
 * Turn a paid checkout session into a Prodigi order.
 *
 * Safe to call repeatedly and from more than one place. Two guards stand between
 * a retry and a second printed shirt: the payment intent records the Prodigi
 * order id, and createOrder() scans Prodigi for an order already carrying this
 * session id as its merchantReference (Prodigi has no idempotency of its own).
 */
export async function fulfilSession(
  sessionId: string,
  origin: string,
  /**
   * Refuse to fulfil a session younger than this. The buyer lands on the order
   * page at almost exactly the moment the webhook fires, so without a grace
   * period those two paths race each other into two Prodigi orders. The webhook
   * passes 0; the order page passes ~90s and acts only as a safety net.
   */
  graceMs = 0
): Promise<Fulfilment> {
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['payment_intent', 'shipping_cost.shipping_rate'],
  });

  if (session.payment_status !== 'paid') return { state: 'unpaid' };

  const pi = session.payment_intent as Stripe.PaymentIntent | null;
  const existing = pi?.metadata?.prodigi_order_id;
  if (existing) return { state: 'placed', prodigiOrderId: existing };

  if (graceMs > 0 && Date.now() - session.created * 1000 < graceMs) {
    return { state: 'pending' };
  }

  const spec = specFromMetadata(session.metadata);
  const quantity = Math.min(
    PRODUCT.maxQty,
    Math.max(1, Number(session.metadata?.quantity) || 1)
  );
  const recipient = recipientFrom(session);
  if (!recipient) {
    return { state: 'failed', error: 'No shipping address was collected for this order.' };
  }

  try {
    const order = await createOrder({
      spec,
      quantity,
      recipient,
      shipping: shippingKeyFrom(session),
      artUrl: artUrl(spec, origin),
      reference: session.id,
    });
    if (pi) {
      await stripe.paymentIntents.update(pi.id, {
        metadata: {
          ...(pi.metadata ?? {}),
          prodigi_order_id: order.id,
          prodigi_error: '',
        },
      });
    }
    return { state: 'placed', prodigiOrderId: order.id };
  } catch (err: any) {
    const message = String(err?.message ?? err).slice(0, 480);
    if (pi) {
      await stripe.paymentIntents
        .update(pi.id, { metadata: { ...(pi.metadata ?? {}), prodigi_error: message } })
        .catch(() => {});
    }
    throw err;
  }
}
