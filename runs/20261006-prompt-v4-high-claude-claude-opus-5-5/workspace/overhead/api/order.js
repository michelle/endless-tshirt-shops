// Order status for the success page. Also a fulfilment safety net if the webhook is delayed.
import { json, siteUrl } from '../lib/config.js';
import { fulfillSession } from '../lib/fulfill.js';
import { getOrder } from '../lib/prodigi.js';

export async function GET(request) {
  const id = new URL(request.url).searchParams.get('session_id') || '';
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(id)) return json({ error: 'Invalid session id' }, 400);
  try {
    const r = await fulfillSession(id, siteUrl(request));
    if (r.prodigiOrderId && !r.prodigiStatus) {
      try {
        const o = await getOrder(r.prodigiOrderId);
        r.prodigiStatus = o.status?.stage;
      } catch {}
    }
    return json(r);
  } catch (e) {
    console.error('order status failed', e);
    return json({ error: 'We could not load this order. If you were charged, we have it — contact support.' }, 500);
  }
}
