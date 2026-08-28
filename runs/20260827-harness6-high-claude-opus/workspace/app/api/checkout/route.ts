import { NextResponse, type NextRequest } from 'next/server';

import {
  CURRENCY,
  LIST_PRICE_CENTS,
  PRICE_CENTS,
  SHIPPING_COUNTRIES,
  STYLE_SPECS,
  formatUsd,
  isSize,
  isStyle,
  parseTimestamp,
} from '@/lib/catalog';
import { artworkUrl, siteOrigin } from '@/lib/site';
import { stripe } from '@/lib/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Opens a Checkout Session for one shirt.
 *
 * The timestamp is chosen by the client at the instant the customer commits, and
 * we carry it on the session metadata. Everything downstream (the print asset,
 * the Prodigi order, the receipt) is derived from that one number, so there is
 * exactly one source of truth for what got printed.
 */
export async function POST(req: NextRequest) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body.' }, { status: 400 });
  }

  const { ts: rawTs, style, size } = (payload ?? {}) as Record<string, unknown>;
  const ts = parseTimestamp(rawTs);

  if (ts === null) return NextResponse.json({ error: 'Invalid timestamp.' }, { status: 400 });
  if (!isStyle(style)) return NextResponse.json({ error: 'Invalid style.' }, { status: 400 });
  if (!isSize(size)) return NextResponse.json({ error: 'Invalid size.' }, { status: 400 });

  const origin = await siteOrigin();
  // Stripe fetches product images server-side; a localhost URL is useless to it.
  const previewImages = origin.startsWith('https://')
    ? [artworkUrl(origin, ts, style).replace('&print=1', '')]
    : undefined;

  try {
    const session = await stripe().checkout.sessions.create({
      mode: 'payment',
      ui_mode: 'embedded',
      // We render our own confirmation in place so the customer never leaves the
      // shop — the original was a one-page purchase and that is worth keeping.
      redirect_on_completion: 'never',
      submit_type: 'pay',
      // Payment methods are deliberately left to Stripe's automatic selection so
      // the mix (cards, Apple/Google Pay, Link, Klarna) is controlled from the
      // Dashboard rather than pinned in code. Note that Link's "save my info" box
      // is pre-checked and makes a phone number mandatory — turn Link off under
      // Settings → Payments if you want the leanest possible checkout.
      billing_address_collection: 'auto',
      shipping_address_collection: { allowed_countries: [...SHIPPING_COUNTRIES] },
      phone_number_collection: { enabled: false },
      // Shipping is free and already priced into the shirt; showing it as a $0
      // option is clearer than silently omitting it.
      shipping_options: [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            display_name: 'Free shipping',
            fixed_amount: { amount: 0, currency: CURRENCY },
            delivery_estimate: {
              minimum: { unit: 'business_day', value: 5 },
              maximum: { unit: 'business_day', value: 10 },
            },
          },
        },
      ],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: CURRENCY,
            unit_amount: PRICE_CENTS,
            product_data: {
              name: `datetime shirt — ${ts}`,
              description: `${STYLE_SPECS[style].label} · ${size} · black · ${STYLE_SPECS[style].blurb}. Was ${formatUsd(LIST_PRICE_CENTS)}.`,
              ...(previewImages ? { images: previewImages } : {}),
            },
          },
        },
      ],
      metadata: { ts: String(ts), style, size },
      payment_intent_data: {
        description: `datetime.store · ${ts} · ${style} ${size}`,
        metadata: { ts: String(ts), style, size },
      },
    });

    return NextResponse.json({ sessionId: session.id, clientSecret: session.client_secret });
  } catch (err) {
    console.error('[checkout] failed', err);
    const message = err instanceof Error ? err.message : 'Could not start checkout.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
