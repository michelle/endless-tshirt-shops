import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { fulfillCheckoutSession } from '@/lib/fulfill';
import { originFromRequest } from '@/lib/origin';

export const runtime = 'nodejs';

/**
 * Stripe webhook. Optional: the /success page also fulfils idempotently, so the
 * store works without a webhook. Set STRIPE_WEBHOOK_SECRET to enable signature
 * verification (recommended for production).
 */
export async function POST(req: Request) {
  const stripe = getStripe();
  const raw = await req.text();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: Stripe.Event;
  if (secret) {
    const sig = req.headers.get('stripe-signature') || '';
    try {
      event = stripe.webhooks.constructEvent(raw, sig, secret);
    } catch (err) {
      console.error('webhook signature error:', (err as Error).message);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }
  } else {
    try {
      event = JSON.parse(raw) as Stripe.Event;
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
  }

  if (
    event.type === 'checkout.session.completed' ||
    event.type === 'checkout.session.async_payment_succeeded'
  ) {
    const session = event.data.object as Stripe.Checkout.Session;
    try {
      const result = await fulfillCheckoutSession(session.id, originFromRequest(req));
      console.log('webhook fulfilment:', session.id, result.state, result.orderId || '');
    } catch (err) {
      console.error('webhook fulfilment error:', err);
      return NextResponse.json({ error: 'Fulfilment failed' }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
