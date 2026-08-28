import { NextResponse, type NextRequest } from 'next/server';
import type Stripe from 'stripe';

import { fulfillSession } from '@/lib/fulfill';
import { siteOrigin } from '@/lib/site';
import { stripe } from '@/lib/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Authoritative fulfilment trigger.
 *
 * Requires STRIPE_WEBHOOK_SECRET. Unsigned requests are rejected rather than
 * trusted — without that check anyone could POST a session id and make us print
 * shirts for free.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[webhook] STRIPE_WEBHOOK_SECRET is not set; refusing to process');
    return NextResponse.json({ error: 'Webhook secret not configured.' }, { status: 500 });
  }

  const signature = req.headers.get('stripe-signature');
  if (!signature) return NextResponse.json({ error: 'Missing signature.' }, { status: 400 });

  const raw = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe().webhooks.constructEventAsync(raw, signature, secret);
  } catch (err) {
    console.error('[webhook] bad signature', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    const session = event.data.object as Stripe.Checkout.Session;
    const origin = await siteOrigin();
    const result = await fulfillSession(session.id, origin);
    console.log('[webhook]', event.type, session.id, '->', result.state);

    // A Prodigi outage must not make Stripe give up on the event; ask for a retry.
    if (result.state === 'failed') {
      return NextResponse.json({ received: true, state: result.state }, { status: 500 });
    }
    return NextResponse.json({ received: true, state: result.state });
  }

  return NextResponse.json({ received: true, ignored: event.type });
}
