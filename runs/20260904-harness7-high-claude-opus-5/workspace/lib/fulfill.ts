import type Stripe from 'stripe';
import { stripe } from './stripe';
import {
  PRODIGI_SIZE,
  PRODUCTS,
  SHIRT_COLOR,
  describeShirt,
  parseSize,
  parseStyle,
  parseTimestamp,
} from './catalog';
import { artworkPath } from './artwork';
import {
  ProdigiError,
  createOrder,
  findOrderByMerchantReference,
  type ProdigiOrder,
} from './prodigi';

/**
 * Where a paid order got to. We deliberately keep no database: the Stripe
 * PaymentIntent's metadata is the record of whether a Prodigi order exists,
 * and Prodigi itself is the record of what happened to it.
 */
export type FulfilmentResult =
  | { state: 'fulfilled'; prodigiOrderId: string; order: ProdigiOrder | null }
  | { state: 'unpaid' }
  | { state: 'failed'; message: string };

export const PRODIGI_ORDER_ID_KEY = 'prodigi_order_id';
export const PRODIGI_ERROR_KEY = 'prodigi_error';

/**
 * Turn a paid Stripe Checkout Session into a printed shirt.
 *
 * Safe to call repeatedly and from more than one place at once. The Stripe
 * webhook calls it, and so does the order-status endpoint the success page
 * polls — so a buyer still gets their shirt if the webhook is misconfigured or
 * delayed. Two things make that safe:
 *
 *   1. We short-circuit if the PaymentIntent already records a Prodigi order.
 *   2. Prodigi is given an idempotency key derived from the session id, so
 *      even a true race resolves to a single order.
 */
export async function fulfilSession(
  session: Stripe.Checkout.Session,
  baseUrl: string,
): Promise<FulfilmentResult> {
  if (session.payment_status !== 'paid') return { state: 'unpaid' };

  const paymentIntentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id;

  // Fast path: we have already done this.
  const known = await readRecordedOrderId(session, paymentIntentId);
  if (known) {
    return { state: 'fulfilled', prodigiOrderId: known, order: await safeGet(known) };
  }

  const spec = readShirtSpec(session);
  if (!spec) {
    return {
      state: 'failed',
      message: 'Order is missing valid shirt details; cannot be fulfilled automatically.',
    };
  }

  const recipient = readRecipient(session);
  if (!recipient) {
    return {
      state: 'failed',
      message: 'Order is missing a complete shipping address; cannot be fulfilled automatically.',
    };
  }

  const { ts, style, size } = spec;

  try {
    const { order } = await createOrder({
      merchantReference: session.id,
      idempotencyKey: session.id,
      shippingMethod: 'Budget',
      recipient,
      items: [
        {
          merchantReference: describeShirt(ts, style, size),
          sku: PRODUCTS[style].sku,
          copies: 1,
          // Our artwork is rendered at the print area's aspect ratio, so
          // "fill" maps our canvas onto the garment one-to-one.
          sizing: 'fillPrintArea',
          attributes: { color: SHIRT_COLOR, size: PRODIGI_SIZE[size] },
          assets: [{ printArea: 'front', url: `${baseUrl}${artworkPath(ts)}` }],
        },
      ],
      metadata: {
        stripe_session: session.id,
        timestamp: String(ts),
        style,
        size,
      },
    });

    await recordOrderId(paymentIntentId, order.id);
    return { state: 'fulfilled', prodigiOrderId: order.id, order };
  } catch (err) {
    // A duplicate idempotency key can surface as a conflict rather than the
    // existing order; recover by looking the order up by our own reference.
    const existing = await findOrderByMerchantReference(session.id).catch(() => null);
    if (existing) {
      await recordOrderId(paymentIntentId, existing.id);
      return { state: 'fulfilled', prodigiOrderId: existing.id, order: existing };
    }

    const message =
      err instanceof ProdigiError
        ? `Prodigi rejected the order (${err.status}): ${JSON.stringify(err.body).slice(0, 400)}`
        : err instanceof Error
          ? err.message
          : 'Unknown fulfilment error';

    console.error('[fulfil] failed for session', session.id, message);
    await recordError(paymentIntentId, message);
    return { state: 'failed', message };
  }
}

function readShirtSpec(session: Stripe.Checkout.Session) {
  const md = session.metadata ?? {};
  const ts = parseTimestamp(md.timestamp);
  const style = parseStyle(md.style);
  const size = parseSize(md.size);
  if (ts === null || style === null || size === null) return null;
  return { ts, style, size };
}

function readRecipient(session: Stripe.Checkout.Session) {
  // In the Basil API version the shipping address collected during Checkout
  // lives under `collected_information`, not the old top-level
  // `shipping_details`.
  const shipping = session.collected_information?.shipping_details;
  const address = shipping?.address;
  if (!address?.line1 || !address.country || !address.city || !address.postal_code) return null;

  const name =
    shipping?.name ||
    session.customer_details?.name ||
    // Prodigi requires a recipient name; fall back to the email local part
    // rather than dropping a paid order on the floor.
    session.customer_details?.email?.split('@')[0] ||
    'Customer';

  return {
    name,
    email: session.customer_details?.email ?? null,
    address: {
      line1: address.line1,
      line2: address.line2 || null,
      postalOrZipCode: address.postal_code,
      countryCode: address.country,
      townOrCity: address.city,
      stateOrCounty: address.state || null,
    },
  };
}

async function readRecordedOrderId(
  session: Stripe.Checkout.Session,
  paymentIntentId: string | undefined,
): Promise<string | null> {
  if (typeof session.payment_intent === 'object' && session.payment_intent) {
    const fromExpansion = session.payment_intent.metadata?.[PRODIGI_ORDER_ID_KEY];
    if (fromExpansion) return fromExpansion;
  }
  if (!paymentIntentId) return null;
  try {
    const pi = await stripe().paymentIntents.retrieve(paymentIntentId);
    return pi.metadata?.[PRODIGI_ORDER_ID_KEY] ?? null;
  } catch {
    return null;
  }
}

async function recordOrderId(paymentIntentId: string | undefined, orderId: string) {
  if (!paymentIntentId) return;
  try {
    await stripe().paymentIntents.update(paymentIntentId, {
      metadata: { [PRODIGI_ORDER_ID_KEY]: orderId, [PRODIGI_ERROR_KEY]: '' },
    });
  } catch (err) {
    // Losing the bookkeeping write is survivable — Prodigi's idempotency key
    // still prevents a duplicate print — so never fail the order over it.
    console.error('[fulfil] could not record Prodigi order id on payment intent', err);
  }
}

async function recordError(paymentIntentId: string | undefined, message: string) {
  if (!paymentIntentId) return;
  try {
    await stripe().paymentIntents.update(paymentIntentId, {
      metadata: { [PRODIGI_ERROR_KEY]: message.slice(0, 480) },
    });
  } catch {
    /* best effort */
  }
}

async function safeGet(id: string): Promise<ProdigiOrder | null> {
  try {
    const { getOrder } = await import('./prodigi');
    return (await getOrder(id)).order;
  } catch {
    return null;
  }
}
