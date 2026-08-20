import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { fulfillCheckout } from '@/lib/fulfillment';
export const runtime = 'nodejs';
export const maxDuration = 60;
export async function POST(request) {
  try {
    if (!process.env.STRIPE_WEBHOOK_SECRET) throw new Error('Webhook secret is not configured');
    const event = getStripe().webhooks.constructEvent(await request.text(), request.headers.get('stripe-signature'), process.env.STRIPE_WEBHOOK_SECRET);
    if (event.type === 'checkout.session.completed' && event.data.object.payment_status === 'paid') await fulfillCheckout(event.data.object.id);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('webhook_error', error);
    return NextResponse.json({ error: 'Webhook rejected' }, { status: 400 });
  }
}
