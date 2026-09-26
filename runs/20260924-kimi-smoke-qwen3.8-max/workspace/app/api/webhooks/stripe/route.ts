import { NextRequest, NextResponse } from 'next/server';
import { constructStripeEvent } from '@/lib/stripe';
import { verifyOrderToken } from '@/lib/orders';
import { fulfillOrder } from '@/lib/fulfill';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * POST /api/webhooks/stripe
 *
 * The production fulfilment trigger. On checkout.session.completed we
 * verify the signature, re-verify our signed order token from the session
 * metadata, and only then create the Prodigi order. Prodigi's
 * idempotencyKey makes webhook retries safe.
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  let event: any;
  try {
    event = constructStripeEvent(rawBody, req.headers.get('stripe-signature'));
  } catch (e) {
    console.error('stripe webhook verification failed:', (e as Error).message);
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data?.object;
    const paymentStatus = session?.payment_status; // 'paid' | 'unpaid' | 'no_payment_required'
    if (paymentStatus === 'paid' || paymentStatus === 'no_payment_required') {
      const token = session?.metadata?.orderToken;
      const order = token ? verifyOrderToken(String(token)) : null;
      if (order) {
        order.payment.provider = 'stripe';
        order.payment.reference = String(session.payment_intent ?? session.id ?? '');
        order.payment.paidAt = Date.now();
        const result = await fulfillOrder(order);
        if (!result.ok) {
          // Return 500 so Stripe retries the webhook — Prodigi idempotency
          // protects against duplicate print orders on replay.
          console.error('fulfilment failed after stripe payment', result.error);
          return NextResponse.json({ error: 'fulfilment failed' }, { status: 500 });
        }
      } else {
        console.error('stripe webhook: missing/invalid order token', { sessionId: session?.id });
      }
    }
  }

  return NextResponse.json({ received: true });
}
