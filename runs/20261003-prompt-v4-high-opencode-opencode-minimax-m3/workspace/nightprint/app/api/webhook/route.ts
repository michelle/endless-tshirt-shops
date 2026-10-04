/**
 * /api/webhook - Stripe webhook endpoint.
 *
 * We only need to handle `checkout.session.completed` to trigger fulfillment.
 * The route verifies the signature using STRIPE_WEBHOOK_SECRET so it can't
 * be called by an attacker to submit orders.
 *
 * Configuration:
 *  1. In the Stripe dashboard, point one webhook at <site>/api/webhook.
 *  2. Subscribe to `checkout.session.completed`.
 *  3. Copy the signing secret into env as STRIPE_WEBHOOK_SECRET.
 *  4. For local testing run `stripe listen --forward-to localhost:3000/api/webhook`.
 */
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { getOrder, updateOrder } from '@/lib/storage';
import { submitOrderToProdigi } from '@/lib/fulfill';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: 'stripe not configured' }, { status: 503 });
  }

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'webhook secret missing' }, { status: 400 });
  }

  const sig = req.headers.get('stripe-signature');
  if (!sig) {
    return NextResponse.json({ error: 'missing signature' }, { status: 400 });
  }

  // Stripe requires the raw body for signature verification.
  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err: any) {
    return NextResponse.json(
      { error: `signature verification failed: ${err?.message ?? ''}` },
      { status: 400 }
    );
  }

  if (event.type !== 'checkout.session.completed') {
    return NextResponse.json({ received: true, handler: 'ignored' });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const orderId = session.metadata?.orderId;
  if (!orderId) {
    return NextResponse.json(
      { error: 'session missing orderId metadata' },
      { status: 400 }
    );
  }

  const order = await getOrder(orderId);
  if (!order) {
    return NextResponse.json({ error: `unknown orderId ${orderId}` }, { status: 404 });
  }

  await updateOrder(orderId, { status: 'paid' });

  try {
    await submitOrderToProdigi(orderId);
  } catch (err: any) {
    await updateOrder(orderId, { status: 'failed', error: err?.message ?? 'unknown' });
    return NextResponse.json(
      { error: `prodigi submit failed: ${err?.message ?? ''}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true, orderId });
}
