import type Stripe from 'stripe';
import { getAppUrl, getProdigiConfig, getStripe } from './server';

type ShippingDetails = {
  name?: string | null;
  address?: {
    line1?: string | null;
    line2?: string | null;
    city?: string | null;
    state?: string | null;
    postal_code?: string | null;
    country?: string | null;
  } | null;
};

type FulfillmentResult = {
  status: 'pending' | 'fulfilled';
  orderId?: string;
  timestamp?: string;
  fit?: string;
  size?: string;
};

function shippingFrom(session: Stripe.Checkout.Session): ShippingDetails | null {
  const current = session as Stripe.Checkout.Session & {
    collected_information?: { shipping_details?: ShippingDetails | null } | null;
    shipping_details?: ShippingDetails | null;
  };
  return current.collected_information?.shipping_details || current.shipping_details || null;
}

export async function fulfillCheckout(sessionId: string): Promise<FulfillmentResult> {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const { timestamp, fit, size, prodigi_order_id: existingOrderId } = session.metadata || {};

  if (session.payment_status !== 'paid') return { status: 'pending', timestamp, fit, size };
  if (existingOrderId) return { status: 'fulfilled', orderId: existingOrderId, timestamp, fit, size };

  if (!timestamp || !/^\d{13}$/.test(timestamp) || !['unisex', 'fitted'].includes(fit || '') || !['S', 'M', 'L', 'XL'].includes(size || '')) {
    throw new Error('Checkout metadata is incomplete');
  }

  const shipping = shippingFrom(session);
  const address = shipping?.address;
  if (!shipping?.name || !address?.line1 || !address.city || !address.postal_code || !address.country) {
    throw new Error('Checkout shipping address is incomplete');
  }

  const { apiKey, baseUrl } = getProdigiConfig();
  const appUrl = getAppUrl();
  const sku = fit === 'fitted' ? 'GLOBAL-TEE-GIL-64000L' : 'GLOBAL-TEE-GIL-64000';

  const prodigiResponse = await fetch(`${baseUrl}/Orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
    body: JSON.stringify({
      merchantReference: `datetime-${session.id.slice(-18)}`,
      idempotencyKey: session.id,
      shippingMethod: 'Budget',
      recipient: {
        name: shipping.name,
        email: session.customer_details?.email || undefined,
        phoneNumber: session.customer_details?.phone || undefined,
        address: {
          line1: address.line1,
          line2: address.line2 || undefined,
          postalOrZipCode: address.postal_code,
          countryCode: address.country,
          townOrCity: address.city,
          stateOrCounty: address.state || undefined,
        },
      },
      items: [
        {
          merchantReference: `${fit}-${size}-${timestamp}`,
          sku,
          copies: 1,
          sizing: 'fitPrintArea',
          attributes: { color: 'black', size: size.toLowerCase() },
          recipientCost: { amount: '22.50', currency: 'USD' },
          assets: [{ printArea: 'front', url: `${appUrl}/api/artwork?timestamp=${timestamp}` }],
        },
      ],
      metadata: { stripeCheckoutSessionId: session.id, timestamp, fit, size, environment: 'sandbox' },
    }),
    cache: 'no-store',
  });

  const payload = (await prodigiResponse.json().catch(() => null)) as {
    outcome?: string;
    order?: { id?: string; status?: { issues?: Array<{ description?: string }> } };
  } | null;
  const orderId = payload?.order?.id;
  if (!prodigiResponse.ok || !orderId) {
    throw new Error(`Prodigi rejected the order (${prodigiResponse.status}, ${payload?.outcome || 'unknown outcome'})`);
  }

  await stripe.checkout.sessions.update(session.id, {
    metadata: { ...session.metadata, prodigi_order_id: orderId, prodigi_outcome: payload?.outcome || 'Created' },
  });

  return { status: 'fulfilled', orderId, timestamp, fit, size };
}
