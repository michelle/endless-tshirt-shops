import { NextResponse } from 'next/server';
import { required, safeError, storeId, stripeClient } from '@/lib/server';
import { fulfillSession, recordFulfillmentFailure } from '@/lib/fulfillment';
import type Stripe from 'stripe';
export const runtime = 'nodejs';
export const maxDuration = 60;
export async function POST(request: Request) {
  let event: Stripe.Event;
  try { event = stripeClient().webhooks.constructEvent(await request.text(), request.headers.get('stripe-signature') || '', required('STRIPE_WEBHOOK_SECRET')); }
  catch (error) { safeError('webhook_signature_failed', error); return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 }); }
  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.metadata?.store_id !== storeId() || session.payment_status !== 'paid') return NextResponse.json({ received: true });
    try { await fulfillSession(session.id); }
    catch (error) { await recordFulfillmentFailure(session.id, error); return NextResponse.json({ error: 'Fulfillment pending. Retry delivery.' }, { status: 500 }); }
  }
  return NextResponse.json({ received: true });
}
