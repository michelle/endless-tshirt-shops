import { NextResponse } from 'next/server';
import Stripe from 'stripe';

export const runtime = 'nodejs';
const stripe = () => new Stripe(process.env.STRIPE_SECRET_KEY || '');
const allowedStyles = new Set(['fitted', 'unisex']);
const allowedSizes = new Set(['S', 'M', 'L', 'XL']);

export async function POST(request) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) return NextResponse.json({ error: 'Stripe is not configured.' }, { status: 503 });
    const { style = 'fitted', size = 'M' } = await request.json();
    if (!allowedStyles.has(style) || !allowedSizes.has(size)) return NextResponse.json({ error: 'Invalid product selection.' }, { status: 400 });
    const intent = await stripe().paymentIntents.create({
      amount: 2250,
      currency: 'usd',
      automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
      description: 'datetime.store tee',
      metadata: { product: 'datetime-tee', style, size },
    });
    return NextResponse.json({ clientSecret: intent.client_secret, paymentIntentId: intent.id });
  } catch (error) {
    console.error('create-payment-intent', error);
    return NextResponse.json({ error: 'Unable to start secure checkout.' }, { status: 500 });
  }
}
