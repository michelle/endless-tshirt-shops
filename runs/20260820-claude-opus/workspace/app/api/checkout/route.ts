/**
 * POST /api/checkout
 *
 * Prepares an order and returns a PaymentIntent client secret. Runs before any
 * money moves, so the expensive/failure-prone print-partner work happens first:
 *
 *   1. Upload artwork  -> designId
 *   2. Order-ready quote (design + product + address) -> orderToken
 *   3. PaymentIntent carrying the order in its metadata
 *
 * If step 2 fails in a retryable way we fall back to a quote-only pricing call
 * so the customer can still buy; the order is marked `deferred` and submitted
 * on replay. We never let a print-partner outage block a sale.
 */

import { NextResponse } from 'next/server';
import { createDesign, createQuote, ScalablePressError } from '@/lib/scalablepress';
import { parseCheckoutRequest } from '@/lib/order-request';
import { stripe } from '@/lib/stripe';
import { CURRENCY, PRICE_CENTS, STYLE_LABEL } from '@/lib/catalog';
import { referenceFor, type FulfillmentState } from '@/lib/fulfillment';
import { errorResponse } from '@/lib/api';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const order = parseCheckoutRequest(await request.json());

    const designId = await createDesign(order.artwork);

    let orderToken: string | null = null;
    let fulfillmentState: FulfillmentState = 'ready';
    let quoteNote: string | null = null;

    try {
      const quote = await createQuote({
        designId,
        style: order.style,
        size: order.size,
        address: order.address,
      });

      orderToken = quote.orderToken;

      if (!orderToken) {
        // Scalable Press understood the request but won't make it order-ready
        // (bad address, unavailable size, ...). Surface that to the customer.
        const blocking = quote.orderIssues.filter((issue) => issue.path !== 'payment');
        if (blocking.length) {
          return NextResponse.json(
            {
              error: {
                message: 'We could not fulfill this order as entered.',
                code: 'order_not_fulfillable',
              },
              issues: blocking,
            },
            { status: 422 },
          );
        }
        fulfillmentState = 'deferred';
      }
    } catch (error) {
      if (error instanceof ScalablePressError && error.retryable) {
        // Print partner is down. Keep the sale, defer the print submission.
        console.warn('[checkout] deferring fulfillment:', error.message);
        fulfillmentState = 'deferred';
        quoteNote = 'print_partner_unavailable_at_checkout';
      } else {
        throw error;
      }
    }

    const printedAt = new Date(order.capturedAt).toISOString();

    const paymentIntent = await stripe().paymentIntents.create(
      {
        amount: PRICE_CENTS,
        currency: CURRENCY,
        payment_method_types: ['card'],
        receipt_email: order.email,
        description: `datetime.store — ${STYLE_LABEL[order.style]} ${order.size} tee printed ${printedAt}`,
        statement_descriptor_suffix: 'DATETIME',
        shipping: {
          name: order.address.name,
          address: {
            line1: order.address.address1,
            line2: order.address.address2,
            city: order.address.city,
            state: order.address.state,
            postal_code: order.address.zip,
            country: 'US',
          },
        },
        metadata: {
          sp_design_id: designId,
          sp_order_token: orderToken ?? '',
          fulfillment_state: fulfillmentState,
          shirt_style: order.style,
          shirt_size: order.size,
          printed_at: printedAt,
          printed_epoch_ms: String(order.capturedAt),
          customer_email: order.email,
          ...(quoteNote ? { quote_note: quoteNote } : {}),
        },
      },
      // Retrying the same design must not create a second charge.
      { idempotencyKey: `checkout_${designId}` },
    );

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      reference: referenceFor(paymentIntent.id),
      amount: PRICE_CENTS,
      currency: CURRENCY,
      designId,
    });
  } catch (error) {
    return errorResponse('checkout', error);
  }
}
