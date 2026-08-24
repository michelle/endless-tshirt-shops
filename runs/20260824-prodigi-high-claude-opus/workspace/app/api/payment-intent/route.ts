import type { NextRequest } from 'next/server';
import { stripe } from '@/lib/stripe';
import { ConfigError } from '@/lib/env';
import {
  CURRENCY,
  PRICE_CENTS,
  STYLES,
  isShirtSize,
  isShirtStyle,
} from '@/lib/catalog';
import { coerceTimestamp, describeTimestamp } from '@/lib/timestamp';

/**
 * Creates the PaymentIntent for one shirt.
 *
 * Called at the moment the customer submits the form, not on page load — that is
 * deliberate. Stripe's deferred intent creation lets the Payment Element mount
 * before an intent exists, so the timestamp we lock in here is the millisecond
 * the customer actually decided to buy, which is the entire product.
 *
 * The price is fixed server-side; the client only gets to choose the cut, the
 * size, and (within a tolerance) the moment.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Expected a JSON body.' }, { status: 400 });
  }

  const { timestampMs, style, size, email } = (body ?? {}) as Record<string, unknown>;

  if (!isShirtStyle(style)) {
    return Response.json({ error: 'Pick a shirt style: fitted or unisex.' }, { status: 400 });
  }
  if (!isShirtSize(size)) {
    return Response.json({ error: 'Pick a size: S, M, L or XL.' }, { status: 400 });
  }

  const receiptEmail =
    typeof email === 'string' && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())
      ? email.trim().slice(0, 254)
      : undefined;

  // The client proposes the millisecond it clicked; we accept it only if it is
  // close to our own clock, otherwise the shirt gets stamped with server time.
  const timestamp = coerceTimestamp(
    typeof timestampMs === 'number' ? timestampMs : Number(timestampMs),
  );

  try {
    const intent = await stripe().paymentIntents.create({
      amount: PRICE_CENTS,
      currency: CURRENCY,
      automatic_payment_methods: { enabled: true },
      receipt_email: receiptEmail,
      description: `datetime.store — ${STYLES[style].label} tee (${size}) stamped ${timestamp}`,
      statement_descriptor_suffix: 'DATETIME',
      metadata: {
        timestamp_ms: String(timestamp),
        timestamp_iso: describeTimestamp(timestamp),
        style,
        size,
        sku: STYLES[style].sku,
        product: 'datetime-tee',
      },
    });

    return Response.json({
      clientSecret: intent.client_secret,
      paymentIntentId: intent.id,
      timestampMs: timestamp,
      amount: PRICE_CENTS,
      currency: CURRENCY,
    });
  } catch (error) {
    if (error instanceof ConfigError) {
      console.error('[payment-intent] configuration error', error.message);
      return Response.json(
        { error: 'The shop is not fully configured yet. Please try again later.' },
        { status: 503 },
      );
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[payment-intent] failed', message);
    return Response.json({ error: `Could not start checkout: ${message}` }, { status: 502 });
  }
}
