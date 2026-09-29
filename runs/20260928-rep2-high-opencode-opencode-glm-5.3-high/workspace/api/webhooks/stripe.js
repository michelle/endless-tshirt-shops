// POST /api/webhooks/stripe — the server-side fulfillment backstop.
// Signature-verified (STRIPE_WEBHOOK_SECRET, set while running the Stripe
// CLI listener, or in the Stripe dashboard for production). On
// checkout.session.completed the same idempotent fulfillSession runs that
// the success page triggers; whichever fires first wins, the other no-ops.
//
// Always returns quickly so Stripe does not retry and double-fire.
import { fulfillSession } from '../_lib/fulfill.js';
import { readRawBody, sendJson, log } from '../_lib/http.js';
import { verifyWebhookSignature } from '../_lib/stripe.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'POST only' });
  const raw = await readRawBody(req, 1024 * 1024);
  const body = raw.toString('utf8');
  const signature = req.headers['stripe-signature'];

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    // No secret configured (no listener running): accept-but-deny, so
    // local traffic can't forge events. The success-page path still
    // fulfills; this endpoint simply reports it is dormant.
    log({ webhookDormant: true });
    return sendJson(res, 503, { error: 'webhook secret not configured' });
  }
  if (!verifyWebhookSignature(body, signature, secret)) {
    log({ webhookRejected: 'signature' });
    return sendJson(res, 400, { error: 'invalid signature' });
  }

  let event;
  try {
    event = JSON.parse(body);
  } catch {
    return sendJson(res, 400, { error: 'invalid payload' });
  }
  log({ webhook: event.type, id: event.id });

  if (event.type === 'checkout.session.completed') {
    const sessionId = event.data?.object?.id;
    if (sessionId) {
      const result = await fulfillSession(sessionId, { log });
      log({ webhookFulfilled: sessionId, ok: result.ok, orderId: result.orderId || null });
    }
  }
  return sendJson(res, 200, { received: true });
}
