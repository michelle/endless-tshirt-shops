import { NextResponse } from 'next/server';

import { fulfillPaymentIntent, toHttpError } from '@/lib/fulfillment';
import { ConfigError, getStripe } from '@/lib/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Called by the browser the moment `confirmPayment` resolves, so the customer
 * gets a print order number without waiting on webhook delivery. The webhook is
 * still the authority — both paths run the same idempotent code.
 */
export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body.' }, { status: 400 });
  }

  const { paymentIntentId, clientSecret } = (payload ?? {}) as Record<string, unknown>;
  if (typeof paymentIntentId !== 'string' || !paymentIntentId.startsWith('pi_')) {
    return NextResponse.json({ error: 'Missing payment reference.' }, { status: 400 });
  }
  if (typeof clientSecret !== 'string' || !clientSecret) {
    return NextResponse.json({ error: 'Missing payment credentials.' }, { status: 400 });
  }

  try {
    const stripe = getStripe();
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ['latest_charge'],
    });

    // The client secret is the customer's proof that this payment is theirs.
    if (paymentIntent.client_secret !== clientSecret) {
      return NextResponse.json({ error: 'Payment credentials do not match.' }, { status: 403 });
    }

    const result = await fulfillPaymentIntent(paymentIntent);
    return NextResponse.json({
      orderId: result.orderId,
      stage: result.stage,
      epochMs: Number(paymentIntent.metadata?.epoch_ms),
      style: paymentIntent.metadata?.style,
      size: paymentIntent.metadata?.size,
    });
  } catch (error) {
    if (error instanceof ConfigError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    const { status, message } = toHttpError(error);
    console.error('[finalize] failed', message);
    return NextResponse.json({ error: message }, { status });
  }
}
