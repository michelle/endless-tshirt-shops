import type Stripe from 'stripe';

import { isShirtSize, isShirtStyle, type ShirtSize, type ShirtStyle } from './catalog';
import type { SpAddress } from './scalablepress';

/**
 * There is no database. A single-SKU shop's entire order record fits inside the
 * PaymentIntent it belongs to, and using Stripe as the system of record means
 * payment state and fulfilment state can never disagree.
 *
 * Metadata keys are namespaced so they read clearly in the Stripe dashboard.
 * (If this shop ever grows a second SKU or needs reporting, this is the seam to
 * replace with a real datastore — see README.)
 */

export type FulfillmentState =
  /** Payment not completed yet. */
  | 'awaiting_payment'
  /** A fulfilment attempt is in flight. */
  | 'placing'
  /** Scalable Press has the order. */
  | 'placed'
  /** Paid, but the printer was unreachable. Safe to retry. */
  | 'deferred'
  /** Paid, and the printer rejected the order. Needs a human. */
  | 'failed';

export const FULFILLMENT_META = {
  state: 'fulfillment_state',
  error: 'fulfillment_error',
  attempts: 'fulfillment_attempts',
  startedAt: 'fulfillment_started_at',
  designId: 'sp_design_id',
  orderToken: 'sp_order_token',
  orderId: 'sp_order_id',
  mode: 'sp_mode',
  costCents: 'sp_cost_cents',
  timestampMs: 'shirt_timestamp_ms',
  style: 'shirt_style',
  size: 'shirt_size',
  address: 'ship_address',
} as const;

export type OrderRecord = {
  paymentIntentId: string;
  paymentStatus: Stripe.PaymentIntent.Status;
  amountCents: number;
  currency: string;
  email: string | null;
  timestampMs: number | null;
  style: ShirtStyle | null;
  size: ShirtSize | null;
  designId: string | null;
  orderToken: string | null;
  spOrderId: string | null;
  spMode: string | null;
  state: FulfillmentState;
  error: string | null;
  attempts: number;
  startedAt: number | null;
  address: SpAddress | null;
};

function metaString(pi: Stripe.PaymentIntent, key: string): string | null {
  const value = pi.metadata?.[key];
  return value && value.length > 0 ? value : null;
}

function metaNumber(pi: Stripe.PaymentIntent, key: string): number | null {
  const value = metaString(pi, key);
  if (value === null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * The address we ship to, in metadata rather than `PaymentIntent.shipping`.
 *
 * Two reasons. Stripe.js writes `shipping` itself when it confirms a payment
 * alongside an AddressElement, and it refuses to overwrite a value that a
 * restricted key wrote — which is exactly what Stripe sandbox keys are, so
 * setting both ends in a 400 at confirm time. And keeping our own copy in
 * metadata means the address the printer ships to is the one the server
 * validated and quoted, not one the browser wrote on its way past.
 *
 * `pi.shipping` is still the fallback: it is what Stripe.js populates, so it
 * covers intents created before this key existed.
 */
function readAddress(pi: Stripe.PaymentIntent): SpAddress | null {
  const raw = metaString(pi, FULFILLMENT_META.address);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as SpAddress;
      if (parsed?.address1 && parsed.zip) {
        return { ...parsed, email: parsed.email ?? pi.receipt_email ?? undefined };
      }
    } catch {
      // Fall through to the Stripe-populated copy below.
    }
  }
  return readShipping(pi);
}

/** PaymentIntent.shipping is typed loosely across API versions; normalise it. */
function readShipping(pi: Stripe.PaymentIntent): SpAddress | null {
  const shipping = (pi as unknown as { shipping?: Stripe.PaymentIntent.Shipping | null }).shipping;
  const address = shipping?.address;
  if (!shipping || !address?.line1 || !address.postal_code) return null;
  return {
    name: shipping.name ?? '',
    address1: address.line1,
    address2: address.line2 ?? undefined,
    city: address.city ?? '',
    state: address.state ?? '',
    zip: address.postal_code,
    country: address.country ?? 'US',
    phone: shipping.phone ?? undefined,
    email: pi.receipt_email ?? undefined,
  };
}

export function toOrderRecord(pi: Stripe.PaymentIntent): OrderRecord {
  const state = metaString(pi, FULFILLMENT_META.state);
  const knownStates: FulfillmentState[] = ['awaiting_payment', 'placing', 'placed', 'deferred', 'failed'];
  const style = metaString(pi, FULFILLMENT_META.style);
  const size = metaString(pi, FULFILLMENT_META.size);

  return {
    paymentIntentId: pi.id,
    paymentStatus: pi.status,
    amountCents: pi.amount,
    currency: pi.currency,
    email: pi.receipt_email ?? null,
    timestampMs: metaNumber(pi, FULFILLMENT_META.timestampMs),
    style: isShirtStyle(style) ? style : null,
    size: isShirtSize(size) ? size : null,
    designId: metaString(pi, FULFILLMENT_META.designId),
    orderToken: metaString(pi, FULFILLMENT_META.orderToken),
    spOrderId: metaString(pi, FULFILLMENT_META.orderId),
    spMode: metaString(pi, FULFILLMENT_META.mode),
    state: knownStates.includes(state as FulfillmentState)
      ? (state as FulfillmentState)
      : 'awaiting_payment',
    error: metaString(pi, FULFILLMENT_META.error),
    attempts: metaNumber(pi, FULFILLMENT_META.attempts) ?? 0,
    startedAt: metaNumber(pi, FULFILLMENT_META.startedAt),
    address: readAddress(pi),
  };
}

/**
 * What the browser is allowed to see. Deliberately excludes the shipping address
 * and anything that would let a caller reconstruct payment details.
 */
export type PublicOrder = {
  state: FulfillmentState;
  paid: boolean;
  paymentStatus: Stripe.PaymentIntent.Status;
  amountCents: number;
  currency: string;
  timestampMs: number | null;
  style: ShirtStyle | null;
  size: ShirtSize | null;
  orderId: string | null;
  testMode: boolean;
  email: string | null;
  city: string | null;
  message: string;
};

const STATE_MESSAGES: Record<FulfillmentState, string> = {
  awaiting_payment: 'Waiting on payment confirmation.',
  placing: 'Sending your shirt to the printer.',
  placed: 'Your shirt is with the printer.',
  deferred:
    'Payment received. Our printer is temporarily unreachable, so this order is queued and will be submitted automatically.',
  failed: 'Payment received, but the printer rejected the order. We are on it — you will hear from us.',
};

export function toPublicOrder(record: OrderRecord): PublicOrder {
  const paid = record.paymentStatus === 'succeeded';
  return {
    state: record.state,
    paid,
    paymentStatus: record.paymentStatus,
    amountCents: record.amountCents,
    currency: record.currency,
    timestampMs: record.timestampMs,
    style: record.style,
    size: record.size,
    orderId: record.spOrderId,
    testMode: record.spMode === 'test',
    email: record.email,
    city: record.address?.city ?? null,
    message: paid ? STATE_MESSAGES[record.state] : STATE_MESSAGES.awaiting_payment,
  };
}
