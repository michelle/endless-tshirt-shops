import { NextResponse } from 'next/server';
import Stripe from 'stripe';

export const runtime = 'nodejs';
const stripe = () => new Stripe(process.env.STRIPE_SECRET_KEY || '');
const allowedStyles = new Set(['fitted', 'unisex']);
const allowedSizes = new Set(['S', 'M', 'L', 'XL']);

export async function POST(request) {
  try {
    const { style, size, timestamp, details } = await request.json();
    if (!allowedStyles.has(style) || !allowedSizes.has(size) || !Number.isSafeInteger(timestamp) || timestamp > Date.now() + 60_000) return NextResponse.json({ error: 'Invalid order details.' }, { status: 400 });
    const required = ['name', 'address', 'city', 'state', 'postalCode', 'email'];
    if (!details || required.some((key) => !String(details[key] || '').trim())) return NextResponse.json({ error: 'Please complete all shipping and receipt fields.' }, { status: 400 });
    if (!/^\S+@\S+\.\S+$/.test(details.email)) return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    const paymentIntentId = request.headers.get('x-payment-intent-id') || details.paymentIntentId;
    // The client sends the ID in a body-safe header when available; the fallback is not used by the app.
    if (!paymentIntentId) return NextResponse.json({ error: 'Checkout session expired. Please start again.' }, { status: 400 });
    const intent = await stripe().paymentIntents.retrieve(paymentIntentId);
    if (intent.amount !== 2250 || intent.currency !== 'usd') return NextResponse.json({ error: 'Invalid payment amount.' }, { status: 400 });
    const updated = await stripe().paymentIntents.update(paymentIntentId, {
      receipt_email: details.email,
      shipping: { name: details.name.trim(), address: { line1: details.address.trim(), line2: details.apartment?.trim() || undefined, city: details.city.trim(), state: details.state.trim(), postal_code: details.postalCode.trim(), country: 'US' } },
      metadata: { product: 'datetime-tee', style, size, timestamp: String(timestamp) },
    });
    return NextResponse.json({ paymentIntentId: updated.id });
  } catch (error) {
    console.error('prepare-payment', error);
    return NextResponse.json({ error: 'Unable to prepare your payment.' }, { status: 500 });
  }
}
