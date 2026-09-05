import type Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { fulfilSession } from '@/lib/fulfill';
import { getBaseUrl } from '@/lib/urls';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Stripe -> Prodigi. The moment a Checkout Session is paid, we place the print
 * order.
 *
 * This is the primary fulfilment path. The order-status endpoint is a backstop
 * for when a webhook is delayed, retried, or not configured at all; both share
 * the same idempotent `fulfilSession`.
 */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[webhook] STRIPE_WEBHOOK_SECRET is not set; refusing to process events');
    return NextResponse.json({ error: 'Webhook not configured.' }, { status: 500 });
  }

  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header.' }, { status: 400 });
  }

  // The signature is computed over the exact bytes Stripe sent, so the body
  // must be read raw and never re-serialised.
  const payload = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe().webhooks.constructEventAsync(payload, signature, secret);
  } catch (err) {
    console.error('[webhook] signature verification failed', err);
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        // The event payload omits some fields we need, so re-read the session
        // with the shipping details expanded.
        const session = await stripe().checkout.sessions.retrieve(
          (event.data.object as Stripe.Checkout.Session).id,
          { expand: ['payment_intent'] },
        );
        const result = await fulfilSession(session, await getBaseUrl());
        console.log('[webhook]', event.type, session.id, '->', result.state);
        break;
      }
      default:
        // Everything else is acknowledged and ignored on purpose.
        break;
    }
  } catch (err) {
    // Returning 500 asks Stripe to retry, which is what we want for transient
    // failures (Prodigi down, network blip).
    console.error('[webhook] handler threw for', event.type, err);
    return NextResponse.json({ error: 'Handler failed.' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
