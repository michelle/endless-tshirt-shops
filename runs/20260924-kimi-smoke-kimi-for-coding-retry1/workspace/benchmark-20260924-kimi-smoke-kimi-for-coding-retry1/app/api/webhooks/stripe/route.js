import { NextResponse } from 'next/server';
import { stripeClient } from '@/lib/payments';
import { fulfillOrder } from '@/lib/fulfill';
import { normalizeDesign } from '@/lib/scene';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Stripe webhook. The ONLY path by which a real card payment turns into a
// Prodigi order: we fulfill exclusively on checkout.session.completed events
// whose signature verifies against STRIPE_WEBHOOK_SECRET.
export async function POST(req) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const sig = req.headers.get('stripe-signature');
  const rawBody = await req.text();

  let event;
  try {
    const stripe = stripeClient();
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error('stripe webhook signature failed', err.message);
    return NextResponse.json({ error: 'signature verification failed' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const ref = session.metadata?.ref;

    if (session.payment_status !== 'paid') {
      // async payment methods still pending — Stripe sends a later event
      console.log('webhook: session not yet paid, skipping', ref, session.payment_status);
      return NextResponse.json({ ok: true, skipped: true });
    }

    const addr = session.shipping_details?.address || session.customer_details?.address;
    const name = session.shipping_details?.name || session.customer_details?.name || '';
    const email = session.customer_details?.email || '';
    if (!addr) {
      console.error('webhook: missing address', ref);
      return NextResponse.json({ error: 'incomplete session' }, { status: 422 });
    }

    // Recover each shirt's design from its line item metadata
    let cartItems = [];
    try {
      const stripe = stripeClient();
      const lines = await stripe.checkout.sessions.listLineItems(session.id, {
        limit: 100,
        expand: ['data.price.product'],
      });
      for (const line of lines.data) {
        const raw = line.price?.product?.metadata?.design;
        if (!raw) continue;
        cartItems.push({ design: normalizeDesign(JSON.parse(raw)) });
      }
    } catch (e) {
      console.error('webhook: could not read line items', ref, e.message);
      return NextResponse.json({ error: 'line items unreadable' }, { status: 500 });
    }

    if (cartItems.length === 0) {
      console.error('webhook: no designs found', ref);
      return NextResponse.json({ error: 'no designs' }, { status: 422 });
    }

    try {
      const shipping = {
        name,
        email,
        line1: addr.line1,
        line2: addr.line2,
        city: addr.city,
        state: addr.state,
        zip: addr.postal_code,
        country: addr.country,
      };
      const { prodigiOrderId, outcome } = await fulfillOrder({ orderRef: ref, cartItems, shipping });
      console.log(`fulfilled ${ref} -> prodigi ${prodigiOrderId} (${outcome})`);
    } catch (e) {
      console.error('fulfillment failed for', ref, e);
      // 500 so Stripe retries the webhook; Prodigi idempotency dedupes replays
      return NextResponse.json({ error: 'fulfillment failed' }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
