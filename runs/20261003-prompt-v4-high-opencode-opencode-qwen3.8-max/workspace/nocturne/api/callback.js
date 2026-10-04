// POST /api/callback — Prodigi CloudEvents callbacks (status stage changes / shipments).
// Updates the stored order record so the confirmation page reflects production progress.
const cfg = require('../lib/server');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return cfg.json(res, 405, { error: 'POST only' });
  let evt;
  try {
    evt = JSON.parse(await cfg.readBody(req, 512 * 1024));
  } catch {
    return cfg.json(res, 400, { error: 'invalid JSON' });
  }
  const order = evt?.data?.order;
  if (!order) return cfg.json(res, 200, { received: true });

  const ref = String(order.merchantReference || '');
  const token = ref.startsWith('NCT-') ? ref.slice(4) : null;
  const byId = async () => {
    // fall back: scan nothing — KV has no scan; rely on merchantReference only.
    return null;
  };
  const key = token ? `order:${token}` : null;
  const record = key ? await cfg.kvGet(key).catch(() => null) : await byId();
  if (record) {
    record.stage = order.status?.stage || record.stage;
    record.lastCallback = { type: evt.type, time: evt.time };
    if (order.shipments) record.shipments = order.shipments.map((s) => ({ status: s.status, carrier: s.carrier, tracking: s.tracking || null }));
    await cfg.kvSet(key, record).catch(() => {});
  }
  return cfg.json(res, 200, { received: true });
};
