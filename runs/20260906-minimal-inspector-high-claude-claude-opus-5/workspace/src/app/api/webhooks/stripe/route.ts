import type Stripe from 'stripe';
import { optionalEnv } from '@/lib/env';
import { fulfillPaymentIntent } from '@/lib/fulfillment';
import { stripe } from '@/lib/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Stripe is the source of truth for "the customer paid". This endpoint is what
 * actually places print orders in normal operation; the browser's follow-up
 * call to /api/orders/[id] is only a backstop for a slow or missing webhook.
 */
export async function POST(request: Request) {
  const secret = optionalEnv('STRIPE_WEBHOOK_SECRET');
  const signature = request.headers.get('stripe-signature');

  if (!secret) {
    console.error('[stripe-webhook] STRIPE_WEBHOOK_SECRET is not configured');
    return new Response('Webhook secret not configured', { status: 500 });
  }
  if (!signature) {
    return new Response('Missing stripe-signature header', { status: 400 });
  }

  const body = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(body, signature, secret);
  } catch (error) {
    console.error('[stripe-webhook] signature verification failed', (error as Error).message);
    return new Response('Invalid signature', { status: 400 });
  }

  try {
    switch (event.type) {
      // Manual capture: funds are authorised and it is safe to place the print job.
      case 'payment_intent.amount_capturable_updated':
      case 'payment_intent.succeeded': {
        const result = await fulfillPaymentIntent(event.data.object);
        console.log('[stripe-webhook]', event.type, event.data.object.id, JSON.stringify(result));
        break;
      }
      case 'payment_intent.payment_failed': {
        const intent = event.data.object;
        console.warn('[stripe-webhook] payment failed', intent.id, intent.last_payment_error?.message);
        break;
      }
      default:
        break;
    }
  } catch (error) {
    console.error('[stripe-webhook] handler error', event.type, error);
    // 500 asks Stripe to retry, which is what we want for transient failures.
    return new Response('Handler error', { status: 500 });
  }

  return Response.json({ received: true });
}
