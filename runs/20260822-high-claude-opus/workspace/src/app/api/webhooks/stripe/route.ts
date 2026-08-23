/**
 * POST /api/webhooks/stripe
 *
 * The authoritative fulfillment trigger. Stripe tells us the money landed and
 * we send the shirt to the printer.
 *
 * Configure with:
 *   stripe listen --forward-to <origin>/api/webhooks/stripe
 * or a dashboard endpoint subscribed to payment_intent.succeeded.
 */

import { NextResponse } from 'next/server';
import type Stripe from 'stripe';

import { stripe } from '@/lib/stripe';
import { fulfillPaymentIntent } from '@/lib/fulfill';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get('stripe-signature');
  const raw = await request.text();

  if (!secret) {
    console.error('[webhook] STRIPE_WEBHOOK_SECRET is not set; refusing event.');
    return NextResponse.json({ error: 'Webhook not configured.' }, { status: 500 });
  }
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature.' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(raw, signature, secret);
  } catch (err) {
    console.error('[webhook] signature verification failed', err);
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 });
  }

  switch (event.type) {
    case 'payment_intent.succeeded': {
      const intent = event.data.object as Stripe.PaymentIntent;
      const result = await fulfillPaymentIntent(intent);
      if (result.status === 'failed') {
        // Non-2xx makes Stripe retry with backoff, which is what we want.
        return NextResponse.json(
          { error: result.error, orderToken: result.orderToken },
          { status: 500 },
        );
      }
      return NextResponse.json({ received: true, fulfillment: result.status });
    }

    case 'payment_intent.payment_failed': {
      const intent = event.data.object as Stripe.PaymentIntent;
      console.log('[webhook] payment failed', {
        paymentIntent: intent.id,
        reason: intent.last_payment_error?.message,
      });
      return NextResponse.json({ received: true });
    }

    default:
      return NextResponse.json({ received: true, ignored: event.type });
  }
}
