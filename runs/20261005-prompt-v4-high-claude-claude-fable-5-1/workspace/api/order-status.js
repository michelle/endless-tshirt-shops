// GET /api/order-status?session_id=cs_...
// Used by the success page. Also acts as a fulfilment fallback: if the webhook has not
// fired yet (or is misconfigured) and the session is paid, we send the order to Prodigi here.
import { retrieveSession, fulfillSession, prodigiStatus } from '../lib/fulfill.js';
import { specFromMetadata, artUrl } from '../lib/spec.js';
import { SHIRTS } from '../public/lib/dayprint.js';
import { json, error, query, baseUrl, methodNotAllowed } from '../lib/http.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res, 'GET');
  const id = String(query(req).session_id || '');
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(id)) return error(res, 400, 'session_id required');
  try {
    const session = await retrieveSession(id);
    const paid = session.payment_status === 'paid' || session.payment_status === 'no_payment_required';
    let fulfillment = { status: paid ? 'pending' : 'unpaid' };
    let fulfillError = null;
    if (paid) {
      try { fulfillment = await fulfillSession(session, { baseUrl: baseUrl(req) }); }
      catch (e) { fulfillError = e.message; }
    }
    const spec = specFromMetadata(session.metadata);
    const ship = session.collected_information?.shipping_details || session.shipping_details || null;
    const prodigi = fulfillment.prodigiOrderId ? await prodigiStatus(fulfillment.prodigiOrderId) : null;
    json(res, 200, {
      session: id,
      paid,
      amount_total: session.amount_total,
      currency: session.currency,
      email: session.customer_details?.email || null,
      ship_to: ship ? { name: ship.name, city: ship.address?.city, country: ship.address?.country } : null,
      spec,
      shirt_label: SHIRTS[spec.shirt]?.label,
      art_url: artUrl(baseUrl(req), spec),
      fulfillment: { ...fulfillment, error: fulfillError },
      prodigi,
    }, { 'Cache-Control': 'no-store' });
  } catch (e) {
    error(res, 502, e.message);
  }
}
