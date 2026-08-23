import { NextResponse } from 'next/server';
import type Stripe from 'stripe';

import { fulfill } from '@/lib/fulfillment';
import { stripe } from '@/lib/stripe';

/**
 * The authoritative fulfilment trigger. The browser also pokes /api/order, but
 * this is the path that works when the customer closes the tab, and it's what
 * makes Stripe's automatic retries our retry mechanism too: if fulfilment can't
 * complete we return 500 and Stripe redelivers.
 */

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[webhook] STRIPE_WEBHOOK_SECRET is not configured');
    return NextResponse.json({ error: 'not configured' }, { status: 500 });
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'missing signature' }, { status: 400 });
  }

  const payload = await request.text();
  let event: Stripe.Event;
  try {
    event = await stripe().webhooks.constructEventAsync(payload, signature, secret);
  } catch (cause) {
    console.warn('[webhook] signature verification failed:', (cause as Error).message);
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 });
  }

  if (event.type !== 'payment_intent.succeeded') {
    return NextResponse.json({ received: true, ignored: event.type });
  }

  const paymentIntent = event.data.object as Stripe.PaymentIntent;

  try {
    const outcome = await fulfill(paymentIntent.id);
    console.log(`[webhook] ${paymentIntent.id} -> ${outcome.status}`);

    if (outcome.status === 'deferred') {
      // Ask Stripe to send this event again; its backoff is our retry schedule.
      return NextResponse.json(
        { received: true, outcome: outcome.status, retry: true },
        { status: 500 },
      );
    }
    return NextResponse.json({ received: true, outcome: outcome.status });
  } catch (cause) {
    console.error('[webhook] fulfilment threw:', (cause as Error).message);
    return NextResponse.json({ error: 'fulfilment failed' }, { status: 500 });
  }
}
