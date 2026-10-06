// POST /api/webhook — Stripe events. Fulfilment happens ONLY here (and via the
// /api/order-status fallback the success page triggers) and ONLY once the
// session's payment_status is 'paid'.
import { readBody, json, cors, fail } from '../lib/http.mjs';
import { stripe } from '../lib/stripe.mjs';
import { fulfillSession, retrieveSession, prodigiStatus } from '../lib/fulfill.mjs';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.end();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return fail(res, 500, 'STRIPE_WEBHOOK_SECRET is not configured');

  let raw = typeof req.body === 'string' ? req.body
    : Buffer.isBuffer(req.body) ? req.body.toString('utf8')
    : JSON.stringify(req.body); // some hosts pre-parse JSON; Stripe payloads are compact so this round-trips byte-identically
  let event;
  try {
    event = await stripe.verifySignature(raw, req.headers['stripe-signature'] || '', secret);
  } catch (e) {
    return fail(res, 400, `signature verification failed: ${e.message}`);
  }

  try {
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      const session = event.data.object;
      if (!session?.metadata?.spec) return json(res, 200, { received: true, ignored: 'not a Heliogram session' });
      const full = await retrieveSession(session.id);
      const result = await fulfillSession(full, { baseUrl: full.metadata.base_url || process.env.PUBLIC_BASE_URL });
      if (full.payment_intent && typeof full.payment_intent === 'string' && result.status === 'paid_and_sent') {
        await stripe.updatePaymentIntent(full.payment_intent, { 'metadata[fulfillment_source]': 'webhook' }).catch(() => {});
      }
      return json(res, 200, { received: true, fulfillment: result });
    }
    if (event.type === 'checkout.session.async_payment_failed') {
      const session = event.data.object;
      if (session?.payment_intent && typeof session.payment_intent === 'string') {
        await stripe.updatePaymentIntent(session.payment_intent, {
          'metadata[fulfillment_error]': 'payment failed (async)',
          'metadata[fulfillment_error_at]': new Date().toISOString(),
        }).catch(() => {});
      }
      return json(res, 200, { received: true, paymentFailed: true });
    }
    json(res, 200, { received: true });
  } catch (e) {
    // 500 makes Stripe retry with backoff; transient Prodigi outages self-heal.
    fail(res, 500, `fulfilment error: ${e.message}`);
  }
}
