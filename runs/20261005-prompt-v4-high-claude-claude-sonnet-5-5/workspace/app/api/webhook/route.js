import { config, originFromHeaders } from '@/lib/config.js';
import { fulfillStripeSession, stripe } from '@/lib/payments.js';

export const runtime = 'nodejs';

// Stripe → us. Orders are sent to Prodigi only from here (or the success page), and only when Stripe reports "paid".
export async function POST(request) {
  if (!config.stripeEnabled || !config.stripeWebhookSecret) return new Response('Webhook not configured', { status: 503 });
  const raw = await request.text();
  let event;
  try {
    event = stripe().webhooks.constructEvent(raw, request.headers.get('stripe-signature'), config.stripeWebhookSecret);
  } catch (err) {
    return new Response(`Bad signature: ${err.message}`, { status: 400 });
  }
  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    const result = await fulfillStripeSession(event.data.object.id, originFromHeaders(request.headers));
    if (!result.ok && result.reason !== 'unpaid') {
      console.error('fulfilment failed', event.data.object.id, result.reason || result.error, JSON.stringify(result.details || {}));
      return new Response('Fulfilment failed', { status: 500 }); // Stripe retries
    }
  }
  return Response.json({ received: true });
}
