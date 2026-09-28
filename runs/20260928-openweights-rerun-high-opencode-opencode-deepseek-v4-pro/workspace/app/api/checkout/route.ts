import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { colorById, PRICE_USD, SKU } from '@/lib/catalog';
import { encodeDesignParams } from '@/lib/design-params';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export interface Customization {
  title: string;
  date: string; // YYYY-MM-DD
  place?: string;
  color: string; // colour id
  size: string;
}

function baseUrl(req: NextRequest): string {
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  return `${proto}://${host}`;
}

export async function POST(req: NextRequest) {
  let body: Customization;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }

  const { title, date, place, color, size } = body || ({} as Customization);

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 });
  }
  if (title.length > 60) {
    return NextResponse.json({ error: 'title too long' }, { status: 400 });
  }
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'date is required (YYYY-MM-DD)' }, { status: 400 });
  }
  if (place && place.length > 60) {
    return NextResponse.json({ error: 'place too long' }, { status: 400 });
  }

  let shirtColor;
  try {
    shirtColor = colorById(color);
  } catch {
    return NextResponse.json({ error: 'invalid colour' }, { status: 400 });
  }
  if (!size || !['xs', 's', 'm', 'l', 'xl', '2xl', '3xl', '4xl'].includes(size)) {
    return NextResponse.json({ error: 'invalid size' }, { status: 400 });
  }

  const ink = shirtColor.dark ? 'light' : 'dark';
  const designUrl = `${baseUrl(req)}/api/design?d=${encodeDesignParams({
    title: title.trim(),
    date,
    place: place?.trim() || undefined,
    ink,
  })}`;

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'usd',
          unit_amount: PRICE_USD * 100,
          product_data: {
            name: 'Lunaria Custom Moon Tee',
            description: `${shirtColor.label} · ${size.toUpperCase()} · Bella+Canvas 3001`,
          },
        },
        quantity: 1,
      },
    ],
    shipping_address_collection: {
      allowed_countries: [
        'US', 'CA', 'GB', 'AU', 'NZ', 'IE', 'DE', 'FR', 'ES', 'IT', 'NL',
        'BE', 'AT', 'CH', 'SE', 'NO', 'DK', 'FI', 'PT', 'PL', 'CZ', 'JP',
        'SG', 'HK',
      ],
    },
    success_url: `${baseUrl(req)}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl(req)}/customize`,
    metadata: {
      title: title.trim(),
      date,
      place: place?.trim() || '',
      color: shirtColor.prodigi,
      size,
      designUrl,
      source: 'lunaria',
    },
  });

  return NextResponse.json({ url: session.url });
}
