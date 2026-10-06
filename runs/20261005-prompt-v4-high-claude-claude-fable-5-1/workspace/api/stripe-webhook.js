// Stripe -> us. Verifies the signature, then sends paid orders to Prodigi.
import { stripe } from '../lib/stripe.js';
import { fulfillSession } from '../lib/fulfill.js';
import { readRawBody, json, error, methodNotAllowed } from '../lib/http.js';

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, 'POST');
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return error(res, 500, 'STRIPE_WEBHOOK_SECRET is not configured');

  let event;
  try {
    const raw = await readRawBody(req);
    event = stripe().webhooks.constructEvent(raw, req.headers['stripe-signature'], secret);
  } catch (e) {
    return error(res, 400, `Webhook signature verification failed: ${e.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object;
        if (session.payment_status !== 'paid') return json(res, 200, { received: true, skipped: 'not paid yet' });
        const result = await fulfillSession(session.id); // re-fetch with expansions
        console.log('fulfilled', session.id, result);
        return json(res, 200, { received: true, ...result });
      }
      case 'checkout.session.async_payment_failed':
      case 'checkout.session.expired':
        return json(res, 200, { received: true, ignored: event.type });
      default:
        return json(res, 200, { received: true, ignored: event.type });
    }
  } catch (e) {
    // Non-2xx makes Stripe retry with backoff, which is what we want for transient Prodigi errors.
    console.error('fulfillment failed', event.id, e);
    return error(res, 500, 'Fulfillment failed: ' + e.message);
  }
}
