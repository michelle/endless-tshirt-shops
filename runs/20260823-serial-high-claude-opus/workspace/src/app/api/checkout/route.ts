import { NextResponse } from 'next/server';
import type Stripe from 'stripe';

import { PRICING, SP_PRODUCTS } from '@/lib/catalog';
import { FULFILLMENT_META } from '@/lib/orders';
import {
  ScalablePressError,
  createDesign,
  createQuote,
  type SpAddress,
  type SpIssue,
} from '@/lib/scalablepress';
import { stripe } from '@/lib/stripe';
import { checkoutSchema, timestampIsFresh } from '@/lib/validation';

/**
 * Prepares a purchase. In order:
 *
 *   1. Validate the order (including that the timestamp is actually *now*).
 *   2. Upload the artwork to Scalable Press and quote it against the real
 *      shipping address, so an undeliverable address fails *before* we charge.
 *   3. Create (or reuse) a PaymentIntent carrying everything fulfilment needs.
 *
 * If Scalable Press is unreachable we still let the sale happen and flag the
 * order for deferred fulfilment — losing the customer is worse than queueing.
 * If Scalable Press *rejects* the order, we stop here and never charge.
 */

export const runtime = 'nodejs';
export const maxDuration = 60;

const REUSABLE_STATUSES: Stripe.PaymentIntent.Status[] = [
  'requires_payment_method',
  'requires_confirmation',
  'requires_action',
];

function badRequest(message: string, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ error: { message, ...extra } }, { status: 400 });
}

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return badRequest('Expected a JSON body.');
  }

  const parsed = checkoutSchema.safeParse(json);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return badRequest(
      `${first?.path.join('.') || 'request'}: ${first?.message ?? 'is invalid'}`,
      { code: 'invalid_request' },
    );
  }
  const input = parsed.data;

  if (!timestampIsFresh(input.timestampMs)) {
    return badRequest(
      'That timestamp is stale — reload the page so your shirt says the right time.',
      { code: 'stale_timestamp' },
    );
  }

  const address: SpAddress = {
    name: input.address.name,
    address1: input.address.address1,
    address2: input.address.address2 || undefined,
    city: input.address.city,
    state: input.address.state,
    zip: input.address.zip,
    country: input.address.country,
    phone: input.address.phone || undefined,
    email: input.email,
  };

  // ---- Scalable Press: design + quote (pre-charge validation) ----
  let designId: string | null = null;
  let orderToken: string | null = null;
  let costCents = 0;
  let spMode: string | null = null;
  let printerAvailable = true;
  let degradedReason: string | null = null;

  try {
    const design = await createDesign(input.timestampMs);
    designId = design.designId;
    spMode = design.mode ?? null;

    const quote = await createQuote({
      designId,
      style: input.style,
      size: input.size,
      address,
    });

    if (!quote.orderToken) {
      const issues: SpIssue[] = quote.orderIssues.length
        ? quote.orderIssues
        : [{ message: 'The printer could not accept this order.' }];
      return NextResponse.json(
        {
          error: {
            message:
              issues[0]?.message ??
              'The printer could not accept this order. Please check your address.',
            code: 'printer_rejected',
          },
          issues,
        },
        { status: 422 },
      );
    }

    orderToken = quote.orderToken;
    costCents = quote.totalCents;
    spMode = quote.mode ?? spMode;
  } catch (cause) {
    if (cause instanceof ScalablePressError && cause.kind === 'validation') {
      return NextResponse.json(
        {
          error: {
            message: cause.issues[0]?.message ?? cause.message,
            code: 'printer_rejected',
          },
          issues: cause.issues,
        },
        { status: 422 },
      );
    }
    // Availability problem (or artwork/render failure). Take the order anyway
    // and let the fulfilment worker catch up.
    printerAvailable = false;
    degradedReason = cause instanceof Error ? cause.message : 'Printer unavailable';
    console.warn('[checkout] proceeding with deferred fulfilment:', degradedReason);
  }

  // ---- Stripe: create or update the PaymentIntent ----
  const metadata: Record<string, string> = {
    [FULFILLMENT_META.state]: 'awaiting_payment',
    [FULFILLMENT_META.timestampMs]: String(input.timestampMs),
    [FULFILLMENT_META.style]: input.style,
    [FULFILLMENT_META.size]: input.size,
    [FULFILLMENT_META.designId]: designId ?? '',
    [FULFILLMENT_META.orderToken]: orderToken ?? '',
    [FULFILLMENT_META.costCents]: String(costCents),
    [FULFILLMENT_META.mode]: spMode ?? '',
    [FULFILLMENT_META.error]: printerAvailable ? '' : (degradedReason ?? ''),
    // The address we quoted, and the one we will ship to. Deliberately *not*
    // `PaymentIntent.shipping`: Stripe.js sets that itself when it confirms
    // alongside an AddressElement, and it will not overwrite a value written by
    // a restricted key — which every Stripe sandbox key is. See readAddress().
    [FULFILLMENT_META.address]: JSON.stringify(address),
  };

  const description = `datetime.store — ${SP_PRODUCTS[input.style].label} (${input.size}), ${input.timestampMs}`;

  try {
    let intent: Stripe.PaymentIntent | null = null;

    if (input.paymentIntentId) {
      const existing = await stripe()
        .paymentIntents.retrieve(input.paymentIntentId)
        .catch(() => null);
      if (existing && REUSABLE_STATUSES.includes(existing.status)) {
        intent = await stripe().paymentIntents.update(existing.id, {
          amount: PRICING.amount,
          description,
          receipt_email: input.email,
          metadata,
        });
      }
    }

    if (!intent) {
      intent = await stripe().paymentIntents.create({
        amount: PRICING.amount,
        currency: PRICING.currency,
        description,
        receipt_email: input.email,
        metadata,
        automatic_payment_methods: { enabled: true },
        // Must match `captureMethod` in stripe-client.ts or confirm is rejected:
        // in the deferred-intent flow Elements is configured before the intent
        // exists, and Stripe.js checks the two agree. Synchronous capture (not
        // the `automatic_async` default) so the customer reaches the
        // confirmation page already paid rather than `processing`.
        capture_method: 'automatic',
      });
    }

    return NextResponse.json({
      clientSecret: intent.client_secret,
      paymentIntentId: intent.id,
      amountCents: intent.amount,
      currency: intent.currency,
      printerAvailable,
      testMode: spMode === 'test',
    });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Could not start checkout.';
    console.error('[checkout] stripe error:', message);
    return NextResponse.json(
      { error: { message: 'Could not start checkout. Please try again.', code: 'stripe_error' } },
      { status: 502 },
    );
  }
}
