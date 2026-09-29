// GET /api/order-status?session_id=cs_... — the success page calls this.
// It is a fulfillment trigger, but never a trust boundary: payment status is
// re-fetched from Stripe inside fulfillSession, and Prodigi is only ever
// called after Stripe reports the session paid.
import { fulfillSession } from './_lib/fulfill.js';
import { sendJson, log } from './_lib/http.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return sendJson(res, 405, { error: 'GET only' });
  const url = new URL(req.url, 'http://x');
  const sessionId = url.searchParams.get('session_id') || '';
  if (!/^cs_(test_|live_)?[A-Za-z0-9]{10,}$/.test(sessionId)) {
    return sendJson(res, 400, { error: 'bad session id' });
  }
  try {
    const result = await fulfillSession(sessionId, { log });
    if (!result.ok) {
      return sendJson(res, result.stage === 'prodigi' ? 502 : 404, result);
    }
    return sendJson(res, 200, result);
  } catch (error) {
    log({ orderStatusError: String(error), sessionId });
    return sendJson(res, 500, { error: 'fulfillment check failed' });
  }
}
