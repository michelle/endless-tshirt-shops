import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { fulfillPaymentIntent } from '../../../lib/fulfill.js';

export const runtime = 'nodejs';
const stripe = () => new Stripe(process.env.STRIPE_SECRET_KEY || '');

export async function POST(request) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) return NextResponse.json({ error: 'Webhook is not configured.' }, { status: 503 });
  try {
    const event = stripe().webhooks.constructEvent(await request.text(), request.headers.get('stripe-signature'), process.env.STRIPE_WEBHOOK_SECRET);
    if (event.type === 'payment_intent.succeeded') {
      const intent = await stripe().paymentIntents.retrieve(event.data.object.id);
      const artworkOrigin = process.env.PUBLIC_URL || `https://${request.headers.get('host')}`;
      await fulfillPaymentIntent(stripe(), intent, artworkOrigin);
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('stripe-webhook', error);
    return NextResponse.json({ error: 'Invalid webhook.' }, { status: 400 });
  }
}
