import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { fulfilSession } from '@/lib/fulfill';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * The authoritative fulfilment trigger. Nothing reaches Prodigi until Stripe
 * tells us the money moved.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error('STRIPE_WEBHOOK_SECRET is not set; refusing webhook');
    return NextResponse.json({ error: 'Webhook not configured.' }, { status: 500 });
  }

  const signature = req.headers.get('stripe-signature');
  if (!signature) return NextResponse.json({ error: 'Missing signature.' }, { status: 400 });

  const raw = await req.text();

  let event;
  try {
    event = stripe().webhooks.constructEvent(raw, signature, secret);
  } catch (err) {
    console.error('webhook signature verification failed', err);
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 });
  }

  try {
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      const session = event.data.object as { id: string };
      const result = await fulfilSession(session.id);
      console.log('fulfilment', session.id, result.state);
    }
  } catch (err) {
    // A 500 asks Stripe to retry, which is what we want for a transient failure.
    console.error('webhook handling failed', err);
    return NextResponse.json({ error: 'Handler failed.' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
