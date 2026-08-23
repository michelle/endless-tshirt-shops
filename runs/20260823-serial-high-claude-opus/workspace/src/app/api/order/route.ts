import { NextResponse } from 'next/server';

import { fulfill } from '@/lib/fulfillment';
import { toOrderRecord, toPublicOrder } from '@/lib/orders';
import { stripe } from '@/lib/stripe';

/**
 * Order status for the confirmation page.
 *
 * Authorisation is the PaymentIntent's own client secret — the same value Stripe
 * hands the browser — so order state can't be enumerated by guessing ids.
 *
 * `POST` additionally kicks fulfilment. That makes the confirmation page a
 * fallback path for the webhook: if the webhook is slow, misconfigured, or the
 * customer came back via a redirect payment method, the order still gets placed.
 */

export const runtime = 'nodejs';
export const maxDuration = 60;

async function loadAuthorized(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get('payment_intent');
  const secret = url.searchParams.get('payment_intent_client_secret');

  if (!id || !secret) {
    return { error: NextResponse.json({ error: { message: 'Missing order reference.' } }, { status: 400 }) };
  }

  const pi = await stripe().paymentIntents.retrieve(id).catch(() => null);
  if (!pi || pi.client_secret !== secret) {
    return { error: NextResponse.json({ error: { message: 'Order not found.' } }, { status: 404 }) };
  }
  return { pi };
}

export async function GET(request: Request) {
  const loaded = await loadAuthorized(request);
  if (loaded.error) return loaded.error;
  return NextResponse.json({ order: toPublicOrder(toOrderRecord(loaded.pi)) });
}

export async function POST(request: Request) {
  const loaded = await loadAuthorized(request);
  if (loaded.error) return loaded.error;

  const outcome = await fulfill(loaded.pi.id);
  return NextResponse.json({
    order: toPublicOrder(outcome.record),
    outcome: outcome.status,
  });
}
