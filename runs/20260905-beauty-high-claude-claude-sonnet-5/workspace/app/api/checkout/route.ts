import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import {
  COLORS,
  CURRENCY,
  FITS,
  PRICE_USD,
  SIZES,
  THEMES,
  isValidColor,
  isValidFit,
  isValidSize,
  isValidTheme,
} from '@/lib/catalog';

// Countries Prodigi's Gildan 64000 / 64000L can reasonably ship the "front"
// print to (a curated subset of the sandbox product's shipsTo list — see
// README for the full-coverage gap note).
const ALLOWED_COUNTRIES = [
  'US', 'CA', 'GB', 'AU', 'NZ', 'IE', 'DE', 'FR', 'ES', 'IT', 'NL', 'BE',
  'SE', 'DK', 'NO', 'FI', 'PT', 'AT', 'CH', 'JP', 'SG',
] as const;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { artworkUrl, fit, color, size, theme, frozenAt } = body ?? {};

    if (typeof artworkUrl !== 'string' || !artworkUrl.startsWith('https://')) {
      return NextResponse.json({ error: 'Missing or invalid artworkUrl' }, { status: 400 });
    }
    if (typeof fit !== 'string' || !isValidFit(fit)) {
      return NextResponse.json({ error: 'Invalid fit' }, { status: 400 });
    }
    if (typeof color !== 'string' || !isValidColor(color)) {
      return NextResponse.json({ error: 'Invalid color' }, { status: 400 });
    }
    if (typeof size !== 'string' || !isValidSize(size)) {
      return NextResponse.json({ error: 'Invalid size' }, { status: 400 });
    }
    if (typeof theme !== 'string' || !isValidTheme(theme)) {
      return NextResponse.json({ error: 'Invalid theme' }, { status: 400 });
    }

    const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
    const stripe = getStripe();

    const productName = `Datetime Tee — ${FITS[fit].label} · ${COLORS[color].label} · ${SIZES[size].label}`;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: CURRENCY,
            unit_amount: Math.round(PRICE_USD * 100),
            product_data: {
              name: productName,
              description: `${THEMES[theme].label} · frozen at ${frozenAt || 'checkout'} · one-of-one, never printed again`,
              images: [artworkUrl],
            },
          },
        },
      ],
      shipping_address_collection: { allowed_countries: [...ALLOWED_COUNTRIES] },
      metadata: {
        fit,
        color,
        size,
        theme,
        artworkUrl,
        frozenAt: typeof frozenAt === 'string' ? frozenAt.slice(0, 60) : '',
      },
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?checkout=cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('[checkout] failed', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
