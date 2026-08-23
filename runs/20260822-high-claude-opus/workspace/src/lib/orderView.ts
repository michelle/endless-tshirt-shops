/**
 * The shape of an order as the customer sees it. Derived entirely from the
 * PaymentIntent, which is our order record.
 */

import type Stripe from 'stripe';
import type { FulfillmentResult } from './fulfill';
import { STYLE_LABELS, isShirtSize, isShirtStyle } from './catalog';
import { describeTimestamp } from './artwork';

export type OrderView = {
  id: string;
  /** Customer-facing reference. Scalable Press identifies orders by this token. */
  reference: string | null;
  paid: boolean;
  paymentStatus: Stripe.PaymentIntent.Status;
  fulfillment: FulfillmentResult['status'];
  fulfillmentError?: string;
  amount: number;
  currency: string;
  email: string | null;
  epochMs: number | null;
  printedAt: string | null;
  style: string | null;
  styleLabel: string | null;
  size: string | null;
  shipping: {
    name: string | null;
    line1: string | null;
    line2: string | null;
    city: string | null;
    state: string | null;
    postalCode: string | null;
  } | null;
};

export function getOrderView(
  intent: Stripe.PaymentIntent,
  fulfillment: FulfillmentResult,
): OrderView {
  const meta = intent.metadata ?? {};
  const epoch = Number(meta.epoch_ms);
  const epochMs = Number.isSafeInteger(epoch) && epoch > 0 ? epoch : null;
  const style = isShirtStyle(meta.shirt_style) ? meta.shirt_style : null;
  const shipping = intent.shipping;

  return {
    id: intent.id,
    reference: fulfillment.orderToken ?? meta.sp_order_token ?? null,
    paid: intent.status === 'succeeded',
    paymentStatus: intent.status,
    fulfillment: fulfillment.status,
    ...(fulfillment.error ? { fulfillmentError: fulfillment.error } : {}),
    amount: intent.amount,
    currency: intent.currency,
    email: intent.receipt_email ?? meta.customer_email ?? null,
    epochMs,
    printedAt: epochMs ? describeTimestamp(epochMs) : null,
    style,
    styleLabel: style ? STYLE_LABELS[style] : null,
    size: isShirtSize(meta.shirt_size) ? meta.shirt_size : null,
    // Stripe fills `shipping` when the customer confirms; until then (and as a
    // cross-check) our own copy in metadata is the printer's record.
    shipping: {
      name: shipping?.name ?? meta.ship_name ?? null,
      line1: shipping?.address?.line1 ?? meta.ship_line1 ?? null,
      line2: shipping?.address?.line2 ?? meta.ship_line2 ?? null,
      city: shipping?.address?.city ?? meta.ship_city ?? null,
      state: shipping?.address?.state ?? meta.ship_state ?? null,
      postalCode: shipping?.address?.postal_code ?? meta.ship_postal_code ?? null,
    },
  };
}
