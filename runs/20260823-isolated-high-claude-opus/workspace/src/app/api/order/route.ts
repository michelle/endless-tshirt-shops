import { NextResponse } from 'next/server';
import { fulfill } from '@/lib/fulfill';
import { log } from '@/lib/log';
import { isOurOrder, readOrderMetadata, stripe } from '@/lib/stripe';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Order status for the success page.
 *
 * Authorisation is the PaymentIntent's own client secret — the same value
 * Stripe.js hands back to the browser after payment. Knowing it proves the
 * caller is the buyer, which is exactly the property we need and keeps the shop
 * free of accounts and sessions.
 *
 * This also *drives* fulfilment as a fallback, so an order still reaches
 * Scalable Press even if the webhook is delayed or misconfigured.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get('payment_intent');
  const clientSecret = url.searchParams.get('payment_intent_client_secret');

  if (!id || !clientSecret) {
    return NextResponse.json(
      { error: 'payment_intent and payment_intent_client_secret are required.' },
      { status: 400 },
    );
  }

  let pi;
  try {
    pi = await stripe().paymentIntents.retrieve(id);
  } catch {
    return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
  }

  if (!pi.client_secret || !timingSafeEqual(pi.client_secret, clientSecret)) {
    log.warn('order.bad_client_secret', { paymentIntent: id });
    return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
  }

  // A PaymentIntent belonging to another app on this Stripe account is not an
  // order of ours, even if the caller holds its client secret.
  if (!isOurOrder(pi)) {
    log.warn('order.not_our_order', { paymentIntent: id });
    return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
  }

  const meta = readOrderMetadata(pi);
  const state = await fulfill(pi);

  return NextResponse.json({
    payment: pi.status,
    fulfillment: state,
    shirt: {
      timestamp: meta.shirt_timestamp ? Number(meta.shirt_timestamp) : null,
      style: meta.style ?? null,
      size: meta.size ?? null,
    },
    amount: pi.amount,
    email: pi.receipt_email,
    livemode: pi.livemode,
  });
}

/** Constant-time compare so the endpoint can't be used as a client-secret oracle. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
