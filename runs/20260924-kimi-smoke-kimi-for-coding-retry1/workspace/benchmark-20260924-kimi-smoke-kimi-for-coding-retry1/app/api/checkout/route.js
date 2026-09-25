import { NextResponse } from 'next/server';
import { paymentMode, stripeClient } from '@/lib/payments';
import { normalizeDesign } from '@/lib/scene';
import { priceOrder } from '@/lib/pricing';
import { siteUrl, artworkUrlFor, newOrderRef } from '@/lib/fulfill';

export const runtime = 'nodejs';
export const maxDuration = 60;

const ALLOWED_COUNTRIES = [
  'US', 'CA', 'GB', 'IE', 'FR', 'DE', 'ES', 'IT', 'NL', 'BE', 'AT', 'PT', 'SE', 'NO', 'DK',
  'FI', 'PL', 'CZ', 'GR', 'AU', 'NZ', 'JP', 'SG', 'AE', 'CH', 'IS', 'LU', 'MT', 'CY', 'EE',
  'LV', 'LT', 'SK', 'SI', 'HU', 'RO', 'BG', 'HR', 'MX', 'BR', 'ZA', 'IN', 'KR', 'HK', 'TW', 'IL',
];

// POST /api/checkout — body: {items: [{design}]}
// Stripe mode: creates a Checkout Session (payment collected by Stripe;
// fulfillment happens in the webhook after payment succeeds).
export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const rawItems = Array.isArray(body.items) ? body.items.slice(0, 20) : [];
  if (rawItems.length === 0) {
    return NextResponse.json({ error: 'cart is empty' }, { status: 400 });
  }

  let designs;
  try {
    designs = rawItems.map((i) => normalizeDesign(i.design || {}));
  } catch (e) {
    return NextResponse.json({ error: 'invalid design: ' + e.message }, { status: 400 });
  }

  if (paymentMode() !== 'stripe') {
    return NextResponse.json({ error: 'stripe not configured', mode: paymentMode() }, { status: 409 });
  }

  const totals = priceOrder(designs.map((d) => ({ qty: d.qty })));
  const ref = newOrderRef();
  const stripe = stripeClient();

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    success_url: `${siteUrl()}/success?ref=${ref}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl()}/checkout`,
    billing_address_collection: 'auto',
    shipping_address_collection: { allowed_countries: ALLOWED_COUNTRIES },
    shipping_options: [
      totals.shippingCents === 0
        ? {
            shipping_rate_data: {
              type: 'fixed_amount',
              fixed_amount: { amount: 0, currency: 'usd' },
              display_name: 'Free shipping (orders $75+)',
              delivery_estimate: { minimum: { unit: 'business_day', value: 3 }, maximum: { unit: 'business_day', value: 8 } },
            },
          }
        : {
            shipping_rate_data: {
              type: 'fixed_amount',
              fixed_amount: { amount: totals.shippingCents, currency: 'usd' },
              display_name: 'Standard shipping',
              delivery_estimate: { minimum: { unit: 'business_day', value: 3 }, maximum: { unit: 'business_day', value: 8 } },
            },
          },
    ],
    line_items: designs.map((d) => ({
      quantity: d.qty,
      price_data: {
        currency: 'usd',
        unit_amount: Math.round(totals.subtotalCents / designs.reduce((n, x) => n + x.qty, 0)),
        product_data: {
          name: 'SKYWRITER custom star-map tee',
          description: `${d.place || 'Custom sky'} — ${d.date} ${d.time} · Bella+Canvas 3001 · ${d.color} · size ${d.size}`,
          images: [artworkUrlFor(d, { full: false }) + '?w=600'],
          metadata: { design: JSON.stringify(d) },
        },
      },
    })),
    metadata: { ref },
    payment_intent_data: { metadata: { ref } },
  });

  return NextResponse.json({ url: session.url, ref, mode: 'stripe' });
}
