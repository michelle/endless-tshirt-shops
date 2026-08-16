/**
 * Step 1 of checkout.
 *
 * Uploads the customer's timestamp artwork, gets a real Scalable Press quote
 * (which validates the address and stock), then opens a PaymentIntent for our
 * flat retail price. Nothing is charged here — the browser confirms the
 * PaymentIntent next.
 */

import { NextResponse } from 'next/server';
import { CURRENCY, PRICE_CENTS, SIZES, STYLES } from '@/lib/catalog';
import { createDesign, createQuote, ScalablePressError } from '@/lib/scalablepress';
import { stripe } from '@/lib/stripe';
import { parseQuoteRequest, ValidationError } from '@/lib/validate';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const req = parseQuoteRequest(await request.json());

    const designId = await createDesign(req.artwork);
    const quote = await createQuote({
      designId,
      style: req.style,
      size: req.size,
      address: req.address,
    });

    const product = STYLES[req.style];
    const intent = await stripe().paymentIntents.create(
      {
        amount: PRICE_CENTS,
        currency: CURRENCY,
        // Card only: this is a physical good with an on-page shipping form, and
        // redirect-based methods would complicate the fulfillment handoff.
        payment_method_types: ['card'],
        receipt_email: req.email,
        description: `datetime.store shirt · ${req.timestamp}`,
        statement_descriptor_suffix: 'DATETIME',
        shipping: {
          name: req.address.name,
          address: {
            line1: req.address.address1,
            line2: req.address.address2 || undefined,
            city: req.address.city,
            state: req.address.state,
            postal_code: req.address.zip,
            country: 'US',
          },
        },
        metadata: {
          sp_design_id: designId,
          sp_order_token: quote.orderToken,
          sp_product_id: product.productId,
          sp_color: product.color,
          sp_size: SIZES[req.size],
          shirt_style: req.style,
          shirt_size: req.size,
          shirt_timestamp: String(req.timestamp),
          // Our cost, for margin reporting in the Stripe dashboard.
          fulfillment_cost_usd: quote.total.toFixed(2),
          customer_email: req.email,
        },
      },
      // Two clicks on "Buy now" for the same design must not open two payments.
      { idempotencyKey: `pi_${quote.orderToken}` },
    );

    return NextResponse.json({
      clientSecret: intent.client_secret,
      paymentIntentId: intent.id,
      amount: PRICE_CENTS,
      currency: CURRENCY,
      shipsInBusinessDays: quote.slaDays,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

function errorResponse(error: unknown) {
  if (error instanceof ValidationError) {
    return NextResponse.json({ error: { message: error.message } }, { status: 400 });
  }
  if (error instanceof ScalablePressError) {
    console.error('[quote] scalable press', error.message, error.issues);
    return NextResponse.json(
      { error: { message: error.clientMessage }, issues: error.issues },
      { status: error.status },
    );
  }
  if (error instanceof SyntaxError) {
    return NextResponse.json({ error: { message: 'Malformed request.' } }, { status: 400 });
  }
  console.error('[quote] unexpected', error);
  return NextResponse.json(
    { error: { message: 'We could not start checkout. Nothing was charged — please try again.' } },
    { status: 500 },
  );
}
