import { NextRequest, NextResponse } from 'next/server';
import { normalizeDesign } from '@/lib/design';
import { stripeClient } from '@/lib/stripe';
export const runtime = 'nodejs';
export async function POST(request: NextRequest) {
  try {
    const design = normalizeDesign(await request.json());
    if (!process.env.STRIPE_WEBHOOK_SECRET || !process.env.PRODIGI_API_KEY) throw new Error('Checkout is not ready. Complete payment and fulfillment setup first.');
    const stripeKey = process.env.STRIPE_SECRET_KEY || '';
    if ((stripeKey.startsWith('sk_live_') && process.env.PRODIGI_ENV !== 'live') || (stripeKey.startsWith('sk_test_') && process.env.PRODIGI_ENV === 'live')) throw new Error('Stripe and Prodigi must both use test mode or both use live mode.');
    const stripe = stripeClient();
    const origin = process.env.SITE_URL || request.nextUrl.origin;
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{ price_data: { currency: 'usd', unit_amount: 3900, product_data: { name: 'Our Orbit — custom tee', description: `${design.names} · ${design.place} · ${design.date} · ${design.size}` } }, quantity: 1 }],
      shipping_address_collection: { allowed_countries: ['US'] },
      shipping_options: [{ shipping_rate_data: { type: 'fixed_amount', fixed_amount: { amount: 600, currency: 'usd' }, display_name: 'US standard shipping' } }],
      phone_number_collection: { enabled: true },
      customer_creation: 'always',
      metadata: design,
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?checkout=cancelled`,
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not start checkout.';
    return NextResponse.json({ error: message }, { status: message.startsWith('Stripe is not configured') || message.startsWith('Checkout is not ready') || message.startsWith('Stripe and Prodigi') ? 503 : 400 });
  }
}
