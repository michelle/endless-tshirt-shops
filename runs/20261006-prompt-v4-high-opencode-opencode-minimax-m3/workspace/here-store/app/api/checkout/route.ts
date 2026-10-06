import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { renderDesign } from '@/lib/design-renderer';
import { orders } from '@/lib/orders';
import { assetCache } from '@/lib/asset-cache';
import { SHIRTS, PRICE_CENTS, SHIRT_SKU, INK_HEX } from '@/lib/products';
import { getStripe } from '@/lib/stripe';
import { isMockPayments, publicBaseUrl } from '@/lib/config';
import type { DesignConfig, ShirtColor, ShirtSize, ShippingDetails } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Schema = z.object({
  design: z.object({
    label: z.string().max(60),
    city: z.string().max(80),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    year: z.string().max(4).optional().nullable(),
    personalName: z.string().max(20).optional().nullable(),
    variant: z.enum(['classic', 'minimal', 'nautical']),
  }),
  variant: z.object({
    sku: z.string(),
    color: z.string(),
    size: z.string(),
  }),
  shipping: z.object({
    name: z.string().min(1),
    line1: z.string().min(1),
    line2: z.string().optional().nullable(),
    city: z.string().min(1),
    state: z.string().optional().nullable(),
    postalCode: z.string().min(1),
    countryCode: z.string().length(2),
    email: z.string().email().optional().nullable(),
    phone: z.string().optional().nullable(),
  }),
  priceCents: z.number().int().positive(),
});

export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', issues: parsed.error.flatten() }, { status: 400 });
  }
  const v = parsed.data;

  // Validate the shirt variant against the supported catalog.
  const shirt = SHIRTS.find((s) => s.color === v.variant.color);
  if (!shirt) return NextResponse.json({ error: 'Unsupported color' }, { status: 400 });
  const size = v.variant.size as ShirtSize;
  if (!['s', 'm', 'l', 'xl', '2xl'].includes(size)) return NextResponse.json({ error: 'Unsupported size' }, { status: 400 });

  // Render the production PNG up-front so we can show a preview and Prodigi gets a deterministic URL.
  const inkColor = shirt.ink === 'light' ? INK_HEX.light : INK_HEX.dark;
  const background = shirt.ink === 'light' ? 'dark' : 'light';
  const design: DesignConfig = {
    label: v.design.label,
    city: v.design.city,
    latitude: v.design.latitude,
    longitude: v.design.longitude,
    year: v.design.year ?? '',
    personalName: v.design.personalName ?? '',
    variant: v.design.variant,
  };

  const cacheKey = `${SHIRT_SKU}|${v.variant.color}|${v.variant.size}|${design.label}|${design.city}|${design.latitude}|${design.longitude}|${design.year}|${design.personalName}|${design.variant}`;

  // Create the order record first, then render.
  const order = orders.create({
    design,
    variant: { sku: SHIRT_SKU, color: v.variant.color as ShirtColor, size },
    shipping: v.shipping as ShippingDetails,
    amountCents: v.priceCents,
    currency: 'USD',
    assetUrl: '', // set after render
  });

  try {
    const { png, width, height } = await renderDesign({ design, inkColor, background });
    assetCache.set(cacheKey, order.id, png, width, height);
    // We store a relative URL — the absolute one is computed in the webhook.
    orders.update(order.id, { assetUrl: `/api/asset/${order.id}` });
  } catch (e: any) {
    return NextResponse.json({ error: 'Could not render design', message: String(e?.message ?? e) }, { status: 500 });
  }

  const base = publicBaseUrl(req);

  // Mock payment mode: pretend a session was created.
  if (isMockPayments()) {
    const mockSession = `cs_mock_${order.id}`;
    orders.attachStripeSession(order.id, mockSession);
    orders.update(order.id, { status: 'paid_production', stripePaymentIntentId: `pi_mock_${order.id}` });
    return NextResponse.json({
      mock: true,
      url: `/success?mock=1&order=${encodeURIComponent(order.id)}&session=${encodeURIComponent(mockSession)}`,
      orderId: order.id,
      sessionId: mockSession,
      warning: 'No STRIPE_SECRET_KEY configured — using mock payment. Configure Stripe to accept real payments.',
    });
  }

  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: v.priceCents,
            product_data: {
              name: `HERE — ${design.label.toUpperCase()} (${design.city})`,
              description:
                `Custom coords tee · color ${shirt.label} · size ${size.toUpperCase()}\n` +
                `${design.latitude.toFixed(4)}°, ${design.longitude.toFixed(4)}°\n` +
                (design.year ? `Est. ${design.year}\n` : '') +
                (design.personalName ? `${design.personalName}\n` : ''),
              images: [`${base}/api/design?label=${encodeURIComponent(design.label)}&city=${encodeURIComponent(design.city)}&lat=${design.latitude}&lng=${design.longitude}&year=${encodeURIComponent(design.year ?? '')}&name=${encodeURIComponent(design.personalName ?? '')}&variant=${design.variant}&ink=${encodeURIComponent(inkColor)}&bg=${background}`],
            },
          },
        },
      ],
      customer_email: v.shipping.email || undefined,
      shipping_address_collection: {
        allowed_countries: ['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'JP', 'IT', 'ES', 'NL', 'BE', 'MX', 'BR'],
      },
      metadata: {
        orderId: order.id,
        idempotencyKey: order.idempotencyKey,
        sku: SHIRT_SKU,
        color: v.variant.color,
        size,
      },
      success_url: `${base}/success?order=${encodeURIComponent(order.id)}&session={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/cancel?order=${encodeURIComponent(order.id)}`,
    });

    orders.attachStripeSession(order.id, session.id);
    return NextResponse.json({ url: session.url, orderId: order.id, sessionId: session.id });
  } catch (e: any) {
    return NextResponse.json({ error: 'Could not create Stripe session', message: String(e?.message ?? e) }, { status: 500 });
  }
}
