import { NextResponse } from 'next/server';
import type Stripe from 'stripe';

import { fulfillPaymentIntent } from '@/lib/fulfillment';
import { getStripe } from '@/lib/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Source of truth for fulfilment. Stripe retries this for days, so a Prodigi
 * outage during checkout still ends with a printed shirt.
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[webhook] STRIPE_WEBHOOK_SECRET is not set');
    return NextResponse.json({ error: 'Webhook not configured.' }, { status: 503 });
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header.' }, { status: 400 });
  }

  const body = await request.text();
  let event: Stripe.Event;
  try {
    event = await getStripe().webhooks.constructEventAsync(body, signature, secret);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid signature';
    console.error('[webhook] signature verification failed:', message);
    return NextResponse.json({ error: `Webhook signature check failed: ${message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = await getStripe().paymentIntents.retrieve(
          (event.data.object as Stripe.PaymentIntent).id,
          { expand: ['latest_charge'] },
        );
        if (paymentIntent.metadata?.source !== 'datetime.store') {
          console.log('[webhook] ignoring payment not created by this store', paymentIntent.id);
          break;
        }
        const result = await fulfillPaymentIntent(paymentIntent);
        console.log(
          `[webhook] ${paymentIntent.id} -> prodigi ${result.orderId} (${result.created ? 'created' : 'already existed'})`,
        );
        break;
      }
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(
          `[webhook] payment failed ${paymentIntent.id}: ${paymentIntent.last_payment_error?.message ?? 'unknown'}`,
        );
        break;
      }
      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        console.log(`[webhook] refund on ${charge.payment_intent} — cancel the print order manually if it has not shipped.`);
        break;
      }
      default:
        break;
    }
  } catch (error) {
    // A 5xx tells Stripe to retry, which is exactly what we want for a
    // transient Prodigi failure.
    const message = error instanceof Error ? error.message : 'Unhandled webhook error';
    console.error(`[webhook] ${event.type} failed:`, message);
    return NextResponse.json({ received: true, error: message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
