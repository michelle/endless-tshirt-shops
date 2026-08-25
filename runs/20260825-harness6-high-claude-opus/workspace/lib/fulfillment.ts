import type Stripe from 'stripe';

import { artworkUrl } from './artwork';
import { getStripe } from './stripe';
import {
  ALLOWED_COUNTRIES,
  GARMENT_COLOR,
  PRODIGI_PRINT_AREA,
  PRODIGI_SHIPPING_METHOD,
  PRODIGI_SIZE,
  STYLES,
  isSizeId,
  isStyleId,
} from './product';
import {
  ProdigiError,
  type ProdigiOrder,
  createProdigiOrder,
  describeStage,
  findOrderByMerchantReference,
  getProdigiOrder,
} from './prodigi';
import { isPubliclyReachable, siteOrigin } from './site';

/**
 * Prodigi rejects empty strings on optional fields (`MustNotBeEmptyOrWhitespace`)
 * where it happily accepts null, and Stripe hands back "" for anything the
 * customer skipped.
 */
function blankToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export class FulfillmentError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'FulfillmentError';
    this.status = status;
  }
}

export type FulfillmentResult = {
  orderId: string | null;
  stage: string;
  order: ProdigiOrder | null;
  /** True when this call is what actually created the print order. */
  created: boolean;
};

/**
 * Two things can ask us to fulfil the same payment at nearly the same moment:
 * the browser right after `confirmPayment`, and the `payment_intent.succeeded`
 * webhook. Within one process this de-duplicates them; across processes we lean
 * on Prodigi's idempotency key and a merchantReference lookup.
 */
const inFlight = new Map<string, Promise<FulfillmentResult>>();

export function fulfillPaymentIntent(
  paymentIntent: Stripe.PaymentIntent,
): Promise<FulfillmentResult> {
  const existing = inFlight.get(paymentIntent.id);
  if (existing) return existing;

  const work = run(paymentIntent).finally(() => {
    inFlight.delete(paymentIntent.id);
  });
  inFlight.set(paymentIntent.id, work);
  return work;
}

async function run(paymentIntent: Stripe.PaymentIntent): Promise<FulfillmentResult> {
  if (paymentIntent.status !== 'succeeded') {
    throw new FulfillmentError(
      `Payment is ${paymentIntent.status}, so there is nothing to print yet.`,
      409,
    );
  }

  // 1. Already recorded on the payment itself.
  const recorded = paymentIntent.metadata?.prodigi_order_id;
  if (recorded) {
    const order = await getProdigiOrder(recorded)
      .then((r) => r.order)
      .catch(() => null);
    return { orderId: recorded, stage: describeStage(order), order, created: false };
  }

  // 2. Already at Prodigi but we lost the write (crash between the two calls).
  const remote = await findOrderByMerchantReference(paymentIntent.id).catch(() => null);
  if (remote) {
    await recordOnPaymentIntent(paymentIntent.id, remote);
    return { orderId: remote.id, stage: describeStage(remote), order: remote, created: false };
  }

  // 3. Actually place it.
  try {
    const { order, created } = await placeOrder(paymentIntent);
    await recordOnPaymentIntent(paymentIntent.id, order);
    return { orderId: order.id, stage: describeStage(order), order, created };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown fulfillment error';
    await getStripe()
      .paymentIntents.update(paymentIntent.id, {
        metadata: { fulfillment_error: message.slice(0, 480) },
      })
      .catch(() => undefined);
    throw error;
  }
}

async function placeOrder(
  paymentIntent: Stripe.PaymentIntent,
): Promise<{ order: ProdigiOrder; created: boolean }> {
  const meta = paymentIntent.metadata ?? {};
  const epochMs = Number(meta.epoch_ms);
  const style = meta.style;
  const size = meta.size;

  if (!Number.isInteger(epochMs) || !isStyleId(style) || !isSizeId(size)) {
    throw new FulfillmentError(
      'This payment is missing the shirt details needed to print it.',
      422,
    );
  }

  const shipping = paymentIntent.shipping;
  const address = shipping?.address;
  if (!shipping?.name || !address?.line1 || !address.city || !address.postal_code || !address.country) {
    throw new FulfillmentError('This payment has no complete shipping address.', 422);
  }

  const country = address.country.toUpperCase();
  if (!(ALLOWED_COUNTRIES as readonly string[]).includes(country)) {
    throw new FulfillmentError(`We do not ship to ${country} yet.`, 422);
  }

  const origin = siteOrigin();
  const asset = meta.artwork_url || artworkUrl(origin, epochMs);
  if (!isPubliclyReachable(asset)) {
    throw new FulfillmentError(
      'Artwork URL is not reachable from the public internet; set NEXT_PUBLIC_SITE_URL.',
      500,
    );
  }

  const email =
    paymentIntent.receipt_email ??
    (typeof paymentIntent.latest_charge === 'object'
      ? paymentIntent.latest_charge?.billing_details?.email
      : null) ??
    undefined;

  const result = await createProdigiOrder({
    merchantReference: paymentIntent.id,
    idempotencyKey: paymentIntent.id,
    shippingMethod: PRODIGI_SHIPPING_METHOD,
    recipient: {
      name: shipping.name,
      email: blankToNull(email),
      phoneNumber: blankToNull(shipping.phone),
      address: {
        line1: address.line1,
        line2: blankToNull(address.line2),
        townOrCity: address.city,
        stateOrCounty: blankToNull(address.state),
        postalOrZipCode: address.postal_code,
        countryCode: country,
      },
    },
    items: [
      {
        merchantReference: `${paymentIntent.id}:shirt`,
        sku: STYLES[style].sku,
        copies: 1,
        // Never crop: the artwork is transparent and already laid out against
        // the full print area.
        sizing: 'fitPrintArea',
        attributes: { color: GARMENT_COLOR, size: PRODIGI_SIZE[size] },
        assets: [{ printArea: PRODIGI_PRINT_AREA, url: asset }],
      },
    ],
    metadata: {
      source: 'datetime.store',
      epochMs,
      style,
      size,
      stripePaymentIntent: paymentIntent.id,
    },
  });

  return { order: result.order, created: result.outcome !== 'AlreadyExists' };
}

async function recordOnPaymentIntent(paymentIntentId: string, order: ProdigiOrder) {
  await getStripe()
    .paymentIntents.update(paymentIntentId, {
      metadata: {
        prodigi_order_id: order.id,
        prodigi_stage: order.status?.stage ?? 'Received',
        fulfilled_at: new Date().toISOString(),
        fulfillment_error: '',
      },
    })
    .catch((error: unknown) => {
      // The print order exists; failing to annotate the payment must not undo
      // it. The merchantReference lookup will recover the link next time.
      console.error('[fulfillment] could not annotate payment intent', error);
    });
}

export function toHttpError(error: unknown): { status: number; message: string } {
  if (error instanceof FulfillmentError) return { status: error.status, message: error.message };
  if (error instanceof ProdigiError) {
    return {
      status: error.status >= 500 ? 502 : 422,
      message: error.message,
    };
  }
  if (error instanceof Error) return { status: 500, message: error.message };
  return { status: 500, message: 'Unexpected error' };
}
