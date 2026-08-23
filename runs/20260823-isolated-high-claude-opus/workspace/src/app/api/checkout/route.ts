import { NextResponse } from 'next/server';
import {
  CURRENCY,
  PRICE_CENTS,
  STYLE_SPECS,
  SP_SIZE_CODES,
  formatUsd,
} from '@/lib/catalog';
import { log, redactAddressForLog } from '@/lib/log';
import { ScalablePressError, createDesign, createQuote } from '@/lib/scalablepress';
import { checkoutRequestSchema, decodeArtwork } from '@/lib/schema';
import { APP_TAG, stripe, type OrderMetadata } from '@/lib/stripe';

export const runtime = 'nodejs';
/** Artwork upload + two Scalable Press round trips. Comfortably inside this. */
export const maxDuration = 60;

/**
 * Creates a PaymentIntent for one shirt.
 *
 * Order of operations matters: we upload the artwork and get an order-ready
 * quote from Scalable Press *before* creating the PaymentIntent. A bad address
 * or an out-of-stock size therefore fails before the customer is ever charged,
 * and by the time money moves we already hold an order token we know is good.
 */
export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return badRequest('Malformed request body.');
  }

  const parsed = checkoutRequestSchema.safeParse(payload);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return badRequest(
      first ? `${first.path.join('.') || 'request'}: ${first.message}` : 'Invalid request.',
    );
  }
  const { email, address, style, size, timestamp, artwork } = parsed.data;

  let artworkPng: Buffer;
  try {
    artworkPng = decodeArtwork(artwork);
  } catch (err) {
    return badRequest((err as Error).message);
  }

  const spec = STYLE_SPECS[style];
  const reference = `datetime.store ${timestamp}`;

  try {
    const designId = await createDesign(artworkPng);
    log.info('checkout.design_created', { designId, bytes: artworkPng.byteLength });

    const quote = await createQuote({
      designId,
      style,
      size,
      address,
      email,
      reference,
    });
    log.info('checkout.quoted', {
      designId,
      orderToken: quote.orderToken,
      costUsd: quote.total,
      slaDays: quote.sla?.[0]?.days,
      ...redactAddressForLog(address),
    });

    const metadata: OrderMetadata = {
      app: APP_TAG,
      sp_design_id: designId,
      sp_order_token: quote.orderToken,
      sp_status: 'pending',
      sp_cost_usd: String(quote.total),
      style,
      size,
      shirt_timestamp: String(timestamp),
    };

    const intent = await stripe().paymentIntents.create(
      {
        amount: PRICE_CENTS,
        currency: CURRENCY,
        automatic_payment_methods: { enabled: true },
        receipt_email: email,
        description: `datetime.store — ${spec.label.toLowerCase()} tee, size ${size}, reading ${timestamp}`,
        metadata,
        shipping: {
          name: address.name,
          address: {
            line1: address.address1,
            line2: address.address2 || undefined,
            city: address.city,
            state: address.state,
            postal_code: address.zip,
            country: address.country,
          },
        },
      },
      // If the customer double-clicks Buy, reuse the same PaymentIntent rather
      // than creating a second one against the same order token.
      { idempotencyKey: `pi:${quote.orderToken}` },
    );

    log.info('checkout.intent_created', {
      paymentIntent: intent.id,
      orderToken: quote.orderToken,
      amount: PRICE_CENTS,
    });

    return NextResponse.json({
      clientSecret: intent.client_secret,
      paymentIntentId: intent.id,
      amount: PRICE_CENTS,
      amountFormatted: formatUsd(PRICE_CENTS),
      shirt: {
        productId: spec.productId,
        color: spec.color,
        sizeCode: SP_SIZE_CODES[size],
        timestamp,
      },
    });
  } catch (err) {
    if (err instanceof ScalablePressError) {
      log.warn('checkout.sp_error', {
        step: err.step,
        status: err.status,
        message: err.message,
        issues: err.issues,
      });
      // 502 for a print-partner outage, 400 for something the customer can fix.
      return NextResponse.json(
        { error: err.customerMessage, issues: err.issues },
        { status: err.status >= 500 ? 502 : 400 },
      );
    }
    log.error('checkout.error', { message: (err as Error).message });
    return NextResponse.json(
      { error: 'Something went wrong setting up your order. Please try again.' },
      { status: 500 },
    );
  }
}

function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}
