import { getStripe, baseUrl, json } from '../lib/config.js';
import { fulfillSession } from '../lib/fulfill.js';

const HANDLED = new Set(['checkout.session.completed', 'checkout.session.async_payment_succeeded']);

export async function POST(request) {
  const stripe = getStripe();
  const raw = await request.text();
  let event;
  try {
    if (process.env.STRIPE_WEBHOOK_SECRET) {
      event = stripe.webhooks.constructEvent(raw, request.headers.get('stripe-signature'), process.env.STRIPE_WEBHOOK_SECRET);
    } else {
      // No signing secret configured: authenticate by re-fetching the event from Stripe.
      event = await stripe.events.retrieve(JSON.parse(raw).id);
    }
  } catch (e) {
    console.warn('webhook rejected', e.message);
    return json({ error: 'invalid event' }, 400);
  }
  if (!HANDLED.has(event.type)) return json({ received: true });
  try {
    const result = await fulfillSession(event.data.object.id, baseUrl(request));
    return json({ received: true, state: result.state, prodigiOrderId: result.prodigiOrderId });
  } catch (e) {
    console.error('fulfillment failed', event.data.object.id, e);
    return json({ error: 'fulfillment failed' }, 500); // Stripe retries with backoff
  }
}
