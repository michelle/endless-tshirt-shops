import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { ensureFulfilled } from '@/lib/fulfill';

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: 'STRIPE_WEBHOOK_SECRET is not configured' },
      { status: 500 }
    );
  }

  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  const payload = await req.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(payload, signature, secret);
  } catch (err) {
    return NextResponse.json(
      { error: `Invalid signature: ${(err as Error).message}` },
      { status: 400 }
    );
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    try {
      const state = await ensureFulfilled(session.id);
      console.log(
        `[fulfill] session=${session.id} prodigiOrder=${state.prodigiOrderId} error=${state.error}`
      );
    } catch (err) {
      console.error(`[fulfill] session=${session.id} failed:`, err);
      // 500 so Stripe retries the delivery.
      return NextResponse.json(
        { error: 'Fulfillment failed; will retry' },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ received: true });
}
