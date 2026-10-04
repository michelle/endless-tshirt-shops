import { baseUrl, json } from '../lib/config.js';
import { fulfillSession, getProdigiOrder, parseSizes } from '../lib/fulfill.js';
import { unpackDesign } from '../public/js/design.js';

export async function GET(request) {
  const id = new URL(request.url).searchParams.get('session_id') || '';
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(id)) return json({ error: 'Unknown order.' }, 404);
  let result;
  try {
    // Also acts as a fallback if the webhook is delayed: fulfillSession re-verifies payment.
    result = await fulfillSession(id, baseUrl(request));
  } catch (e) {
    if (e?.statusCode === 404 || e?.code === 'resource_missing') return json({ error: 'Unknown order.' }, 404);
    console.error('order lookup', id, e);
    return json({ error: 'Your payment is safe — we are retrying the print submission.', retry: true }, 503);
  }
  if (result.state === 'ignored') return json({ error: 'Unknown order.' }, 404);
  const s = result.session;
  let prodigi = null;
  if (result.prodigiOrderId) {
    const o = await getProdigiOrder(result.prodigiOrderId).catch(() => null);
    prodigi = {
      id: result.prodigiOrderId,
      stage: o?.status?.stage,
      details: o?.status?.details,
      shipments: (o?.shipments || []).map((sh) => ({ carrier: sh.carrier?.name, tracking: sh.tracking?.url || sh.tracking?.number || null, status: sh.status })),
    };
  }
  return json({
    paid: s.payment_status === 'paid',
    email: s.customer_details?.email,
    name: (s.collected_information?.shipping_details || s.shipping_details)?.name,
    total: s.amount_total,
    currency: s.currency,
    shipping: s.shipping_cost?.shipping_rate?.display_name,
    garment: s.metadata.garment,
    sizes: parseSizes(s.metadata.sizes),
    design: unpackDesign(s.metadata),
    prodigi,
  });
}
