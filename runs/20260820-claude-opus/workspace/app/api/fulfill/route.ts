/**
 * POST /api/fulfill
 *
 * Called by the browser after Stripe confirms the payment. Verifies the
 * PaymentIntent really succeeded (never trusting the client) and submits the
 * order to Scalable Press. Idempotent: safe to call repeatedly.
 *
 * The Stripe webhook at /api/stripe/webhook does the same work, so an
 * abandoned tab cannot lose an order.
 */

import { NextResponse } from 'next/server';
import { fulfillPaymentIntent } from '@/lib/fulfillment';
import { errorResponse } from '@/lib/api';
import { ValidationError } from '@/lib/order-request';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { paymentIntentId?: unknown };
    const id = body.paymentIntentId;

    if (typeof id !== 'string' || !/^pi_[A-Za-z0-9_]+$/.test(id)) {
      throw new ValidationError('A valid paymentIntentId is required.');
    }

    const result = await fulfillPaymentIntent(id);
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse('fulfill', error);
  }
}
