import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { createDesign, ScalablePressError } from '@/lib/scalablepress';
import { generateArtworkPng } from '@/lib/artwork';
import {
  PRICE_CENTS,
  SIZES,
  STYLES,
  STYLE_LABELS,
  STYLE_DESCRIPTIONS,
  ShirtSize,
  ShirtStyle,
} from '@/lib/products';

export async function POST(req: NextRequest) {
  let body: { style?: string; size?: string; timestampMs?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const style = body.style as ShirtStyle;
  const size = body.size as ShirtSize;
  const timestampMs = Number(body.timestampMs);

  if (!STYLES.includes(style)) {
    return NextResponse.json({ error: 'Invalid shirt style' }, { status: 400 });
  }
  if (!SIZES.includes(size)) {
    return NextResponse.json({ error: 'Invalid shirt size' }, { status: 400 });
  }
  if (!Number.isFinite(timestampMs)) {
    return NextResponse.json({ error: 'Invalid timestamp' }, { status: 400 });
  }

  let designId: string;
  try {
    const artwork = await generateArtworkPng(timestampMs);
    designId = await createDesign(artwork);
  } catch (err) {
    console.error('[checkout] design creation failed', err);
    const message = err instanceof ScalablePressError ? err.message : 'Could not prepare artwork for printing.';
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const origin = req.headers.get('origin') || `https://${req.headers.get('host')}`;

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      shipping_address_collection: { allowed_countries: ['US'] },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: PRICE_CENTS,
            product_data: {
              name: `datetime.store shirt — ${STYLE_LABELS[style]}, size ${size}`,
              description: STYLE_DESCRIPTIONS[style],
            },
          },
        },
      ],
      metadata: {
        style,
        size,
        designId,
        timestampMs: String(timestampMs),
        fulfillment_status: 'pending',
      },
      payment_intent_data: {
        metadata: {
          style,
          size,
          designId,
          timestampMs: String(timestampMs),
          fulfillment_status: 'pending',
        },
      },
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('[checkout] stripe session creation failed', err);
    return NextResponse.json({ error: 'Could not start checkout.' }, { status: 502 });
  }
}
