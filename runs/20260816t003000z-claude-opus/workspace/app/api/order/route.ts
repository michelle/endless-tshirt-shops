/**
 * Step 2 of checkout: the browser reports a confirmed payment, we send the
 * order to production and hand back the order reference.
 */

import { NextResponse } from 'next/server';
import { fulfillPaymentIntent, orderReference, PaymentNotReadyError } from '@/lib/fulfill';
import { ScalablePressError } from '@/lib/scalablepress';
import { stripe } from '@/lib/stripe';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request) {
  let paymentIntentId: string;
  try {
    const body = (await request.json()) as { paymentIntentId?: unknown };
    if (typeof body.paymentIntentId !== 'string' || !body.paymentIntentId.startsWith('pi_')) {
      return NextResponse.json({ error: { message: 'Missing payment reference.' } }, { status: 400 });
    }
    paymentIntentId = body.paymentIntentId;
  } catch {
    return NextResponse.json({ error: { message: 'Malformed request.' } }, { status: 400 });
  }

  try {
    const intent = await stripe().paymentIntents.retrieve(paymentIntentId);
    const result = await fulfillPaymentIntent(intent);

    return NextResponse.json({
      reference: orderReference(intent),
      orderId: result.orderId,
      live: result.live,
      style: intent.metadata?.shirt_style ?? null,
      size: intent.metadata?.shirt_size ?? null,
      timestamp: intent.metadata?.shirt_timestamp ?? null,
      email: intent.receipt_email,
    });
  } catch (error) {
    if (error instanceof PaymentNotReadyError) {
      return NextResponse.json(
        { error: { message: 'That payment has not completed yet.' }, paymentStatus: error.paymentStatus },
        { status: 409 },
      );
    }
    if (error instanceof ScalablePressError) {
      // The customer has been charged at this point, so be explicit: we own the
      // problem, and the webhook will retry fulfillment.
      console.error('[order] scalable press', error.message, error.issues);
      return NextResponse.json(
        {
          error: {
            message:
              'Your payment succeeded but our print partner rejected the order. We have been notified and will fix it or refund you.',
          },
          issues: error.issues,
        },
        { status: 502 },
      );
    }
    console.error('[order] unexpected', error);
    return NextResponse.json(
      { error: { message: 'Something went wrong finalizing your order. Contact support.' } },
      { status: 500 },
    );
  }
}
