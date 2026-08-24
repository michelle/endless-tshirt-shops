import type { NextRequest } from 'next/server';
import { stripe } from '@/lib/stripe';
import { env } from '@/lib/env';
import { fulfill } from '@/lib/fulfillment';

/**
 * Primary fulfillment trigger: `payment_intent.succeeded` -> Prodigi order.
 *
 * Returns 200 for anything we have handled or deliberately ignored, so Stripe
 * stops retrying. A genuine, retryable failure (Prodigi down) is recorded on the
 * PaymentIntent and reported as 500 so Stripe backs off and tries again.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const secret = env.stripeWebhookSecret;
  if (!secret) {
    console.warn('[webhook] STRIPE_WEBHOOK_SECRET is not set; rejecting event');
    return Response.json({ error: 'Webhook is not configured.' }, { status: 503 });
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return Response.json({ error: 'Missing stripe-signature header.' }, { status: 400 });
  }

  const payload = await request.text();

  let event;
  try {
    event = await stripe().webhooks.constructEventAsync(payload, signature, secret);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[webhook] signature verification failed', message);
    return Response.json({ error: `Invalid signature: ${message}` }, { status: 400 });
  }

  if (event.type !== 'payment_intent.succeeded') {
    return Response.json({ received: true, ignored: event.type });
  }

  const intent = event.data.object;
  const { state } = await fulfill(intent);

  if (state.status === 'failed') {
    // Ask Stripe to retry; the error is already recorded on the PaymentIntent.
    return Response.json(
      { received: true, fulfillment: 'failed', error: state.error },
      { status: 500 },
    );
  }

  console.log('[webhook] fulfilled', intent.id, JSON.stringify(state));
  return Response.json({ received: true, fulfillment: state.status });
}
