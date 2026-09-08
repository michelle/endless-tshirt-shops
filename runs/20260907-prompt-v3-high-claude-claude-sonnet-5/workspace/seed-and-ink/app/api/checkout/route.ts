import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { isStyleKey } from '@/lib/designs';
import { getPalette, PALETTES } from '@/lib/palettes';
import {
  ALLOWED_SHIP_COUNTRIES,
  MAX_QUANTITY,
  MAX_SEED_LENGTH,
  PRICE_USD_CENTS,
  SHIRT_COLORS,
  SHIRT_SIZES,
  getShirtColor,
} from '@/lib/config';

export const runtime = 'nodejs';

function designUrl(origin: string, part: 'front' | 'back', p: {
  seed: string;
  style: string;
  palette: string;
}) {
  const params = new URLSearchParams({ part, seed: p.seed, style: p.style, palette: p.palette });
  return `${origin}/api/design-image?${params.toString()}`;
}

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const seedText = String(body.seedText ?? '').trim().slice(0, MAX_SEED_LENGTH);
  const style = String(body.style ?? '');
  const paletteKey = String(body.palette ?? '');
  const shirtColor = String(body.shirtColor ?? '');
  const size = String(body.size ?? '');
  const quantity = Math.max(1, Math.min(MAX_QUANTITY, Number(body.quantity) || 1));

  if (!seedText) {
    return NextResponse.json({ error: 'A seed phrase is required.' }, { status: 400 });
  }
  if (!isStyleKey(style)) {
    return NextResponse.json({ error: 'Invalid growth pattern.' }, { status: 400 });
  }
  if (!PALETTES.some((p) => p.key === paletteKey)) {
    return NextResponse.json({ error: 'Invalid palette.' }, { status: 400 });
  }
  if (!SHIRT_COLORS.some((c) => c.key === shirtColor)) {
    return NextResponse.json({ error: 'Invalid shirt color.' }, { status: 400 });
  }
  if (!SHIRT_SIZES.includes(size as any)) {
    return NextResponse.json({ error: 'Invalid size.' }, { status: 400 });
  }

  const origin = req.headers.get('origin') || new URL(req.url).origin;
  const palette = getPalette(paletteKey);
  const garment = getShirtColor(shirtColor);
  const frontUrl = designUrl(origin, 'front', { seed: seedText, style, palette: paletteKey });
  const backUrl = designUrl(origin, 'back', { seed: seedText, style, palette: paletteKey });

  const stripe = getStripe();

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          quantity,
          price_data: {
            currency: 'usd',
            unit_amount: PRICE_USD_CENTS,
            product_data: {
              name: `Seed & Ink custom tee — "${seedText}"`,
              description: `${style} pattern, ${palette.name} palette, ${garment.label}, size ${size.toUpperCase()}`,
              images: [frontUrl],
            },
          },
        },
      ],
      shipping_address_collection: {
        allowed_countries:
          ALLOWED_SHIP_COUNTRIES as unknown as Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[],
      },
      metadata: {
        seedText,
        style,
        palette: paletteKey,
        shirtColor,
        size,
        quantity: String(quantity),
        designFrontUrl: frontUrl,
        designBackUrl: backUrl,
      },
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/customize?canceled=1`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('checkout session create failed', err);
    return NextResponse.json(
      { error: 'Could not start checkout. Please try again.' },
      { status: 500 },
    );
  }
}
