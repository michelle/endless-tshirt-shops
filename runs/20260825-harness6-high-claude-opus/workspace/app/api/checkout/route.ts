import { NextResponse } from 'next/server';

import { artworkUrl } from '@/lib/artwork';
import { isRenderableTimestamp } from '@/lib/artwork';
import { describeTimestamp } from '@/lib/format';
import {
  CURRENCY,
  PRICE_CENTS,
  STYLES,
  isSizeId,
  isStyleId,
} from '@/lib/product';
import { siteOrigin } from '@/lib/site';
import { ConfigError, getStripe } from '@/lib/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** How stale a locked-in timestamp may be before we make you pick a new one. */
const MAX_AGE_MS = 30 * 60 * 1000;
/** Small tolerance for clock skew between the browser and us. */
const MAX_SKEW_MS = 60 * 1000;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body.' }, { status: 400 });
  }

  const { epochMs, style, size, email } = (payload ?? {}) as Record<string, unknown>;

  if (!isStyleId(style)) {
    return NextResponse.json({ error: 'Pick a shirt style.' }, { status: 400 });
  }
  if (!isSizeId(size) || !STYLES[style].sizes.includes(size)) {
    return NextResponse.json({ error: 'That size is not available in this cut.' }, { status: 400 });
  }
  const ts = Number(epochMs);
  if (!isRenderableTimestamp(ts)) {
    return NextResponse.json({ error: 'That is not a printable timestamp.' }, { status: 400 });
  }

  const now = Date.now();
  if (ts > now + MAX_SKEW_MS) {
    return NextResponse.json({ error: 'We cannot print the future (yet).' }, { status: 400 });
  }
  if (ts < now - MAX_AGE_MS) {
    return NextResponse.json(
      { error: 'That moment has gone stale — grab a fresh one.', code: 'stale_timestamp' },
      { status: 409 },
    );
  }
  if (typeof email === 'string' && email.length > 0 && !EMAIL.test(email)) {
    return NextResponse.json({ error: 'That email address looks wrong.' }, { status: 400 });
  }

  try {
    const origin = siteOrigin();
    const stripe = getStripe();
    const paymentIntent = await stripe.paymentIntents.create({
      amount: PRICE_CENTS,
      currency: CURRENCY,
      automatic_payment_methods: { enabled: true },
      // Elements declares `captureMethod: 'automatic'`; with automatic payment
      // methods the API would otherwise default to `automatic_async` and
      // confirmation fails on the mismatch.
      capture_method: 'automatic',
      description: `datetime.store — ${style} tee, size ${size}, stamped ${ts}`,
      receipt_email: typeof email === 'string' && email ? email : undefined,
      metadata: {
        source: 'datetime.store',
        epoch_ms: String(ts),
        readable: describeTimestamp(ts, 'UTC'),
        style,
        size,
        sku: STYLES[style].sku,
        artwork_url: artworkUrl(origin, ts),
      },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: PRICE_CENTS,
      currency: CURRENCY,
    });
  } catch (error) {
    if (error instanceof ConfigError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    console.error('[checkout] failed to create payment intent', error);
    const message = error instanceof Error ? error.message : 'Could not start checkout.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
