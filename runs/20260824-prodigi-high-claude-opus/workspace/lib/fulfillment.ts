/**
 * Turning a paid Stripe PaymentIntent into a Prodigi print order.
 *
 * There is no database. The PaymentIntent *is* the order record:
 *
 *   metadata.timestamp_ms   the number printed on the shirt
 *   metadata.style / size   what to print it on
 *   metadata.prodigi_order_id   set once fulfillment succeeds
 *   metadata.fulfillment_error  set when it fails, so support can see why
 *
 * That keeps the deployment stateless and means the Stripe dashboard is the
 * order dashboard. It is also why fulfillment must be idempotent: it can be
 * driven either by the `payment_intent.succeeded` webhook or lazily by the order
 * page, whichever gets there first.
 */

import type Stripe from 'stripe';
import { stripe } from './stripe';
import { artworkUrl } from './artwork';
import { baseUrl } from './env';
import { env } from './env';
import { createOrder, getOrder, type ProdigiRecipient } from './prodigi';
import {
  isShirtSize,
  isShirtStyle,
  type ShirtSize,
  type ShirtStyle,
} from './catalog';

export type ShirtSpec = {
  timestampMs: number;
  style: ShirtStyle;
  size: ShirtSize;
};

export type FulfillmentState =
  | { status: 'fulfilled'; prodigiOrderId: string; stage?: string; dryRun: boolean }
  | { status: 'pending' }
  | { status: 'failed'; error: string };

export function readShirtSpec(intent: Stripe.PaymentIntent): ShirtSpec | null {
  const timestampMs = Number(intent.metadata.timestamp_ms);
  const style = intent.metadata.style;
  const size = intent.metadata.size;
  if (!Number.isFinite(timestampMs) || !isShirtStyle(style) || !isShirtSize(size)) {
    return null;
  }
  return { timestampMs, style, size };
}

export function fulfillmentState(intent: Stripe.PaymentIntent): FulfillmentState {
  const prodigiOrderId = intent.metadata.prodigi_order_id;
  if (prodigiOrderId) {
    return {
      status: 'fulfilled',
      prodigiOrderId,
      stage: intent.metadata.prodigi_stage || undefined,
      dryRun: intent.metadata.prodigi_dry_run === 'true',
    };
  }
  if (intent.metadata.fulfillment_error) {
    return { status: 'failed', error: intent.metadata.fulfillment_error };
  }
  return { status: 'pending' };
}

/** Stripe shipping details -> Prodigi recipient. */
function toRecipient(intent: Stripe.PaymentIntent): ProdigiRecipient | null {
  const shipping = intent.shipping;
  const address = shipping?.address;
  if (!shipping?.name || !address?.line1 || !address.city || !address.country) {
    return null;
  }
  return {
    name: shipping.name,
    email: intent.receipt_email ?? null,
    phoneNumber: shipping.phone ?? null,
    address: {
      line1: address.line1,
      line2: address.line2 || null,
      townOrCity: address.city,
      stateOrCounty: address.state || null,
      postalOrZipCode: address.postal_code ?? '',
      countryCode: address.country,
    },
  };
}

async function annotate(
  intentId: string,
  metadata: Record<string, string | null>,
): Promise<Stripe.PaymentIntent> {
  return stripe().paymentIntents.update(intentId, { metadata });
}

/** Stripe metadata values cap out at 500 characters. */
function describeError(error: unknown): string {
  return (error instanceof Error ? error.message : String(error)).slice(0, 480);
}

/**
 * Idempotently place the Prodigi order for a paid PaymentIntent.
 *
 * Safe to call repeatedly and concurrently: the fast path is a metadata check,
 * and the slow path passes the PaymentIntent id to Prodigi as an idempotency
 * key, so a duplicate submission returns the original order instead of printing
 * a second shirt.
 */
export async function fulfill(
  intent: Stripe.PaymentIntent,
): Promise<{ state: FulfillmentState; intent: Stripe.PaymentIntent }> {
  const existing = fulfillmentState(intent);
  if (existing.status === 'fulfilled') {
    return { state: existing, intent };
  }

  if (intent.status !== 'succeeded') {
    return { state: { status: 'pending' }, intent };
  }

  const spec = readShirtSpec(intent);
  if (!spec) {
    const error = 'PaymentIntent is missing shirt metadata (timestamp_ms/style/size).';
    return { state: { status: 'failed', error }, intent: await annotate(intent.id, { fulfillment_error: error }) };
  }

  const recipient = toRecipient(intent);
  if (!recipient) {
    const error = 'PaymentIntent has no usable shipping address.';
    return { state: { status: 'failed', error }, intent: await annotate(intent.id, { fulfillment_error: error }) };
  }

  const item = {
    style: spec.style,
    size: spec.size,
    artworkUrl: artworkUrl(baseUrl(), spec.timestampMs),
    reference: `datetime-${spec.timestampMs}`,
  };

  try {
    if (env.prodigiDryRun) {
      const updated = await annotate(intent.id, {
        prodigi_order_id: `dryrun_${intent.id}`,
        prodigi_stage: 'DryRun',
        prodigi_dry_run: 'true',
        fulfillment_error: null,
      });
      return {
        state: { status: 'fulfilled', prodigiOrderId: `dryrun_${intent.id}`, stage: 'DryRun', dryRun: true },
        intent: updated,
      };
    }

    const order = await createOrder({
      item,
      recipient,
      idempotencyKey: intent.id,
      merchantReference: intent.id,
      metadata: {
        stripe_payment_intent: intent.id,
        timestamp_ms: spec.timestampMs,
        shirt_style: spec.style,
        shirt_size: spec.size,
      },
    });

    const updated = await annotate(intent.id, {
      prodigi_order_id: order.id,
      prodigi_stage: order.stage,
      prodigi_outcome: order.outcome,
      prodigi_dry_run: 'false',
      fulfillment_error: null,
    });

    return {
      state: { status: 'fulfilled', prodigiOrderId: order.id, stage: order.stage, dryRun: false },
      intent: updated,
    };
  } catch (error) {
    const message = describeError(error);
    console.error('[fulfillment] failed', intent.id, message);
    // Recorded, not thrown: the customer has paid, and a human (or a retried
    // webhook) needs to be able to see and resolve this.
    const updated = await annotate(intent.id, { fulfillment_error: message }).catch(() => intent);
    return { state: { status: 'failed', error: message }, intent: updated };
  }
}

/** Best-effort refresh of the Prodigi production stage for an order page. */
export async function refreshStage(state: FulfillmentState): Promise<string | undefined> {
  if (state.status !== 'fulfilled' || state.dryRun) return undefined;
  try {
    const order = await getOrder(state.prodigiOrderId);
    return order.stage;
  } catch {
    return state.stage;
  }
}
