/**
 * Stripe webhook. The primary fulfilment trigger.
 *
 * The /success page also calls fulfil() as a fallback, so a missing webhook
 * degrades to "the shirt is ordered when the customer lands on the receipt"
 * rather than "the shirt is never ordered".
 */

import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { fulfil, retrieveSession } from '@/lib/fulfil';
import { siteOrigin } from '@/lib/site';
import { stripe } from '@/lib/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[webhook] STRIPE_WEBHOOK_SECRET is not set; refusing unverified events');
    return NextResponse.json({ error: 'Webhook not configured.' }, { status: 503 });
  }

  const signature = req.headers.get('stripe-signature');
  if (!signature) return NextResponse.json({ error: 'Missing signature.' }, { status: 400 });

  const payload = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe().webhooks.constructEventAsync(payload, signature, secret);
  } catch (err) {
    console.error('[webhook] signature verification failed', err);
    return NextResponse.json({ error: 'Bad signature.' }, { status: 400 });
  }

  if (event.type !== 'checkout.session.completed' && event.type !== 'checkout.session.async_payment_succeeded') {
    return NextResponse.json({ received: true, ignored: event.type });
  }

  const sessionId = (event.data.object as Stripe.Checkout.Session).id;

  try {
    // Re-fetch so we get the expanded PaymentIntent the idempotency check needs.
    const session = await retrieveSession(sessionId);
    const result = await fulfil(session, siteOrigin(req));

    if (result.status === 'failed') {
      // 500 asks Stripe to retry; the failure is usually transient (Prodigi 5xx).
      console.error('[webhook] fulfilment failed', sessionId, result.error);
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    console.log('[webhook] fulfilled', sessionId, result);
    return NextResponse.json({ received: true, ...result });
  } catch (err) {
    console.error('[webhook] unexpected error', err);
    return NextResponse.json({ error: 'Fulfilment error.' }, { status: 500 });
  }
}
