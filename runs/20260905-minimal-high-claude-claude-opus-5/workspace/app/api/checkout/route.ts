import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { CURRENCY, PRICE_CENTS } from '@/lib/products';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Opens a checkout session.
 *
 * Stripe Elements needs a PaymentIntent up front, before we know the buyer's
 * address, so we create it empty here and fill in the order details at
 * /api/checkout/prepare just before confirmation.
 */
export async function POST() {
  try {
    const intent = await stripe().paymentIntents.create({
      amount: PRICE_CENTS,
      currency: CURRENCY,
      // Cards and card-backed wallets only: this ships a physical object, and
      // BNPL/redirect methods do not reliably hand back a shipping address.
      payment_method_types: ['card', 'link'],
      description: 'datetime.store — one t-shirt, one moment',
      statement_descriptor_suffix: 'DATETIME',
      metadata: { product: 'datetime-tee', fulfillment_status: 'awaiting_payment' },
    });

    return NextResponse.json({
      paymentIntentId: intent.id,
      clientSecret: intent.client_secret,
      amount: PRICE_CENTS,
      currency: CURRENCY,
    });
  } catch (err) {
    console.error('[checkout] could not create PaymentIntent', err);
    return NextResponse.json(
      { error: 'Could not start checkout. Try again in a moment.' },
      { status: 502 },
    );
  }
}
