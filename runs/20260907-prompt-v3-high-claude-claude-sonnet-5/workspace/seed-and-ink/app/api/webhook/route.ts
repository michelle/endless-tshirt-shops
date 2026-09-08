import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { fulfillCheckoutSession } from '@/lib/fulfillment';

export const runtime = 'nodejs';

// This is the only place an order is allowed to reach Prodigi: we only
// place the print order once Stripe confirms the session actually paid.
export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature');
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const rawBody = await req.text();

  if (!sig || !secret) {
    console.error('Webhook missing signature header or STRIPE_WEBHOOK_SECRET');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (err: any) {
    console.error('Webhook signature verification failed', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    if (
      event.type === 'checkout.session.completed' ||
      event.type === 'checkout.session.async_payment_succeeded'
    ) {
      const sessionStub = event.data.object as Stripe.Checkout.Session;
      // Re-fetch to get the fully expanded shipping/customer details and
      // the freshest payment_status, rather than trusting the event payload.
      const session = await stripe.checkout.sessions.retrieve(sessionStub.id);

      if (session.payment_status === 'paid') {
        const result = await fulfillCheckoutSession(session);
        console.log(
          `Prodigi order placed for session ${session.id}:`,
          result.order?.id,
          result.outcome,
        );
      } else {
        console.log(
          `Session ${session.id} completed but not yet paid (payment_status=${session.payment_status}); waiting for async_payment_succeeded.`,
        );
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('Webhook handling failed', err);
    // Non-2xx so Stripe retries; fulfillCheckoutSession's idempotencyKey
    // means a retry can't cause a duplicate print order.
    return NextResponse.json({ error: 'Fulfillment failed' }, { status: 500 });
  }
}
