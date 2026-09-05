import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { createProdigiOrder } from '@/lib/prodigi';
import { COLORS, FITS, SIZES, isValidColor, isValidFit, isValidSize } from '@/lib/catalog';

// Route Handlers get the raw, unparsed Request — exactly what's needed to
// verify the Stripe signature (App Router does not apply body-parsing here,
// unlike the old pages/api + Scalable Press server this replaces).
export const runtime = 'nodejs';

async function fulfill(session: Stripe.Checkout.Session) {
  const stripe = getStripe();
  const paymentIntentId =
    typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id;

  const meta = session.metadata || {};
  const { fit, color, size, artworkUrl } = meta;

  const fail = async (message: string) => {
    console.error('[webhook] fulfillment failed:', message);
    if (paymentIntentId) {
      await stripe.paymentIntents
        .update(paymentIntentId, { metadata: { fulfillmentError: message.slice(0, 480) } })
        .catch((e) => console.error('[webhook] could not record error on PI', e));
    }
  };

  if (!fit || !isValidFit(fit) || !color || !isValidColor(color) || !size || !isValidSize(size) || !artworkUrl) {
    return fail('Session metadata missing or invalid; cannot place Prodigi order');
  }

  const shipping = (session as any).shipping_details || (session as any).shipping;
  const address = shipping?.address || session.customer_details?.address;
  const name = shipping?.name || session.customer_details?.name || 'Time Traveler';

  if (!address?.line1 || !address?.country) {
    return fail('No shipping address on session; cannot place Prodigi order');
  }

  const result = await createProdigiOrder({
    sku: FITS[fit].sku,
    color: COLORS[color].prodigi,
    size: SIZES[size].prodigi,
    artworkUrl,
    idempotencyKey: session.id,
    recipient: {
      name,
      email: session.customer_details?.email || undefined,
      line1: address.line1,
      line2: address.line2 || undefined,
      townOrCity: address.city || '',
      stateOrCounty: address.state || undefined,
      postalOrZipCode: address.postal_code || '',
      countryCode: address.country,
    },
  });

  if (!result.ok) {
    return fail(result.error || 'Unknown Prodigi error');
  }

  if (paymentIntentId) {
    await stripe.paymentIntents
      .update(paymentIntentId, {
        metadata: { prodigiOrderId: result.orderId || '', prodigiStatus: result.status || '' },
      })
      .catch((e) => console.error('[webhook] could not record prodigi order id on PI', e));
  }
}

export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature');
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const rawBody = await request.text();

  if (!signature || !secret) {
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, secret);
  } catch (err: any) {
    console.error('[webhook] signature verification failed', err?.message);
    return NextResponse.json({ error: `Webhook signature verification failed` }, { status: 400 });
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      await fulfill(session);
    }
  } catch (err) {
    // Log and still ack the event — this is a demo store without a durable
    // queue, so we deliberately don't want Stripe hammering retries forever.
    // The error is visible on the PaymentIntent metadata and in logs.
    console.error('[webhook] unhandled error while fulfilling order', err);
  }

  return NextResponse.json({ received: true });
}
