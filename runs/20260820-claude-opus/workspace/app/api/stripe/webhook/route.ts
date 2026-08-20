/**
 * POST /api/stripe/webhook
 *
 * Server-authoritative fulfillment. The browser also calls /api/fulfill, but a
 * customer who closes the tab mid-redirect must still get their shirt, so this
 * is the backstop. Both paths funnel into the same idempotent routine.
 *
 * Requires STRIPE_WEBHOOK_SECRET; without it the endpoint refuses requests
 * rather than trusting unsigned input.
 */

import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { env } from '@/lib/env';
import { fulfillPaymentIntent } from '@/lib/fulfillment';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request) {
  const secret = env.stripeWebhookSecret;
  if (!secret) {
    console.error('[webhook] STRIPE_WEBHOOK_SECRET is not configured');
    return NextResponse.json({ error: 'Webhooks are not configured.' }, { status: 500 });
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header.' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const payload = await request.text();
    event = stripe().webhooks.constructEvent(payload, signature, secret);
  } catch (error) {
    console.error('[webhook] signature verification failed', error);
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent;
        const result = await fulfillPaymentIntent(pi.id);
        console.log('[webhook] fulfilled', pi.id, result.state, result.orderId ?? '');
        break;
      }
      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent;
        console.warn('[webhook] payment failed', pi.id, pi.last_payment_error?.message);
        break;
      }
      default:
        break;
    }
  } catch (error) {
    // Returning 500 asks Stripe to retry, which is what we want for a
    // transient print-partner failure.
    console.error('[webhook] handler error', event.type, error);
    return NextResponse.json({ error: 'Handler failed.' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
