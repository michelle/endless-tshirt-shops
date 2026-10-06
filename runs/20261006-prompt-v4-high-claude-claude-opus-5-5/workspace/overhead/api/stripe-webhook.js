import { stripe } from '../lib/stripe.js';
import { json, siteUrl } from '../lib/config.js';
import { fulfillSession } from '../lib/fulfill.js';

const HANDLED = new Set(['checkout.session.completed', 'checkout.session.async_payment_succeeded']);

export async function POST(request) {
  const raw = await request.text();
  let event;
  try {
    if (process.env.STRIPE_WEBHOOK_SECRET) {
      event = await stripe().webhooks.constructEventAsync(raw, request.headers.get('stripe-signature'), process.env.STRIPE_WEBHOOK_SECRET);
    } else {
      // No signing secret configured: never trust the payload — re-fetch the event from Stripe.
      const claimed = JSON.parse(raw);
      event = await stripe().events.retrieve(String(claimed.id));
    }
  } catch (e) {
    console.error('webhook verification failed', e.message);
    return json({ error: 'invalid signature' }, 400);
  }

  if (!HANDLED.has(event.type)) return json({ received: true, ignored: event.type });
  const session = event.data.object;
  if (session.payment_status !== 'paid') return json({ received: true, state: 'awaiting_payment' });
  try {
    const r = await fulfillSession(session.id, siteUrl(request));
    return json({ received: true, state: r.state, prodigiOrderId: r.prodigiOrderId });
  } catch (e) {
    console.error('fulfilment failed', e);
    // 500 => Stripe retries with backoff for up to 3 days.
    return json({ error: 'fulfilment failed' }, 500);
  }
}
