import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripe, getWebhookSecret } from '@/lib/stripe';
import { createOrder } from '@/lib/prodigi';
import { SKU, PRICE_USD } from '@/lib/catalog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function webhookBaseUrl(): string | null {
  const v = process.env.VERCEL_URL;
  if (v) return `https://${v}`;
  return null;
}

export async function POST(req: NextRequest) {
  const payload = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      payload,
      signature,
      getWebhookSecret(),
    );
  } catch (err) {
    return NextResponse.json(
      { error: `signature verification failed: ${String(err)}` },
      { status: 400 },
    );
  }

  // Only fulfil once payment has actually succeeded.
  if (
    event.type === 'checkout.session.completed' ||
    event.type === 'checkout.session.async_payment_succeeded'
  ) {
    const session = event.data.object as Stripe.Checkout.Session;

    if (session.payment_status !== 'paid') {
      // Not paid (e.g. async payment method still pending) — do not fulfil.
      return NextResponse.json({ received: true, skipped: 'not paid' });
    }

    try {
      await fulfilOrder(session);
    } catch (err) {
      // Return 500 so Stripe retries the webhook. Prodigi's idempotency key
      // (the session id) makes retries safe.
      console.error('Fulfilment failed', err);
      return NextResponse.json(
        { error: 'fulfilment failed' },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ received: true });
}

async function fulfilOrder(session: Stripe.Checkout.Session) {
  const meta = session.metadata || {};
  const designUrl = meta.designUrl;
  const color = meta.color;
  const size = meta.size;

  if (!designUrl || !color || !size) {
    throw new Error('Checkout session is missing required metadata');
  }

  const shipping = session.shipping_details;
  if (!shipping || !shipping.address) {
    throw new Error('Checkout session is missing shipping details');
  }

  const address = shipping.address;
  const email =
    session.customer_details?.email || session.customer_email || null;

  const base = webhookBaseUrl();

  await createOrder({
    merchantReference: session.id,
    shippingMethod: 'Standard',
    idempotencyKey: session.id,
    recipient: {
      name: shipping.name || 'Customer',
      email,
      address: {
        line1: address.line1 || '',
        line2: address.line2 || null,
        postalOrZipCode: address.postal_code || '',
        countryCode: address.country || 'US',
        townOrCity: address.city || '',
        stateOrCounty: address.state || null,
      },
    },
    items: [
      {
        merchantReference: `${session.id}-tee`,
        sku: SKU,
        copies: 1,
        sizing: 'fillPrintArea',
        attributes: { color, size },
        recipientCost: {
          amount: String(PRICE_USD),
          currency: 'USD',
        },
        assets: [{ printArea: 'front', url: designUrl }],
      },
    ],
    metadata: {
      source: 'lunaria',
      stripeSession: session.id,
      title: meta.title || '',
      date: meta.date || '',
      place: meta.place || '',
    },
    callbackUrl: base ? `${base}/api/order-status` : undefined,
  });
}
