import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { stripe } from '../../../../lib/stripe';
import { fulfillSession } from '../../../../lib/fulfill';
import { baseUrlFromRequest } from '../../../../lib/url';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

/**
 * Stripe webhook — the robust fulfilment path (it fires even if the customer
 * closes the browser before the success redirect lands). Disabled unless
 * STRIPE_WEBHOOK_SECRET is configured; the return-URL path in /success covers
 * the same ground with the same payment gate, so nothing depends on this.
 */
export async function POST(req: Request): Promise<Response> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { received: false, error: 'webhook handling is not configured (STRIPE_WEBHOOK_SECRET missing)' },
      { status: 501 },
    );
  }

  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ received: false, error: 'missing stripe-signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const raw = await req.text();
    event = await stripe().webhooks.constructEventAsync(raw, signature, secret);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'invalid signature';
    return NextResponse.json({ received: false, error: message }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.id && session.metadata?.designJson) {
      const base = baseUrlFromRequest(req);
      const result = await fulfillSession(session.id, base);
      return NextResponse.json({ received: true, fulfillment: { state: result.state, prodigiOrderId: result.prodigiOrderId } });
    }
  }

  return NextResponse.json({ received: true });
}
