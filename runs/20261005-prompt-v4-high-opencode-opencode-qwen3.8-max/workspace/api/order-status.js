// GET /api/order-status?session=cs_… — receipt + fulfilment state for the
// success page. Also acts as the fulfilment fallback: if the webhook has not
// run yet (delayed/outage), a paid session is sent to Prodigi from here,
// exactly once (double-guarded by PaymentIntent metadata + Prodigi idempotency).
import { json, cors, fail } from '../lib/http.mjs';
import { retrieveSession, fulfillSession, prodigiStatus, artUrl } from '../lib/fulfill.mjs';
import { stripe } from '../lib/stripe.mjs';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.end();
  const id = new URL(req.url, 'http://x').searchParams.get('session');
  if (!id || !/^cs_(test|live)_/.test(id)) return fail(res, 400, 'bad session id');
  try {
    const session = await retrieveSession(id);
    const out = {
      paymentStatus: session.payment_status,
      amountTotal: session.amount_total,
      currency: session.currency,
      customerEmail: session.customer_details?.email || null,
      created: session.created,
    };
    if (!session.metadata?.spec) return json(res, 200, { ...out, fulfillment: null, artUrl: null });

    const base = session.metadata.base_url || process.env.PUBLIC_BASE_URL;
    if (base) out.artUrl = artUrl(base, JSON.parse(session.metadata.spec));

    let ful = { status: 'pending' };
    if (session.payment_status === 'paid') {
      const piId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id;
      if (piId) {
        const pi = await stripe.retrievePaymentIntent(piId);
        if (pi.metadata?.prodigi_order_id) {
          ful = { status: 'sent', orderId: pi.metadata.prodigi_order_id, stage: pi.metadata.prodigi_stage, source: pi.metadata.fulfillment_source || 'webhook', env: pi.metadata.prodigi_env, at: pi.metadata.fulfilled_at };
        } else if (pi.metadata?.fulfillment_error) {
          ful = { status: 'error', message: pi.metadata.fulfillment_error };
        }
      }
      if (ful.status === 'pending') {
        // fallback path: webhook has not fulfilled yet
        const r = await fulfillSession(session, { baseUrl: base });
        if (r.status === 'paid_and_sent' && typeof session.payment_intent === 'string') {
          await stripe.updatePaymentIntent(session.payment_intent, { 'metadata[fulfillment_source]': 'success-page' }).catch(() => {});
        }
        ful = { status: r.status === 'paid_and_sent' ? 'sent' : r.status, orderId: r.prodigiOrderId, stage: r.prodigiStage, source: 'success-page' };
      }
      if (ful.orderId) ful.detail = await prodigiStatus(ful.orderId);
    }
    json(res, 200, { ...out, fulfillment: ful });
  } catch (e) {
    fail(res, 502, e.message);
  }
}
