// GET /api/catalog — the store's product definition and prices. The client
// renders from this; the server always re-validates and re-prices from the
// same source of truth in api/_lib/config.js.
import { catalogPayload } from './_lib/config.js';
import { sendJson } from './_lib/http.js';

export default function handler(req, res) {
  if (req.method !== 'GET') return sendJson(res, 405, { error: 'GET only' });
  res.setHeader('cache-control', 'public, max-age=300');
  return sendJson(res, 200, catalogPayload());
}
