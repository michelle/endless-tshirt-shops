/**
 * POST /api/checkout
 *
 * Everything that must succeed before we are willing to take money:
 *   1. validate the order,
 *   2. upload the print artwork to Scalable Press,
 *   3. quote it against the real shipping address — this is what catches a bad
 *      address or an out-of-stock garment,
 *   4. create a PaymentIntent carrying the quote token in its metadata.
 *
 * The client then confirms that PaymentIntent. Nothing is sent to the printer
 * until Stripe confirms the payment (see lib/fulfill.ts).
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';

import { stripe } from '@/lib/stripe';
import {
  createDesign,
  createQuote,
  ScalablePressError,
  type ShippingAddress,
} from '@/lib/scalablepress';
import { decodeArtwork, isPlausibleTimestamp, describeTimestamp } from '@/lib/artwork';
import {
  COUNTRY,
  CURRENCY,
  PRICE_CENTS,
  SHIRT_SIZES,
  SHIRT_STYLES,
  SP_PRODUCTS,
  STYLE_LABELS,
} from '@/lib/catalog';

export const runtime = 'nodejs';
export const maxDuration = 60;

const trimmed = (max: number) => z.string().trim().min(1).max(max);

const BodySchema = z.object({
  style: z.enum(SHIRT_STYLES),
  size: z.enum(SHIRT_SIZES),
  epochMs: z.number().int().positive(),
  artwork: z.string().min(64),
  email: z.string().trim().email().max(200),
  address: z.object({
    name: trimmed(100),
    line1: trimmed(200),
    line2: z.string().trim().max(200).optional().nullable(),
    city: trimmed(100),
    state: trimmed(60),
    postalCode: trimmed(20),
    country: z.string().trim().length(2),
  }),
});

function fail(message: string, status: number, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return fail('Malformed request body.', 400);
  }

  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return fail(
      `Invalid order: ${first?.path.join('.') || 'body'} ${first?.message ?? ''}`.trim(),
      400,
    );
  }
  const order = parsed.data;

  if (order.address.country.toUpperCase() !== COUNTRY) {
    return fail('We can only ship within the United States right now.', 400);
  }

  const now = Date.now();
  if (!isPlausibleTimestamp(order.epochMs, now)) {
    return fail('That timestamp has gone stale — reload and try again.', 400);
  }

  const artwork = decodeArtwork(order.artwork);
  if (!artwork.ok) {
    return fail(artwork.error, 400);
  }

  const address: ShippingAddress = {
    name: order.address.name,
    address1: order.address.line1,
    ...(order.address.line2 ? { address2: order.address.line2 } : {}),
    city: order.address.city,
    state: order.address.state,
    zip: order.address.postalCode,
    country: COUNTRY,
  };

  // --- Printer: artwork, then price it against the address ---
  let designId: string;
  let quote;
  try {
    designId = await createDesign(artwork.buffer);
    quote = await createQuote({
      designId,
      style: order.style,
      size: order.size,
      address,
    });
  } catch (err) {
    if (err instanceof ScalablePressError) {
      console.error('[checkout] Scalable Press rejected the order', {
        status: err.status,
        message: err.message,
        issues: err.issues,
      });
      // Address problems are the customer's to fix; everything else is ours.
      const isCustomerFixable = err.issues.length > 0 || err.status === 400;
      return fail(
        isCustomerFixable
          ? err.message
          : 'Our printer is having a moment. Please try again shortly.',
        isCustomerFixable ? 422 : 502,
        err.issues.length ? { issues: err.issues } : {},
      );
    }
    console.error('[checkout] printer error', err);
    return fail('Could not reach our printer. Please try again shortly.', 502);
  }

  // --- Stripe: create the intent the client will confirm ---
  try {
    const intent = await stripe().paymentIntents.create(
      {
        amount: PRICE_CENTS,
        currency: CURRENCY,
        automatic_payment_methods: { enabled: true },
        // Must match the `captureMethod` the client passes to Elements, or
        // confirmation is refused.
        capture_method: 'automatic',
        receipt_email: order.email,
        description: `datetime.store — ${STYLE_LABELS[order.style]} ${order.size} @ ${order.epochMs}`,
        statement_descriptor_suffix: 'DATETIME STORE',
        // Shipping is deliberately not set here. Stripe writes it from the
        // Address Element when the client confirms, and a PaymentIntent whose
        // shipping was set with a secret key cannot be updated from the
        // browser. We keep our own copy in metadata as the printer's record.
        metadata: {
          ship_name: address.name,
          ship_line1: address.address1,
          ...(address.address2 ? { ship_line2: address.address2 } : {}),
          ship_city: address.city,
          ship_state: address.state,
          ship_postal_code: address.zip,
          ship_country: COUNTRY,
          sp_design_id: designId,
          sp_order_token: quote.orderToken,
          sp_order_status: 'pending',
          sp_product_id: SP_PRODUCTS[order.style],
          sp_quote_total: quote.total.toFixed(2),
          sp_mode: quote.mode ?? 'unknown',
          shirt_style: order.style,
          shirt_size: order.size,
          epoch_ms: String(order.epochMs),
          printed_at: describeTimestamp(order.epochMs),
          customer_email: order.email,
        },
      },
      // Two clicks on the same frozen timestamp should not become two intents.
      { idempotencyKey: `dts_${order.epochMs}_${quote.orderToken}` },
    );

    return NextResponse.json({
      clientSecret: intent.client_secret,
      paymentIntentId: intent.id,
      amount: intent.amount,
      currency: intent.currency,
      orderToken: quote.orderToken,
    });
  } catch (err) {
    console.error('[checkout] Stripe PaymentIntent failed', err);
    const message =
      err && typeof err === 'object' && 'message' in err
        ? String((err as { message: unknown }).message)
        : 'Could not start payment.';
    return fail(message, 502);
  }
}
