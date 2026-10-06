// GET ?session_id=cs_... → order summary; also triggers fulfilment if the webhook
// hasn't yet (idempotent, so racing the webhook is harmless).
import { send, query } from '../lib/http.js';
import { orderStatus } from '../lib/orders.js';

export default async function handler(req, res) {
  const { session_id: id } = query(req);
  if (!id || !/^cs_(test|live)_[A-Za-z0-9]+$/.test(id)) return send(res, 400, { error: 'Missing or invalid session_id' });
  try {
    send(res, 200, await orderStatus(id), { 'Cache-Control': 'no-store' });
  } catch (e) {
    console.error(e);
    send(res, e.status === 404 ? 404 : 500, { error: e.status === 404 ? 'Order not found' : 'Could not load order' });
  }
}
