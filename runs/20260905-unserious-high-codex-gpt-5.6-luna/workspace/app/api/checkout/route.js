import { NextResponse } from 'next/server';
import { getStripe } from '../../../lib/stripe';

const PRICE = 2250;
const ALLOWED_STYLES = new Set(['fitted', 'unisex']);
const ALLOWED_SIZES = new Set(['S', 'M', 'L', 'XL']);

export async function POST(request) {
  try {
    const body = await request.json();
    const style = ALLOWED_STYLES.has(body.style) ? body.style : 'fitted';
    const size = ALLOWED_SIZES.has(body.size) ? body.size : 'M';
    const timestamp = String(body.timestamp || Date.now()).replace(/[^0-9]/g, '').slice(0, 16) || String(Date.now());
    const stripe = getStripe();
    const origin = process.env.NEXT_PUBLIC_SITE_URL || request.headers.get('origin') || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'usd',
          unit_amount: PRICE,
          product_data: {
            name: 'The current datetime T-shirt',
            description: `${style === 'fitted' ? 'Fitted' : 'Unisex'} / ${size} / printed at checkout`,
          },
        },
        quantity: 1,
      }],
      shipping_address_collection: { allowed_countries: ['US', 'CA', 'GB', 'AU'] },
      shipping_options: [{ shipping_rate_data: {
        type: 'fixed_amount',
        fixed_amount: { amount: 0, currency: 'usd' },
        display_name: 'Free shipping (because time is money)',
        delivery_estimate: { minimum: { unit: 'business_day', value: 5 }, maximum: { unit: 'business_day', value: 10 } },
      } }],
      billing_address_collection: 'required',
      phone_number_collection: { enabled: false },
      customer_creation: 'always',
      metadata: { style, size, timestamp },
      success_url: `${origin}/?success=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?canceled=1`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('checkout session error', error);
    return NextResponse.json({ error: 'Checkout is taking a tiny coffee break. Try again in a moment.' }, { status: 500 });
  }
}
