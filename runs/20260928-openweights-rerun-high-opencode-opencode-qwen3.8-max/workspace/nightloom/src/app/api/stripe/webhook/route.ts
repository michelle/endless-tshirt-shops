// Stripe webhook: the single source of truth for "payment succeeded".
// A Prodigi order is created only after a signature-verified
// checkout.session.completed event with payment_status === 'paid'.

import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { unpack, verify } from '@/lib/encoding';
import { fulfillPaidOrder } from '@/lib/fulfillment';
import { getStripe, metadataToToken, stripeEnabled } from '@/lib/stripe';
import { validateOrder } from '@/lib/validation';
import type { OrderPayload } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripeEnabled() || !secret) {
    return NextResponse.json({ error: 'Webhook not configured.' }, { status: 501 });
  }
  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header.' }, { status: 400 });
  }
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    console.error('[nightloom] webhook signature verification failed', err);
    return NextResponse.json({ error: 'Webhook signature verification failed.' }, { status: 400 });
  }

  if (event.type !== 'checkout.session.completed') {
    return NextResponse.json({ received: true, ignored: event.type });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  if (session.payment_status !== 'paid') {
    console.log(`[nightloom] session ${session.id} payment_status=${session.payment_status}; not fulfilling`);
    return NextResponse.json({ received: true, fulfilled: false });
  }

  const meta = metadataToToken(session.metadata);
  if (!meta) {
    console.error(`[nightloom] session ${session.id} has no Nightloom metadata`);
    return NextResponse.json({ error: 'Missing order metadata.' }, { status: 400 });
  }
  if (!verify(meta.token, meta.sig)) {
    console.error(`[nightloom] session ${session.id} failed metadata signature check`);
    return NextResponse.json({ error: 'Order metadata failed verification.' }, { status: 400 });
  }
  const order = validateOrder(unpack<OrderPayload>(meta.token));
  if (!order.ok) {
    console.error('[nightloom] invalid order in metadata', JSON.stringify(order.errors));
    return NextResponse.json({ error: 'Invalid order metadata.' }, { status: 400 });
  }

  try {
    const result = await fulfillPaidOrder(order.value);
    return NextResponse.json({ received: true, fulfilled: true, prodigiOrderId: result.prodigiOrderId });
  } catch (err) {
    // Non-2xx makes Stripe retry the webhook, so a transient Prodigi outage
    // does not lose a paid order.
    console.error(`[nightloom] fulfilment failed for ${order.value.orderRef}; Stripe will retry`, err);
    return NextResponse.json(
      { error: `Fulfilment failed: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    );
  }
}
