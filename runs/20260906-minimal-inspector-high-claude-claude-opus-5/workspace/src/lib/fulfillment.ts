import type Stripe from 'stripe';
import { siteOrigin } from './env';
import { ProdigiError, blockingIssues, createOrder, getOrder } from './prodigi';
import { stripe } from './stripe';
import {
  SHIPPING_METHOD,
  type ShirtSize,
  type ShirtStyle,
  prodigiItemAttributes,
  skuFor,
} from './product';

export type FulfillmentResult =
  | { state: 'fulfilled'; prodigiOrderId: string; alreadyExisted: boolean }
  | { state: 'skipped'; reason: string }
  | { state: 'failed'; error: string; refunded: boolean };

export function artworkUrl(capturedAt: number, origin = siteOrigin()): string {
  return `${origin}/api/artwork/${capturedAt}.png`;
}

/**
 * Turns a paid (or authorised) PaymentIntent into a Prodigi order.
 *
 * Safe to call more than once: the PaymentIntent's own metadata records the
 * Prodigi order id, and Prodigi additionally de-duplicates on `idempotencyKey`,
 * so a webhook retry racing the browser's fallback call cannot print two
 * shirts.
 */
export async function fulfillPaymentIntent(
  paymentIntent: Stripe.PaymentIntent,
): Promise<FulfillmentResult> {
  const sdk = stripe();
  const existingOrderId = paymentIntent.metadata?.prodigi_order_id;
  if (existingOrderId) {
    return { state: 'fulfilled', prodigiOrderId: existingOrderId, alreadyExisted: true };
  }

  const fulfillable =
    paymentIntent.status === 'requires_capture' || paymentIntent.status === 'succeeded';
  if (!fulfillable) {
    return { state: 'skipped', reason: `payment_intent status is ${paymentIntent.status}` };
  }

  const recipient = recipientFrom(paymentIntent);
  if (!recipient) {
    return { state: 'skipped', reason: 'payment_intent is missing a shipping address' };
  }

  const capturedAt = Number(paymentIntent.metadata?.capturedAt);
  const style = paymentIntent.metadata?.style as ShirtStyle | undefined;
  const size = paymentIntent.metadata?.size as ShirtSize | undefined;
  if (!Number.isSafeInteger(capturedAt) || !style || !size) {
    return { state: 'skipped', reason: 'payment_intent is missing shirt metadata' };
  }

  const origin = paymentIntent.metadata?.origin || siteOrigin();

  try {
    const order = await createOrder({
      idempotencyKey: paymentIntent.id,
      merchantReference: paymentIntent.id,
      shippingMethod: SHIPPING_METHOD,
      callbackUrl: `${origin}/api/webhooks/prodigi`,
      recipient,
      sku: skuFor(style),
      attributes: prodigiItemAttributes(size),
      artworkUrl: artworkUrl(capturedAt, origin),
      metadata: { capturedAt: String(capturedAt), paymentIntent: paymentIntent.id },
    });

    const issues = blockingIssues(order.status?.issues);
    await sdk.paymentIntents.update(paymentIntent.id, {
      metadata: {
        prodigi_order_id: order.id,
        prodigi_stage: order.status?.stage ?? 'InProgress',
        prodigi_issues: issues.length ? summarise(issues) : '',
        fulfillment_state: 'fulfilled',
        fulfillment_error: '',
      },
    });

    // Money moves only once the printer has accepted the job.
    if (paymentIntent.status === 'requires_capture') {
      await capturePaymentIntent(paymentIntent.id);
    }

    return { state: 'fulfilled', prodigiOrderId: order.id, alreadyExisted: false };
  } catch (error) {
    const message = describeError(error);
    console.error('[fulfillment] Prodigi order failed', paymentIntent.id, message, {
      body: error instanceof ProdigiError ? error.body : undefined,
    });

    // Never sit on an authorisation we cannot fulfil: release it.
    let refunded = false;
    try {
      if (paymentIntent.status === 'requires_capture') {
        await sdk.paymentIntents.cancel(paymentIntent.id, { cancellation_reason: 'abandoned' });
        refunded = true;
      } else if (paymentIntent.status === 'succeeded') {
        await sdk.refunds.create({ payment_intent: paymentIntent.id });
        refunded = true;
      }
    } catch (releaseError) {
      console.error('[fulfillment] failed to release payment', paymentIntent.id, releaseError);
    }

    await sdk.paymentIntents
      .update(paymentIntent.id, {
        metadata: {
          fulfillment_state: 'failed',
          fulfillment_error: message.slice(0, 480),
        },
      })
      .catch(() => undefined);

    return { state: 'failed', error: message, refunded };
  }
}

