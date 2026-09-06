import { NextResponse } from 'next/server';

const PRODUCT = { id: 'current-moment-tee', name: 'The Current Moment — Timestamp Tee', description: 'Unisex Gildan Softstyle 64000 · on-demand print', amount: 3400 };
const allowedColors = new Set(['black', 'asphalt', 'navy blue', 'white']);
const allowedSizes = new Set(['S', 'M', 'L', 'XL', '2XL', '3XL']);

export async function POST(request: Request) {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) return NextResponse.json({ error: 'Stripe is not configured yet.' }, { status: 503 });
  try {
    const body = await request.json() as { items?: Array<{ productId: string; color: string; size: string; quantity: number }> };
    const item = body.items?.[0];
    if (!item || item.productId !== PRODUCT.id || !allowedColors.has(item.color) || !allowedSizes.has(item.size) || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 5) {
      return NextResponse.json({ error: 'Please choose a valid color, size, and quantity.' }, { status: 400 });
    }
    const origin = new URL(request.url).origin;
    const params = new URLSearchParams();
    params.set('mode', 'payment');
    params.set('success_url', `${origin}/success?session_id={CHECKOUT_SESSION_ID}`);
    params.set('cancel_url', `${origin}/?checkout=cancelled`);
    params.set('submit_type', 'pay');
    params.set('billing_address_collection', 'auto');
    for (const country of ['US', 'CA', 'GB', 'AU', 'DE', 'FR']) params.append('shipping_address_collection[allowed_countries][]', country);
    params.set('line_items[0][quantity]', String(item.quantity));
    params.set('line_items[0][price_data][currency]', 'usd');
    params.set('line_items[0][price_data][unit_amount]', String(PRODUCT.amount));
    params.set('line_items[0][price_data][product_data][name]', PRODUCT.name);
    params.set('line_items[0][price_data][product_data][description]', `${PRODUCT.description} · ${item.color} · ${item.size}`);
    params.set('metadata[order_items]', JSON.stringify({ productId: item.productId, color: item.color, size: item.size, quantity: item.quantity }));
    params.set('metadata[store]', 'night-shift-club');
    const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    });
    const result = await stripeResponse.json() as { url?: string; error?: { message?: string } };
    if (!stripeResponse.ok || !result.url) throw new Error(result.error?.message || 'Stripe could not create checkout.');
    return NextResponse.json({ url: result.url });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to start checkout.' }, { status: 500 });
  }
}
