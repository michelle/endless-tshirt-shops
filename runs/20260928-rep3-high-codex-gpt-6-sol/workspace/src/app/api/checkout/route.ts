import { NextRequest, NextResponse } from 'next/server';
import { parseDesign, PRODUCT } from '@/lib/store';
import { stripeClient, siteUrl } from '@/lib/server';
export const runtime = 'nodejs';
export async function POST(req: NextRequest) {
  try {
    const design = parseDesign(await req.json());
    if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET || !process.env.PRODIGI_API_KEY || !process.env.ART_SIGNING_SECRET) throw new Error('Checkout is temporarily unavailable');
    const prodigiBase = process.env.PRODIGI_API_BASE || 'https://api.sandbox.prodigi.com';
    if ((prodigiBase.includes('sandbox') && !process.env.STRIPE_SECRET_KEY.startsWith('sk_test_')) || (!prodigiBase.includes('sandbox') && !process.env.STRIPE_SECRET_KEY.startsWith('sk_live_'))) throw new Error('Payment and fulfillment modes do not match');
    const stripe = stripeClient();
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{ price_data: { currency: PRODUCT.currency, unit_amount: PRODUCT.price, product_data: { name: PRODUCT.name, description: `${design.place} · ${design.date} · ${design.color} / ${design.size.toUpperCase()}` } }, quantity: 1 }],
      shipping_address_collection: { allowed_countries: ['US'] },
      shipping_options: [{ shipping_rate_data: { type: 'fixed_amount', fixed_amount: { amount: PRODUCT.shipping, currency: PRODUCT.currency }, display_name: 'Standard shipping', delivery_estimate: { minimum: { unit: 'business_day', value: 5 }, maximum: { unit: 'business_day', value: 10 } } } }],
      metadata: design,
      success_url: `${siteUrl()}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl()}/?canceled=1`,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('Checkout error', err);
    const message = err instanceof Error && /^(Place|Message|Choose|Missing)/.test(err.message) ? err.message : 'Checkout is temporarily unavailable';
    return NextResponse.json({ error: message }, { status: message === 'Checkout is temporarily unavailable' ? 503 : 400 });
  }
}
