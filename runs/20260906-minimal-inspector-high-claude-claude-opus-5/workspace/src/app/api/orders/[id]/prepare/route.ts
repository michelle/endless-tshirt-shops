import { NextResponse } from 'next/server';
import { z } from 'zod';
import { siteOrigin } from '@/lib/env';
import { artworkUrl, describeError } from '@/lib/fulfillment';
import { ProdigiError, quoteShirt } from '@/lib/prodigi';
import {
  SHIP_TO_COUNTRIES,
  SIZES,
  STYLE_IDS,
  isPlausibleCapturedAt,
  prodigiItemAttributes,
  skuFor,
} from '@/lib/product';
import { clientSecretMatches, stripe } from '@/lib/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PrepareSchema = z.object({
  clientSecret: z.string().min(10),
  capturedAt: z.number().int(),
  style: z.enum(STYLE_IDS as [string, ...string[]]),
  size: z.enum(SIZES as unknown as [string, ...string[]]),
  email: z.string().email().max(200),
  shipping: z.object({
    name: z.string().min(1).max(120),
    line1: z.string().min(1).max(200),
    line2: z.string().max(200).optional().nullable(),
    city: z.string().min(1).max(100),
    state: z.string().max(60).optional().nullable(),
    postalCode: z.string().min(3).max(20),
    country: z.enum(SHIP_TO_COUNTRIES as unknown as [string, ...string[]]),
  }),
});

/**
 * Attaches the actual order to a draft PaymentIntent, immediately before the
 * browser confirms payment.
 *
 * Everything that fulfilment later depends on is written here with the secret
 * key, so it cannot be tampered with client-side, and Prodigi is asked whether
 * it can make and ship this shirt before any card is touched — the same
 * pre-flight the original store did.
 */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Malformed request body.' }, { status: 400 });
  }

  const parsed = PrepareSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Please check the shipping details and try again.',
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const { clientSecret, capturedAt, style, size, email, shipping } = parsed.data;

  if (!isPlausibleCapturedAt(capturedAt)) {
    return NextResponse.json(
      { error: 'That timestamp has gone stale. Refresh the page to grab a fresh one.' },
      { status: 400 },
    );
  }

  try {
    if (!id.startsWith('pi_')) {
      return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
    }
    const paymentIntent = await stripe().paymentIntents.retrieve(id);
    if (!clientSecretMatches(paymentIntent.client_secret, clientSecret)) {
      return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
    }
    if (paymentIntent.metadata?.prodigi_order_id) {
      return NextResponse.json({ error: 'That order has already been placed.' }, { status: 409 });
    }

    const sku = skuFor(style as never);
    const attributes = prodigiItemAttributes(size as never);

    const quote = await quoteShirt({
      sku,
      attributes,
      destinationCountryCode: shipping.country,
    });
    if (!quote.ok) {
      return NextResponse.json(
        {
          error: "Our printer can't make that shirt right now.",
          issues: quote.issues.map((i) => i.description ?? i.errorCode ?? 'Unknown issue'),
        },
        { status: 409 },
      );
    }

    const origin = siteOrigin(request.url);
    await stripe().paymentIntents.update(id, {
      receipt_email: email,
      description: `datetime.store — ${style} tee, size ${size}, stamped ${capturedAt}`,
      metadata: {
        capturedAt: String(capturedAt),
        style,
        size,
        sku,
        origin,
        artwork_url: artworkUrl(capturedAt, origin),
        printer_cost: quote.totalCost ? `${quote.totalCost.amount} ${quote.totalCost.currency}` : '',
        ship_name: shipping.name,
        ship_line1: shipping.line1,
        ship_line2: shipping.line2 ?? '',
        ship_city: shipping.city,
        ship_state: shipping.state ?? '',
        ship_postal: shipping.postalCode,
        ship_country: shipping.country,
        fulfillment_state: 'pending',
      },
    });

    return NextResponse.json({ ok: true, orderRef: id, capturedAt });
  } catch (error) {
    const message = describeError(error);
    console.error('[prepare] failed', id, message);
    return NextResponse.json(
      { error: 'We could not start that order. Nothing was charged.', detail: message.slice(0, 300) },
      { status: error instanceof ProdigiError ? 502 : 500 },
    );
  }
}
