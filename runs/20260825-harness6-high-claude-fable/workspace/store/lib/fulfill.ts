import Stripe from 'stripe';
import { getStripe } from './stripe';
import { createProdigiOrder } from './prodigi';
import { isValidSize, isValidStyle, isValidTimestamp } from './products';

export interface FulfillmentState {
  sessionId: string;
  paymentStatus: string;
  timestamp: string | null;
  style: string | null;
  size: string | null;
  prodigiOrderId: string | null;
  prodigiOrderStatus: string | null;
  error: string | null;
}

/**
 * Idempotently ensures a paid Checkout Session has a Prodigi order.
 * The Prodigi order id is written back to the PaymentIntent's metadata,
 * which doubles as our (lightweight) fulfillment record — no database needed.
 */
export async function ensureFulfilled(
  sessionId: string,
  opts: { allowCreate?: boolean } = {}
): Promise<FulfillmentState> {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['payment_intent'],
  });

  const meta = session.metadata ?? {};
  const state: FulfillmentState = {
    sessionId: session.id,
    paymentStatus: session.payment_status,
    timestamp: meta.timestamp ?? null,
    style: meta.style ?? null,
    size: meta.size ?? null,
    prodigiOrderId: null,
    prodigiOrderStatus: null,
    error: null,
  };

  const pi = session.payment_intent as Stripe.PaymentIntent | null;
  if (pi?.metadata?.prodigi_order_id) {
    state.prodigiOrderId = pi.metadata.prodigi_order_id;
    state.prodigiOrderStatus = pi.metadata.prodigi_order_status ?? null;
    return state;
  }

  if (session.payment_status !== 'paid' || opts.allowCreate === false) {
    return state;
  }

  const { timestamp, style, size } = meta;
  if (!isValidTimestamp(timestamp) || !isValidStyle(style) || !isValidSize(size)) {
    state.error = 'Session is missing valid shirt metadata; cannot fulfill.';
    return state;
  }

  const shipping =
    session.collected_information?.shipping_details ?? null;
  const addr = shipping?.address;
  if (!shipping?.name || !addr?.line1 || !addr.city || !addr.postal_code || !addr.country) {
    state.error = 'Session is missing a complete shipping address; cannot fulfill.';
    return state;
  }

  const origin = meta.origin || process.env.NEXT_PUBLIC_BASE_URL;
  if (!origin) {
    state.error = 'No public origin available for artwork URL.';
    return state;
  }
  const artworkUrl = `${origin}/api/artwork?ts=${timestamp}`;

  const order = await createProdigiOrder({
    merchantReference: session.id,
    timestamp,
    style,
    size,
    artworkUrl,
    recipient: {
      name: shipping.name,
      email: session.customer_details?.email ?? undefined,
      address: {
        line1: addr.line1,
        line2: addr.line2 ?? undefined,
        townOrCity: addr.city,
        stateOrCounty: addr.state ?? undefined,
        postalOrZipCode: addr.postal_code,
        countryCode: addr.country,
      },
    },
  });

  state.prodigiOrderId = order.id;
  state.prodigiOrderStatus = order.status;

  if (pi?.id) {
    await stripe.paymentIntents.update(pi.id, {
      metadata: {
        prodigi_order_id: order.id,
        prodigi_order_status: order.status,
      },
    });
  }

  return state;
}
