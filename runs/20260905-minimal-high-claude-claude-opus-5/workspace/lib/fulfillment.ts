/**
 * Turning a paid PaymentIntent into a Prodigi print order.
 *
 * Two things can trigger this: the Stripe webhook (the durable path) and the
 * buyer's own confirmation request (the fast path, so they see an order number
 * without waiting on a webhook). They can and do arrive at the same moment, and
 * printing two shirts for one payment is the worst bug this app could have, so
 * the guard here is deliberately belt-and-braces:
 *
 *   1. A claim lease written into the PaymentIntent's metadata. Stripe metadata
 *      is last-write-wins, so every racer writes its own token, waits for the
 *      dust to settle, and re-reads. Exactly one token survives; everyone else
 *      backs off.
 *   2. Before creating anything, we ask Prodigi whether an order already exists
 *      for this PaymentIntent. That closes the residual window in (1) using the
 *      only authority that actually matters.
 */

import { randomUUID } from 'node:crypto';
import type Stripe from 'stripe';
import { stripe } from './stripe';
import { artworkPath } from './signing';
import { siteOrigin } from './env';
import { STYLE_SPECS } from './products';
import {
  metadataToDraft,
  prodigiAttributes,
  type FulfillmentStatus,
  type OrderDraft,
} from './order';
import { ARTWORK_PX } from './artwork';
import {
  ProdigiError,
  blockingIssues,
  createOrder,
  findOrderByMerchantReference,
} from './prodigi';

/** How long a claim is trusted before another worker may take over. */
const LOCK_TTL_MS = 120_000;
/** Long enough for a concurrent claimant's metadata write to land. */
const CLAIM_SETTLE_MS = 1_200;

export type FulfillmentResult = {
  status: FulfillmentStatus;
  prodigiOrderId?: string;
  error?: string;
};

export function readFulfillment(pi: Stripe.PaymentIntent): FulfillmentResult {
  const md = pi.metadata ?? {};
  if (md.prodigi_order_id) {
    return { status: 'placed', prodigiOrderId: md.prodigi_order_id };
  }
  if (pi.status !== 'succeeded') return { status: 'awaiting_payment' };
  if (md.fulfillment_status === 'failed') {
    return { status: 'failed', error: md.fulfillment_error };
  }
  return {
    status: md.fulfillment_status === 'placing' ? 'placing' : 'awaiting_payment',
  };
}

function claimIsLive(md: Stripe.Metadata): boolean {
  if (md.fulfillment_status !== 'placing') return false;
  const at = Number(md.fulfillment_claimed_at);
  return Number.isFinite(at) && Date.now() - at < LOCK_TTL_MS;
}

export function buildProdigiOrder(
  draft: OrderDraft,
  paymentIntentId: string,
  origin: string,
) {
  const spec = STYLE_SPECS[draft.style];
  return {
    merchantReference: paymentIntentId,
    shippingMethod: 'Budget',
    recipient: {
      name: draft.address.name,
      email: draft.email,
      address: {
        line1: draft.address.line1,
        line2: draft.address.line2 ?? null,
        townOrCity: draft.address.city,
        stateOrCounty: draft.address.state ?? null,
        postalOrZipCode: draft.address.postalCode,
        countryCode: draft.address.country,
      },
    },
    items: [
      {
        merchantReference: `${paymentIntentId}-tee`,
        sku: spec.sku,
        copies: 1,
        sizing: 'fillPrintArea' as const,
        attributes: prodigiAttributes(draft),
        assets: [
          {
            printArea: 'front',
            url: `${origin}${artworkPath(draft.ts, ARTWORK_PX.width)}`,
          },
        ],
      },
    ],
    metadata: {
      paymentIntentId,
      timestamp: draft.ts,
      style: draft.style,
      size: draft.size,
    },
  };
}

async function recordPlaced(paymentIntentId: string, orderId: string) {
  await stripe().paymentIntents.update(paymentIntentId, {
    metadata: {
      fulfillment_status: 'placed',
      prodigi_order_id: orderId,
      fulfillment_error: '',
      fulfillment_claim: '',
    },
  });
}

export async function fulfill(
  paymentIntent: Stripe.PaymentIntent,
  origin = siteOrigin(),
): Promise<FulfillmentResult> {
  const s = stripe();
  let pi = paymentIntent;

  if (pi.status !== 'succeeded') return { status: 'awaiting_payment' };
  if (pi.metadata?.prodigi_order_id) {
    return { status: 'placed', prodigiOrderId: pi.metadata.prodigi_order_id };
  }
  if (pi.metadata && claimIsLive(pi.metadata)) return { status: 'placing' };

  const draft = metadataToDraft(pi.metadata ?? null);
  if (!draft) {
    const error = 'Order details are missing from this payment';
    await s.paymentIntents
      .update(pi.id, {
        metadata: { fulfillment_status: 'failed', fulfillment_error: error },
      })
      .catch(() => undefined);
    return { status: 'failed', error };
  }

  // --- Claim ---------------------------------------------------------------
  const claim = randomUUID();
  await s.paymentIntents.update(pi.id, {
    metadata: {
      fulfillment_status: 'placing',
      fulfillment_claim: claim,
      fulfillment_claimed_at: String(Date.now()),
      fulfillment_error: '',
    },
  });

  await new Promise((r) => setTimeout(r, CLAIM_SETTLE_MS));

  pi = await s.paymentIntents.retrieve(pi.id);
  if (pi.metadata?.prodigi_order_id) {
    return { status: 'placed', prodigiOrderId: pi.metadata.prodigi_order_id };
  }
  if (pi.metadata?.fulfillment_claim !== claim) {
    // Someone else won the race. Let them finish.
    return { status: 'placing' };
  }

  try {
    // --- Second guard: ask Prodigi whether this payment already has an order.
    const existing = await findOrderByMerchantReference(pi.id).catch((err) => {
      console.warn('[fulfillment] duplicate check failed, continuing', err);
      return null;
    });
    if (existing) {
      await recordPlaced(pi.id, existing.id);
      return { status: 'placed', prodigiOrderId: existing.id };
    }

    const order = await createOrder({
      ...buildProdigiOrder(draft, pi.id, origin),
      idempotencyKey: pi.id,
    });

    await recordPlaced(pi.id, order.id);
    return { status: 'placed', prodigiOrderId: order.id };
  } catch (err) {
    const issues = err instanceof ProdigiError ? blockingIssues(err.issues) : [];
    const error =
      issues[0]?.description ||
      (err instanceof Error ? err.message : 'Could not place the print order');

    // Release the claim so a webhook retry can pick this up again.
    await s.paymentIntents
      .update(pi.id, {
        metadata: {
          fulfillment_status: 'failed',
          fulfillment_error: error.slice(0, 500),
          fulfillment_claim: '',
          fulfillment_claimed_at: '',
        },
      })
      .catch(() => undefined);

    console.error('[fulfillment] failed for', pi.id, error);
    return { status: 'failed', error };
  }
}
