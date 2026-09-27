import { getStripe } from '@/lib/stripe';
import { createProdigiOrder, type ProdigiRecipient } from '@/lib/prodigi';
import { inputFromMetadata } from '@/lib/order-input';

// Stripe calls this after a Checkout Session completes. This is the ONLY
// path that sends shirts to Prodigi — fulfillment never happens before a
// confirmed payment.

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get('stripe-signature');
  if (!webhookSecret || !signature) {
    return Response.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  const stripe = getStripe();
  const rawBody = await request.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error('webhook signature verification failed', err);
    return Response.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type !== 'checkout.session.completed') {
    return Response.json({ received: true, ignored: event.type });
  }

  const session = event.data.object;
  const sessionId = session.id;

  // Idempotency: Stripe retries webhooks; only fulfill once.
  if (session.metadata?.fulfilled === 'true') {
    return Response.json({ received: true, alreadyFulfilled: true });
  }

  if (session.payment_status !== 'paid') {
    // e.g. delayed payment methods — wait for a later event rather than fulfill.
    console.warn(`session ${sessionId} completed but not paid yet`);
    return Response.json({ received: true, deferred: true });
  }

  const input = inputFromMetadata(session.metadata ?? {});
  if (!input) {
    // Not one of ours (e.g. a test trigger) — acknowledge without failing.
    console.warn(`session ${sessionId} has no SEED order metadata, skipping`);
    return Response.json({ received: true, skipped: true });
  }

  const shipping = session.collected_information?.shipping_details;
  if (!shipping?.address?.line1 || !shipping.address.country) {
    console.error(`session ${sessionId} missing shipping address`);
    return Response.json({ error: 'Missing shipping address' }, { status: 422 });
  }

  const recipient: ProdigiRecipient = {
    name: shipping.name ?? session.customer_details?.name ?? 'SEED customer',
    email: session.customer_details?.email,
    address: {
      line1: shipping.address.line1,
      line2: shipping.address.line2,
      postalOrZipCode: shipping.address.postal_code ?? '',
      countryCode: shipping.address.country,
      townOrCity: shipping.address.city ?? '',
      stateOrCounty: shipping.address.state,
    },
  };

  try {
    const order = await createProdigiOrder({
      stripeSessionId: sessionId,
      word: input.word,
      paletteId: input.paletteId,
      garmentColor: input.garmentColor,
      size: input.size,
      recipient,
    });

    await stripe.checkout.sessions.update(sessionId, {
      metadata: {
        ...session.metadata,
        fulfilled: 'true',
        prodigiOrderId: order.id,
      },
    });

    console.log(`session ${sessionId} fulfilled as Prodigi order ${order.id}`);
    return Response.json({ received: true, prodigiOrderId: order.id });
  } catch (err) {
    console.error(`fulfillment failed for ${sessionId}`, err);
    // 500 so Stripe retries the webhook.
    return Response.json({ error: 'Fulfillment failed' }, { status: 500 });
  }
}
