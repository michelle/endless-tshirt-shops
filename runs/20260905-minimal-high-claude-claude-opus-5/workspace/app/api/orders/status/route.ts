import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { readFulfillment } from '@/lib/fulfillment';
import { orderView } from '@/lib/orderView';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Read-only view of an order, safe to poll. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const paymentIntentId = url.searchParams.get('payment_intent') ?? '';
  const clientSecret = url.searchParams.get('client_secret') ?? '';
  if (!paymentIntentId || !clientSecret) {
    return NextResponse.json({ error: 'Missing order reference' }, { status: 400 });
  }

  let intent;
  try {
    intent = await stripe().paymentIntents.retrieve(paymentIntentId);
  } catch {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }
  if (intent.client_secret !== clientSecret) {
    return NextResponse.json({ error: 'Order not found' }, { status: 403 });
  }

  return NextResponse.json(orderView(intent, readFulfillment(intent)), {
    headers: { 'Cache-Control': 'no-store' },
  });
}
