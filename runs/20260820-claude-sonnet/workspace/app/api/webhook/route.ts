import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { fulfillCheckoutSession } from '@/lib/fulfill';

export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const signature = req.headers.get('stripe-signature');
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    if (!signature || !secret) throw new Error('Missing webhook signature or secret');
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    console.error('[webhook] signature verification failed', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    await fulfillCheckoutSession(event.data.object as Stripe.Checkout.Session);
  }

  return NextResponse.json({ received: true });
}
