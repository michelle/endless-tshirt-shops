import { getStripe } from './config.js';
import { fulfillSession } from './fulfill.js';

/**
 * Backstop for missed webhooks / closed tabs: submits any recently paid
 * session that has no Prodigi order yet. Idempotent, so overlap is harmless.
 */
export async function reconcile(base, { lookbackHours = 72 } = {}) {
  const stripe = getStripe();
  const results = [];
  const list = stripe.checkout.sessions.list({
    status: 'complete',
    created: { gte: Math.floor(Date.now() / 1000) - lookbackHours * 3600 },
    expand: ['data.payment_intent'],
    limit: 100,
  });
  for await (const s of list) {
    if (s.metadata?.kind !== 'transit-tee' || s.payment_status !== 'paid') continue;
    if (s.payment_intent?.metadata?.prodigi_order_id) continue;
    try {
      const r = await fulfillSession(s.id, base);
      results.push({ session: s.id, state: r.state, prodigiOrderId: r.prodigiOrderId });
    } catch (e) {
      console.error('reconcile failed', s.id, e);
      results.push({ session: s.id, error: e.message });
    }
  }
  return results;
}
