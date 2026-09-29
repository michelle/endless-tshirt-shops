// Stripe webhook. checkout.session.completed is the trigger that sends the
// shirt to Prodigi — nothing is printed before Stripe confirms payment.
import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { fulfillPaidSession } from '@/lib/fulfillment';
import { stripe } from '@/lib/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'STRIPE_WEBHOOK_SECRET is not set' }, { status: 500 });
  }
  const sig = req.headers.get('stripe-signature');
  if (!sig) {
    return NextResponse.json({ error: 'missing stripe-signature header' }, { status: 400 });
  }

  const payload = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(payload, sig, secret);
  } catch (e) {
    console.error('webhook signature verification failed', e);
    return NextResponse.json({ error: `invalid signature: ${(e as Error).message}` }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const result = await fulfillPaidSession(session.id);
    console.log(`fulfilment for ${session.id}:`, JSON.stringify(result));
    if (result.status === 'error') {
      // Return 500 so Stripe retries the delivery; the order-status page also
      // reconciles as a fallback.
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
