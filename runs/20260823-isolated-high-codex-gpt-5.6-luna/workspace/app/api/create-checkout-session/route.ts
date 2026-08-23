import { NextResponse } from 'next/server';
import Stripe from 'stripe';

export const runtime = 'nodejs';

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-07-29.dahlia' }) : null;
const fits = new Set(['fitted', 'unisex']);
const sizes = new Set(['S', 'M', 'L', 'XL']);

export async function POST(request: Request) {
  try {
    if (!stripe) return NextResponse.json({ error: 'Stripe is not configured.' }, { status: 503 });
    const body = await request.json();
    const fit = typeof body.fit === 'string' && fits.has(body.fit) ? body.fit : null;
    const size = typeof body.size === 'string' && sizes.has(body.size) ? body.size : null;
    const timestamp = typeof body.timestamp === 'string' && !Number.isNaN(Date.parse(body.timestamp)) ? body.timestamp : new Date().toISOString();
    if (!fit || !size) return NextResponse.json({ error: 'Please choose a fit and size.' }, { status: 400 });

    const origin = process.env.NEXT_PUBLIC_STORE_URL || request.headers.get('origin') || 'http://localhost:3000';
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'usd',
          unit_amount: 2250,
          product_data: {
            name: `datetime tee / ${fit} / ${size}`,
            description: 'A black t-shirt printed with the current datetime.',
          },
        },
        quantity: 1,
      }],
      shipping_address_collection: { allowed_countries: ['US', 'CA', 'GB', 'AU'] },
      shipping_options: [{ shipping_rate_data: { type: 'fixed_amount', fixed_amount: { amount: 0, currency: 'usd' }, display_name: 'Free shipping', delivery_estimate: { minimum: { unit: 'business_day', value: 7 }, maximum: { unit: 'business_day', value: 10 } } } }],
      customer_creation: 'always',
      billing_address_collection: 'auto',
      submit_type: 'pay',
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cancel`,
      metadata: { fit, size, timestamp_utc: timestamp, fulfillment_status: 'pending' },
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('checkout session error', error);
    return NextResponse.json({ error: 'Checkout could not be started. Please try again.' }, { status: 500 });
  }
}
