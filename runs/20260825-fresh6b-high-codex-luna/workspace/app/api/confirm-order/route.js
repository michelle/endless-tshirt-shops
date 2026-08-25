import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { fulfillPaymentIntent } from '../../../lib/fulfill.js';

export const runtime = 'nodejs';
const stripe = () => new Stripe(process.env.STRIPE_SECRET_KEY || '');
export async function POST(request) {
  try {
    if (!process.env.STRIPE_SECRET_KEY || !process.env.PRODIGI_API_KEY) return NextResponse.json({ error: 'Fulfillment is not configured.' }, { status: 503 });
    const { paymentIntentId } = await request.json();
    if (!paymentIntentId || !/^pi_[a-zA-Z0-9]+$/.test(paymentIntentId)) return NextResponse.json({ error: 'Invalid payment.' }, { status: 400 });
    const intent = await stripe().paymentIntents.retrieve(paymentIntentId);
    if (intent.status !== 'succeeded') return NextResponse.json({ error: 'Payment has not completed yet.' }, { status: 409 });
    if (intent.amount !== 2250 || intent.currency !== 'usd') return NextResponse.json({ error: 'Invalid payment amount.' }, { status: 400 });
    const artworkOrigin = request.headers.get('origin') || process.env.PUBLIC_URL || `https://${request.headers.get('host')}`;
    const result = await fulfillPaymentIntent(stripe(), intent, artworkOrigin);
    return NextResponse.json(result);
  } catch (error) {
    console.error('confirm-order', error);
    return NextResponse.json({ error: 'We could not finish your print order. Please contact hello@datetime.store.' }, { status: 500 });
  }
}
