import { NextResponse } from 'next/server';
import { isSelection, originFromRequest, PRICE_CENTS, PRODUCT_NAME, stripeClient } from '../lib';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const choice = await request.json();
    if (!isSelection(choice)) return NextResponse.json({error: 'Please select a valid fit and size.'}, {status: 400});
    const origin = originFromRequest(request);
    const stamp = String(Math.floor(choice.timestamp / 1000));
    const session = await stripeClient().checkout.sessions.create({
      mode: 'payment',
      customer_creation: 'always',
      billing_address_collection: 'auto',
      shipping_address_collection: { allowed_countries: ['US', 'CA', 'GB'] },
      phone_number_collection: { enabled: true },
      allow_promotion_codes: false,
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/#order`,
      metadata: { timestamp: stamp, style: choice.style, size: choice.size, artworkUrl: `${origin}/api/artwork?timestamp=${stamp}` },
      line_items: [{ quantity: 1, price_data: { currency: 'usd', unit_amount: PRICE_CENTS, product_data: { name: PRODUCT_NAME, description: `Unix timestamp ${stamp} · ${choice.style} · ${choice.size}`, images: [`${origin}/api/artwork?timestamp=${stamp}&preview=1`] } } }],
      shipping_options: [{ shipping_rate_data: { type: 'fixed_amount', fixed_amount: { amount: 0, currency: 'usd' }, display_name: 'Standard shipping', delivery_estimate: { minimum: {unit: 'business_day', value: 5}, maximum: {unit: 'business_day', value: 10} } } }],
    });
    return NextResponse.json({url: session.url});
  } catch (error) { console.error('checkout', error); return NextResponse.json({error: error instanceof Error ? error.message : 'Unable to create checkout.'}, {status: 500}); }
}
