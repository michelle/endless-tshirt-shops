import type Stripe from 'stripe';

import { isSize, isStyle, parseTimestamp, type Size, type Style } from './catalog';
import { createOrder, getOrder, ProdigiError, type ProdigiOrder, type ProdigiRecipient } from './prodigi';
import { artworkUrl } from './site';
import { stripe } from './stripe';

export type FulfillmentState =
  | { state: 'unknown' }
  | { state: 'unpaid'; session: OrderSummary }
  | { state: 'pending'; session: OrderSummary }
  | { state: 'placed'; session: OrderSummary; order: ProdigiOrder }
  | { state: 'failed'; session: OrderSummary; error: string };

export type OrderSummary = {
  id: string;
  ts: number | null;
  style: Style | null;
  size: Size | null;
  email: string | null;
  name: string | null;
  amountTotal: number | null;
  currency: string | null;
  paid: boolean;
};

const PRODIGI_ORDER_KEY = 'prodigi_order_id';
const PRODIGI_ERROR_KEY = 'prodigi_error';

/** Shipping details moved under `collected_information` in recent API versions. */
function shippingDetails(session: Stripe.Checkout.Session) {
  const collected = (session as unknown as {
    collected_information?: { shipping_details?: Stripe.Checkout.Session.CollectedInformation.ShippingDetails | null };
  }).collected_information?.shipping_details;
  const legacy = (session as unknown as { shipping_details?: Stripe.Checkout.Session.CollectedInformation.ShippingDetails | null })
    .shipping_details;
  return collected ?? legacy ?? null;
}

export function summarize(session: Stripe.Checkout.Session): OrderSummary {
  const md = session.metadata ?? {};
  const shipping = shippingDetails(session);
  return {
    id: session.id,
    ts: parseTimestamp(md.ts),
    style: isStyle(md.style) ? md.style : null,
    size: isSize(md.size) ? md.size : null,
    email: session.customer_details?.email ?? null,
    name: shipping?.name ?? session.customer_details?.name ?? null,
    amountTotal: session.amount_total,
    currency: session.currency,
    paid: session.payment_status === 'paid',
  };
}

function toRecipient(session: Stripe.Checkout.Session): ProdigiRecipient {
  const shipping = shippingDetails(session);
  const address = shipping?.address;
  if (!address?.line1 || !address.country) {
    throw new Error('Checkout session is missing a usable shipping address');
  }
  return {
    name: shipping?.name ?? session.customer_details?.name ?? 'Customer',
    email: session.customer_details?.email ?? undefined,
    phoneNumber: session.customer_details?.phone ?? undefined,
    address: {
      line1: address.line1,
      line2: address.line2 ?? undefined,
      postalOrZipCode: address.postal_code ?? '',
      countryCode: address.country,
      townOrCity: address.city ?? '',
      stateOrCounty: address.state ?? undefined,
    },
  };
}

function paymentIntentId(session: Stripe.Checkout.Session): string | null {
  const pi = session.payment_intent;
  if (!pi) return null;
  return typeof pi === 'string' ? pi : pi.id;
}

function paymentIntentMetadata(session: Stripe.Checkout.Session): Stripe.Metadata {
  const pi = session.payment_intent;
  if (!pi || typeof pi === 'string') return {};
  return pi.metadata ?? {};
}

type Options = {
  /**
   * When false, report state without ever calling Prodigi's create endpoint.
   *
   * That call takes ~7s, which is far too long to sit in front of a customer who
   * has just paid. The confirmation screen reads first (fast), shows the receipt,
   * and only then asks us to place the order.
   */
  create?: boolean;
};

/**
 * Idempotently turn a paid Checkout Session into a Prodigi order.
 *
 * Called from two places on purpose: the Stripe webhook (authoritative) and the
 * order page (so a shop with no webhook configured still fulfils, and so a
 * customer refreshing sees a result rather than a spinner). Duplicate calls are
 * safe — Prodigi de-duplicates on `idempotencyKey`, and we record the resulting
 * order id on the PaymentIntent so we stop asking.
 */
export async function fulfillSession(
  sessionId: string,
  origin: string,
  { create = true }: Options = {},
): Promise<FulfillmentState> {
  const s = stripe();

  let session: Stripe.Checkout.Session;
  try {
    session = await s.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent'],
    });
  } catch {
    return { state: 'unknown' };
  }

  const summary = summarize(session);
  if (!summary.paid) return { state: 'unpaid', session: summary };

  const piId = paymentIntentId(session);
  const piMeta = paymentIntentMetadata(session);

  const existingId = piMeta[PRODIGI_ORDER_KEY];
  if (existingId) {
    const order = await getOrder(existingId);
    if (order) return { state: 'placed', session: summary, order };
  }

  const lastError = piMeta[PRODIGI_ERROR_KEY];
  if (!create) {
    return lastError
      ? { state: 'failed', session: summary, error: lastError }
      : { state: 'pending', session: summary };
  }

  const { ts, style, size } = summary;
  if (ts === null || !style || !size) {
    return {
      state: 'failed',
      session: summary,
      error: 'Order metadata is incomplete; cannot determine what to print.',
    };
  }

  try {
    const order = await createOrder({
      reference: session.id,
      style,
      size,
      artworkUrl: artworkUrl(origin, ts, style),
      recipient: toRecipient(session),
      callbackUrl: `${origin}/api/prodigi/callback`,
    });

    if (piId) {
      await s.paymentIntents.update(piId, {
        metadata: { ...piMeta, [PRODIGI_ORDER_KEY]: order.id, [PRODIGI_ERROR_KEY]: '' },
      });
    }
    return { state: 'placed', session: summary, order };
  } catch (err) {
    const message =
      err instanceof ProdigiError
        ? `Prodigi rejected the order (${err.status}): ${JSON.stringify(err.body).slice(0, 400)}`
        : err instanceof Error
          ? err.message
          : 'Unknown fulfilment error';

    // Record it on the PaymentIntent so a human can find every stuck order in the
    // Stripe dashboard instead of grepping function logs.
    if (piId) {
      await s.paymentIntents
        .update(piId, { metadata: { ...piMeta, [PRODIGI_ERROR_KEY]: message.slice(0, 480) } })
        .catch(() => undefined);
    }
    console.error('[fulfill] failed', session.id, message);
    return { state: 'failed', session: summary, error: message };
  }
}
