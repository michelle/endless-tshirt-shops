import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { fulfill } from '@/lib/fulfill';
import { log } from '@/lib/log';
import { isOurOrder, stripe } from '@/lib/stripe';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Stripe webhook. `payment_intent.succeeded` is the fulfilment trigger.
 *
 * We return 200 as soon as the work is done or provably retryable. Returning
 * non-2xx makes Stripe retry with backoff, which is what we want for a transient
 * Scalable Press outage.
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    log.error('webhook.no_secret');
    return NextResponse.json({ error: 'Webhook not configured.' }, { status: 500 });
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) return NextResponse.json({ error: 'Missing signature.' }, { status: 400 });

  const raw = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(raw, signature, secret);
  } catch (err) {
    log.warn('webhook.bad_signature', { message: (err as Error).message });
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 });
  }

  log.info('webhook.received', { type: event.type, id: event.id });

  switch (event.type) {
    case 'payment_intent.succeeded': {
      const pi = event.data.object;
      if (!isOurOrder(pi)) {
        // Another application on the same Stripe account. Acknowledge so Stripe
        // stops redelivering, but do not touch it.
        log.info('webhook.not_our_order', { paymentIntent: pi.id });
        return NextResponse.json({ received: true, ignored: 'foreign_payment_intent' });
      }
      const state = await fulfill(pi);
      if (state.status === 'placing') {
        // Not fulfilled yet and worth another go — ask Stripe to redeliver.
        log.warn('webhook.fulfillment_deferred', { paymentIntent: pi.id });
        return NextResponse.json({ received: true, retry: true }, { status: 503 });
      }
      return NextResponse.json({ received: true, state });
    }

    case 'payment_intent.payment_failed': {
      const pi = event.data.object;
      log.warn('webhook.payment_failed', {
        paymentIntent: pi.id,
        code: pi.last_payment_error?.code,
        message: pi.last_payment_error?.message,
      });
      return NextResponse.json({ received: true });
    }

    case 'charge.refunded':
    case 'charge.dispute.created': {
      // The shirt is already printing by now; a human needs to look at these.
      log.warn('webhook.needs_attention', { type: event.type, id: event.id });
      return NextResponse.json({ received: true });
    }

    default:
      return NextResponse.json({ received: true, ignored: event.type });
  }
}