/**
 * The shipping address written by the server at checkout is authoritative: it
 * is the one Prodigi quoted against, and metadata can only be set with a secret
 * key. The PaymentIntent's own `shipping` (attached by the browser at
 * confirmation) is only a fallback.
 */
function recipientFrom(paymentIntent: Stripe.PaymentIntent) {
  const meta = paymentIntent.metadata ?? {};
  const email = paymentIntent.receipt_email ?? undefined;

  if (meta.ship_line1 && meta.ship_city && meta.ship_postal && meta.ship_name) {
    return {
      name: meta.ship_name,
      email,
      address: {
        line1: meta.ship_line1,
        line2: meta.ship_line2 || undefined,
        townOrCity: meta.ship_city,
        stateOrCounty: meta.ship_state || undefined,
        postalOrZipCode: meta.ship_postal,
        countryCode: meta.ship_country || 'US',
      },
    };
  }

  const shipping = paymentIntent.shipping;
  const address = shipping?.address;
  if (!shipping?.name || !address?.line1 || !address.city || !address.postal_code) return null;
  return {
    name: shipping.name,
    email,
    address: {
      line1: address.line1,
      line2: address.line2 ?? undefined,
      townOrCity: address.city,
      stateOrCounty: address.state ?? undefined,
      postalOrZipCode: address.postal_code,
      countryCode: address.country ?? 'US',
    },
  };
}

async function capturePaymentIntent(id: string): Promise<void> {
  try {
    await stripe().paymentIntents.capture(id);
  } catch (error) {
    const code = (error as Stripe.errors.StripeError)?.code;
    // A racing webhook may have captured it already; that is a success, not a bug.
    if (code === 'payment_intent_unexpected_state') return;
    throw error;
  }
}

function summarise(issues: Array<{ errorCode?: string; description?: string }>): string {
  return issues
    .map((issue) => issue.description ?? issue.errorCode ?? 'unknown issue')
    .join('; ')
    .slice(0, 480);
}

export function describeError(error: unknown): string {
  if (error instanceof ProdigiError) {
    const detail =
      typeof error.body === 'string'
        ? error.body
        : error.body
          ? JSON.stringify(error.body)
          : '';
    return `${error.message}${detail ? ` — ${detail}` : ''}`.slice(0, 900);
  }
  if (error instanceof Error) return error.message;
  return String(error);
}

/** Live status for the order-tracking view, refreshed from Prodigi when known. */
export async function orderSnapshot(paymentIntent: Stripe.PaymentIntent) {
  const prodigiOrderId = paymentIntent.metadata?.prodigi_order_id || null;
  let stage = paymentIntent.metadata?.prodigi_stage || null;
  let tracking: { number?: string; url?: string; carrier?: string } | null = null;

  if (prodigiOrderId) {
    try {
      const order = await getOrder(prodigiOrderId);
      if (order) {
        stage = order.status?.stage ?? stage;
        const shipment = order.shipments?.find((s) => s.tracking?.number);
        if (shipment?.tracking?.number) {
          tracking = {
            number: shipment.tracking.number,
            url: shipment.tracking.url,
            carrier: shipment.carrier?.name,
          };
        }
      }
    } catch (error) {
      console.error('[fulfillment] could not refresh Prodigi order', prodigiOrderId, error);
    }
  }

  return {
    orderRef: paymentIntent.id,
    paymentStatus: paymentIntent.status,
    fulfillmentState: paymentIntent.metadata?.fulfillment_state ?? 'pending',
    fulfillmentError: paymentIntent.metadata?.fulfillment_error || null,
    prodigiOrderId,
    prodigiStage: stage,
    tracking,
    capturedAt: Number(paymentIntent.metadata?.capturedAt) || null,
    style: paymentIntent.metadata?.style ?? null,
    size: paymentIntent.metadata?.size ?? null,
    amount: paymentIntent.amount,
    currency: paymentIntent.currency,
  };
}
