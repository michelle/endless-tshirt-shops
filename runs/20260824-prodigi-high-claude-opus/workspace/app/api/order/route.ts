import { timingSafeEqual } from 'node:crypto';
import type Stripe from 'stripe';
import type { NextRequest } from 'next/server';
import { stripe } from '@/lib/stripe';
import { ConfigError } from '@/lib/env';
import { STYLES, PRICE_CENTS } from '@/lib/catalog';
import { describeTimestamp } from '@/lib/timestamp';
import {
  fulfill,
  fulfillmentState,
  readShirtSpec,
  refreshStage,
} from '@/lib/fulfillment';

/**
 * Order status for the confirmation page.
 *
 * Authorization is the PaymentIntent's own client secret, which Stripe hands
 * back to the browser on redirect. Without it, knowing an order id tells you
 * nothing — that keeps someone from enumerating `pi_...` ids and reading other
 * people's shipping addresses.
 *
 * This endpoint also *drives* fulfillment as a fallback. The webhook is the
 * primary trigger, but a shop that only prints when a webhook is wired up is a
 * shop that silently loses orders, so the page the customer lands on will place
 * the Prodigi order itself if it has not happened yet. Both paths are idempotent.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function secretsMatch(expected: string | null, provided: string): boolean {
  if (!expected) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const paymentIntentId = params.get('payment_intent');
  const clientSecret = params.get('payment_intent_client_secret');

  if (!paymentIntentId || !clientSecret) {
    return Response.json(
      { error: 'Both `payment_intent` and `payment_intent_client_secret` are required.' },
      { status: 400 },
    );
  }

  try {
    let intent: Stripe.PaymentIntent = await stripe().paymentIntents.retrieve(
      paymentIntentId,
    );

    if (!secretsMatch(intent.client_secret, clientSecret)) {
      return Response.json({ error: 'Order not found.' }, { status: 404 });
    }

    if (intent.status === 'succeeded' && fulfillmentState(intent).status !== 'fulfilled') {
      ({ intent } = await fulfill(intent));
    }

    const state = fulfillmentState(intent);
    const spec = readShirtSpec(intent);
    const stage = await refreshStage(state);

    return Response.json({
      paymentIntentId: intent.id,
      paymentStatus: intent.status,
      paid: intent.status === 'succeeded',
      amount: intent.amount ?? PRICE_CENTS,
      currency: intent.currency,
      email: intent.receipt_email,
      shirt: spec && {
        timestampMs: spec.timestampMs,
        timestampIso: describeTimestamp(spec.timestampMs),
        style: spec.style,
        styleLabel: STYLES[spec.style].label,
        garment: STYLES[spec.style].garment,
        size: spec.size,
      },
      shipTo: intent.shipping?.name ?? null,
      fulfillment: {
        status: state.status,
        prodigiOrderId: state.status === 'fulfilled' ? state.prodigiOrderId : null,
        stage: stage ?? (state.status === 'fulfilled' ? state.stage : null) ?? null,
        dryRun: state.status === 'fulfilled' ? state.dryRun : false,
        error: state.status === 'failed' ? state.error : null,
      },
    });
  } catch (error) {
    if (error instanceof ConfigError) {
      return Response.json({ error: 'The shop is not fully configured.' }, { status: 503 });
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[order] lookup failed', message);
    return Response.json({ error: 'Could not load that order.' }, { status: 502 });
  }
}
