import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { PRODUCTS, SIZES } from '@/lib/fulfillment';
export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const { style, size, timestamp } = await request.json();
    if (!PRODUCTS[style] || !SIZES[size] || !Number.isInteger(timestamp) || Math.abs(Date.now() - timestamp) > 60000) return NextResponse.json({ error: 'Please choose a valid shirt and try again.' }, { status: 400 });
    if (!process.env.STRIPE_PRICE_ID) throw new Error('STRIPE_PRICE_ID is not configured');
    const origin = new URL(request.url).origin;
    const session = await getStripe().checkout.sessions.create({ mode: 'payment', line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }], metadata: { style, size, timestamp: String(timestamp), fulfillment: 'scalable_press' }, payment_intent_data: { metadata: { style, size, timestamp: String(timestamp), fulfillment: 'scalable_press' } }, custom_text: { submit: { message: `Your ${style} ${size} shirt will be printed with timestamp ${timestamp}.` } }, shipping_address_collection: { allowed_countries: ['US'] }, billing_address_collection: 'auto', success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`, cancel_url: `${origin}/?canceled=1` }, { idempotencyKey: `checkout-${timestamp}-${style}-${size}` });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('checkout_session_error', error);
    return NextResponse.json({ error: 'Checkout is temporarily unavailable. Please try again.' }, { status: 500 });
  }
}
