import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import {
  CURRENCY,
  PRICE_CENTS,
  PRODUCTS,
  SHIPPING_COUNTRIES,
  SHIRT_COLOR,
  describeShirt,
  isPurchasableMoment,
  parseSize,
  parseStyle,
  parseTimestamp,
} from '@/lib/catalog';
import { previewPath } from '@/lib/artwork';
import { getBaseUrl } from '@/lib/urls';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Start a purchase.
 *
 * The timestamp is chosen by the browser at the instant the buyer commits, and
 * it is the product — so it travels through Stripe as session metadata and is
 * re-validated here. Everything else about the order (price, SKU, colour) is
 * decided server-side; the client cannot influence what it is charged.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body.' }, { status: 400 });
  }

  const { timestamp, style, size } = (body ?? {}) as Record<string, unknown>;
  const ts = parseTimestamp(timestamp);
  const parsedStyle = parseStyle(style);
  const parsedSize = parseSize(size);

  if (ts === null || !isPurchasableMoment(ts)) {
    return NextResponse.json(
      { error: 'That moment has passed. Grab the one on screen now.' },
      { status: 400 },
    );
  }
  if (!parsedStyle || !parsedSize) {
    return NextResponse.json({ error: 'Pick a valid style and size.' }, { status: 400 });
  }

  try {
    const baseUrl = await getBaseUrl();
    const product = PRODUCTS[parsedStyle];

    const session = await stripe().checkout.sessions.create(
      {
        mode: 'payment',
        // Wallets (Apple Pay, Google Pay, Link) light up automatically here,
        // which is what the original store's Payment Request button was for.
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: CURRENCY,
              unit_amount: PRICE_CENTS,
              product_data: {
                name: `datetime tee — ${ts}`,
                description: `${product.label} · ${parsedSize} · ${SHIRT_COLOR} · ${product.blurb}`,
                images: [`${baseUrl}${previewPath(ts, parsedStyle)}`],
              },
            },
          },
        ],
        shipping_address_collection: {
          allowed_countries: [...SHIPPING_COUNTRIES],
        },
        // Free shipping, as on the original store. Making it an explicit rate
        // (rather than silently zero) means it shows up on the receipt.
        shipping_options: [
          {
            shipping_rate_data: {
              type: 'fixed_amount',
              display_name: 'Free shipping',
              fixed_amount: { amount: 0, currency: CURRENCY },
              delivery_estimate: {
                minimum: { unit: 'business_day', value: 5 },
                maximum: { unit: 'business_day', value: 12 },
              },
            },
          },
        ],
        metadata: { timestamp: String(ts), style: parsedStyle, size: parsedSize },
        payment_intent_data: {
          description: describeShirt(ts, parsedStyle, parsedSize),
          metadata: { timestamp: String(ts), style: parsedStyle, size: parsedSize },
        },
        success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/?canceled=1`,
        // Checkout links expire so abandoned sessions do not linger as
        // fulfillable orders. Stripe's floor is 30 minutes; an hour leaves room
        // for a slow checkout without sitting on that boundary.
        expires_at: Math.floor(Date.now() / 1000) + 60 * 60,
      },
      // Two clicks on "buy now" within the same millisecond-instant are the
      // same intent, not two shirts.
      { idempotencyKey: `checkout:${ts}:${parsedStyle}:${parsedSize}` },
    );

    if (!session.url) {
      return NextResponse.json({ error: 'Stripe did not return a checkout URL.' }, { status: 502 });
    }
    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('[checkout] failed to create session', err);
    return NextResponse.json(
      { error: 'We could not start checkout. Please try again.' },
      { status: 502 },
    );
  }
}
