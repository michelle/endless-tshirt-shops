import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import {
  PRICE_CENTS,
  PRODIGI_PRODUCTS,
  isValidSize,
  isValidStyle,
  isValidTimestamp,
} from '@/lib/products';

// Countries we ship to (Prodigi's tee catalogue ships to all of these).
const ALLOWED_COUNTRIES = [
  'US', 'CA', 'GB', 'IE', 'AU', 'NZ', 'DE', 'FR', 'NL', 'BE', 'ES', 'IT',
  'AT', 'CH', 'SE', 'NO', 'DK', 'FI', 'PT',
] as const;

function requestOrigin(req: NextRequest): string {
  const proto = req.headers.get('x-forwarded-proto') ?? 'https';
  const host =
    req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? '';
  return process.env.NEXT_PUBLIC_BASE_URL || `${proto}://${host}`;
}

export async function POST(req: NextRequest) {
  let body: { style?: unknown; size?: unknown; timestamp?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { style, size, timestamp } = body;
  if (!isValidStyle(style) || !isValidSize(size) || !isValidTimestamp(timestamp)) {
    return NextResponse.json(
      { error: 'Expected { style: fitted|unisex, size: S|M|L|XL, timestamp: epoch-ms string }' },
      { status: 400 }
    );
  }

  const origin = requestOrigin(req);
  const product = PRODIGI_PRODUCTS[style];
  const when = new Date(Number(timestamp)).toISOString();

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    ui_mode: 'embedded_page',
    // Card-only (like the original store): keeps checkout to a single
    // in-page flow with no redirect/popup payment methods.
    payment_method_types: ['card'],
    return_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
    shipping_address_collection: {
      allowed_countries: [...ALLOWED_COUNTRIES],
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: PRICE_CENTS,
          product_data: {
            name: `The ${timestamp} tee`,
            description: `${style === 'fitted' ? 'Fitted' : 'Unisex'} · size ${size} · black — printed with the exact millisecond you hit buy (${when}). ${product.label}. 📦 Free shipping!`,
            images: [`${origin}/api/artwork?ts=${timestamp}&preview=1`],
          },
        },
      },
    ],
    metadata: {
      timestamp,
      style,
      size,
      origin,
    },
    payment_intent_data: {
      description: `datetime.store tee — ${timestamp} (${style}/${size})`,
      metadata: { timestamp, style, size },
    },
  });

  return NextResponse.json({ clientSecret: session.client_secret });
}
