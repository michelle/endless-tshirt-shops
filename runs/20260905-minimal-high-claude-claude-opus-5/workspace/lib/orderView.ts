import type Stripe from 'stripe';
import { artworkPath } from './signing';
import { metadataToDraft } from './order';
import { STYLE_SPECS } from './products';
import type { FulfillmentResult } from './fulfillment';

/** The single shape the confirmation screen consumes. */
export function orderView(
  intent: Stripe.PaymentIntent,
  result: FulfillmentResult,
) {
  const draft = metadataToDraft(intent.metadata ?? null);
  return {
    paymentStatus: intent.status,
    fulfillmentStatus: result.status,
    orderId: result.prodigiOrderId ?? null,
    error: result.error ?? null,
    receiptEmail: intent.receipt_email ?? null,
    shirt: draft
      ? {
          ts: draft.ts,
          style: draft.style,
          size: draft.size,
          blank: STYLE_SPECS[draft.style].blank,
          artworkUrl: artworkPath(draft.ts, 1200),
        }
      : null,
  };
}
