import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { siteOrigin } from '@/lib/env';
import { fulfill } from '@/lib/fulfillment';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * The durable half of fulfilment. If the buyer closes the tab mid-redirect, or
 * a wallet payment settles asynchronously, this is what still prints the shirt.
 */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[webhook] STRIPE_WEBHOOK_SECRET is not configured');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  const payload = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe().webhooks.constructEventAsync(payload, signature, secret);
  } catch (err) {
    console.error('[webhook] signature verification failed', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const intent = event.data.object as Stripe.PaymentIntent;
        if (intent.metadata?.product !== 'datetime-tee') break;
        const result = await fulfill(intent, siteOrigin(req));
        console.log('[webhook] fulfilled', intent.id, result.status, result.prodigiOrderId ?? '');
        break;
      }
      case 'payment_intent.payment_failed': {
        const intent = event.data.object as Stripe.PaymentIntent;
        console.warn(
          '[webhook] payment failed',
          intent.id,
          intent.last_payment_error?.message,
        );
        break;
      }
      default:
        break;
    }
  } catch (err) {
    // 500 makes Stripe retry with backoff, which is what we want for a
    // transient Prodigi outage.
    console.error('[webhook] handler error', event.type, err);
    return NextResponse.json({ error: 'Handler error' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
