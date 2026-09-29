import { NextResponse } from 'next/server';
import { stripe } from '../../../lib/stripe';
import { baseUrlFromRequest } from '../../../lib/url';
import { validateDesign, encodeDesign, ValidationError, formatDate, getPalette } from '../../../lib/design';
import {
  SHIRT_PRICE_CENTS,
  SHIPPING_CENTS,
  CURRENCY,
  MAX_QTY,
  isColor,
  isSize,
  getColor,
  ALLOWED_COUNTRIES,
  PREVIEW_CANVAS,
} from '../../../lib/catalog';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * POST /api/checkout {date, place, caption, palette, color, size, qty}
 * Creates a Stripe Checkout Session. The whole design travels in session
 * metadata, so fulfilment needs no database: after payment, the design is
 * read back from the session and re-rendered into a signed artwork URL.
 */
export async function POST(req: Request): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }

  let design;
  try {
    design = validateDesign(body);
  } catch (err) {
    if (err instanceof ValidationError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: 'invalid design' }, { status: 400 });
  }
  if (!isColor(body.color)) return NextResponse.json({ error: 'unknown shirt colour' }, { status: 400 });
  if (!isSize(body.size)) return NextResponse.json({ error: 'unknown shirt size' }, { status: 400 });
  const qty = Number(body.qty ?? 1);
  if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) {
    return NextResponse.json({ error: `quantity must be between 1 and ${MAX_QTY}` }, { status: 400 });
  }

  const color = getColor(body.color);
  const palette = getPalette(design.palette);
  const base = baseUrlFromRequest(req);
  const { d, sig } = encodeDesign(design);
  const previewUrl = `${base}/api/design?d=${d}&sig=${sig}&r=preview`;
  const isPublic = base.startsWith('https://');

  const session = await stripe().checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        quantity: qty,
        price_data: {
          currency: CURRENCY,
          unit_amount: SHIRT_PRICE_CENTS,
          product_data: {
            name: `Moonworn night-sky tee — ${design.place}, ${formatDate(design.date)}`,
            description: `One-of-one DTG print · ${palette.name} sky · ${color.name} · size ${String(body.size).toUpperCase()}`,
            ...(isPublic ? { images: [previewUrl] } : {}),
          },
        },
      },
    ],
    shipping_address_collection: { allowed_countries: ALLOWED_COUNTRIES as never },
    shipping_options: [
      {
        shipping_rate_data: {
          display_name: 'Standard shipping',
          type: 'fixed_amount',
          fixed_amount: { amount: SHIPPING_CENTS, currency: CURRENCY },
          delivery_estimate: {
            minimum: { unit: 'business_day', value: 5 },
            maximum: { unit: 'business_day', value: 12 },
          },
        },
      },
    ],
    metadata: {
      designJson: JSON.stringify(design),
      color: color.id,
      size: String(body.size),
      qty: String(qty),
    },
    success_url: `${base}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/?cancelled=1`,
  });

  if (!session.url) {
    return NextResponse.json({ error: 'Stripe did not return a checkout URL' }, { status: 502 });
  }
  return NextResponse.json({ url: session.url, sessionId: session.id, previewWidth: PREVIEW_CANVAS.w });
}
