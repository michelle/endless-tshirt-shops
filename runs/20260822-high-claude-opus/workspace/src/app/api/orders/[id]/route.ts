/**
 * GET /api/orders/:paymentIntentId?client_secret=...
 *
 * Order status for the confirmation page, and a safety net: if the webhook has
 * not run (or is not configured at all) this places the printer order itself.
 * That keeps the store fully functional on a fresh preview deployment before
 * anyone has wired up a webhook endpoint.
 *
 * The client secret is required as proof the caller is the buyer — a
 * PaymentIntent id alone must not reveal someone's shipping details.
 */

import { NextResponse } from 'next/server';

import { stripe } from '@/lib/stripe';
import { fulfillPaymentIntent } from '@/lib/fulfill';
import { getOrderView } from '@/lib/orderView';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const clientSecret = new URL(request.url).searchParams.get('client_secret');

  if (!id.startsWith('pi_')) {
    return NextResponse.json({ error: 'Not an order id.' }, { status: 400 });
  }

  let intent;
  try {
    intent = await stripe().paymentIntents.retrieve(id);
  } catch {
    return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
  }

  if (!clientSecret || clientSecret !== intent.client_secret) {
    return NextResponse.json({ error: 'Not authorised for this order.' }, { status: 403 });
  }

  const fulfillment = await fulfillPaymentIntent(intent);

  return NextResponse.json({
    order: getOrderView(intent, fulfillment),
  });
}
