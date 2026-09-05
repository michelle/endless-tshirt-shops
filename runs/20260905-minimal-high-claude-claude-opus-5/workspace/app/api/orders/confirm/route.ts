import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { siteOrigin } from '@/lib/env';
import { fulfill, readFulfillment } from '@/lib/fulfillment';
import { orderView } from '@/lib/orderView';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * The fast path: called ONCE by the browser the moment its payment succeeds,
 * so the buyer gets an order number without waiting on a webhook round trip.
 * Polling happens against /api/orders/status, which never mutates anything —
 * keeping the number of racers for the fulfilment lock as low as possible.
 */
export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Malformed request' }, { status: 400 });
  }

  const paymentIntentId = String(body?.paymentIntentId ?? '');
  const clientSecret = String(body?.clientSecret ?? '');
  if (!paymentIntentId || !clientSecret) {
    return NextResponse.json({ error: 'Missing order reference' }, { status: 400 });
  }

  let intent;
  try {
    intent = await stripe().paymentIntents.retrieve(paymentIntentId);
  } catch {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }
  // The client secret is the buyer's proof that this order is theirs.
  if (intent.client_secret !== clientSecret) {
    return NextResponse.json({ error: 'Order not found' }, { status: 403 });
  }

  let result = readFulfillment(intent);
  if (intent.status === 'succeeded' && result.status === 'awaiting_payment') {
    result = await fulfill(intent, siteOrigin(req));
  }

  return NextResponse.json(orderView(intent, result));
}
