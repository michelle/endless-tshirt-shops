/**
 * Stripe webhook — the safety net for charged-but-unfulfilled orders.
 *
 * If the customer's browser dies between confirming the card and calling
 * /api/order, `payment_intent.succeeded` still arrives here and fulfillment
 * runs. fulfillPaymentIntent is idempotent, so the common case (browser already
 * fulfilled it) is a cheap no-op.
 *
 * Configure with:
 *   stripe listen --forward-to <url>/api/webhook   (local)
 *   STRIPE_WEBHOOK_SECRET=whsec_...                (deployed)
 */

import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { fulfillPaymentIntent } from '@/lib/fulfill';
import { stripe } from '@/lib/stripe';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    // Fail closed: without a secret we cannot tell Stripe from anyone else.
    return NextResponse.json({ error: 'Webhooks are not configured.' }, { status: 501 });
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature.' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const payload = await request.text();
    event = await stripe().webhooks.constructEventAsync(payload, signature, secret);
  } catch (error) {
    console.error('[webhook] signature verification failed', error);
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 });
  }

  if (event.type !== 'payment_intent.succeeded') {
    return NextResponse.json({ received: true, ignored: event.type });
  }

  const intent = event.data.object as Stripe.PaymentIntent;
  try {
    const result = await fulfillPaymentIntent(intent);
    if (!result.alreadyFulfilled) {
      console.log('[webhook] fulfilled', intent.id, '->', result.orderId);
    }
    return NextResponse.json({ received: true, orderId: result.orderId });
  } catch (error) {
    // 500 asks Stripe to retry with backoff, which is what we want for a
    // transient print-partner outage.
    console.error('[webhook] fulfillment failed for', intent.id, error);
    return NextResponse.json({ error: 'Fulfillment failed.' }, { status: 500 });
  }
}
