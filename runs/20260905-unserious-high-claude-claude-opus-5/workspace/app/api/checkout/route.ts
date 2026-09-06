/**
 * Starts a purchase.
 *
 * The timestamp is minted here, on the server, at the moment the customer
 * commits. The clock on the website is a preview; this is the real one.
 */

import { NextResponse } from 'next/server';
import {
  COMPARE_AT_CENTS,
  CURRENCY,
  DEFAULT_COLOUR,
  PRICE_CENTS,
  SHIPPING_COUNTRIES,
  findColour,
  isFit,
  isSize,
} from '@/lib/catalog';
import { artworkUrl, siteOrigin } from '@/lib/site';
import { stripe } from '@/lib/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let body: { size?: unknown; colour?: unknown; fit?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Malformed request.' }, { status: 400 });
  }

  const size = body.size;
  const fit = body.fit;
  const colour = findColour(typeof body.colour === 'string' ? body.colour : null) ?? DEFAULT_COLOUR;

  if (!isSize(size)) return NextResponse.json({ error: 'Pick a size that exists.' }, { status: 400 });
  if (!isFit(fit)) return NextResponse.json({ error: 'Pick a fit that exists.' }, { status: 400 });

  const timestamp = String(Date.now());
  const origin = siteOrigin(req);

  try {
    const session = await stripe().checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: CURRENCY,
            unit_amount: PRICE_CENTS,
            product_data: {
              name: `The ${timestamp} shirt`,
              description: `${colour.label} - ${fit} fit - size ${size}. One moment, printed once.`,
              images: [artworkUrl(origin, 'black', timestamp)],
            },
          },
        },
      ],
      // Prodigi needs a real address; Stripe is the only place we collect one.
      shipping_address_collection: { allowed_countries: [...SHIPPING_COUNTRIES] },
      phone_number_collection: { enabled: true },
      shipping_options: [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            display_name: 'Free shipping (the shirt travels through time anyway)',
            fixed_amount: { amount: 0, currency: CURRENCY },
            delivery_estimate: {
              minimum: { unit: 'business_day', value: 5 },
              maximum: { unit: 'business_day', value: 12 },
            },
          },
        },
      ],
      // Read back by the webhook and the success page to build the print order.
      metadata: { timestamp, size, fit, colour: colour.id, ink: colour.ink },
      payment_intent_data: {
        description: `datetime.store - ${timestamp}`,
        metadata: { timestamp, size, fit, colour: colour.id, ink: colour.ink },
      },
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?cancelled=1`,
    });

    if (!session.url) throw new Error('Stripe did not return a Checkout URL');

    return NextResponse.json({ url: session.url, timestamp, compareAt: COMPARE_AT_CENTS });
  } catch (err) {
    console.error('[checkout] failed', err);
    const message = err instanceof Error ? err.message : 'Checkout is unavailable.';
    const missingKey = message.includes('STRIPE_SECRET_KEY');
    return NextResponse.json(
      {
        error: missingKey
          ? 'The register is not plugged in yet (no Stripe key configured).'
          : 'The register jammed. Try again.',
      },
      { status: missingKey ? 503 : 502 },
    );
  }
}
