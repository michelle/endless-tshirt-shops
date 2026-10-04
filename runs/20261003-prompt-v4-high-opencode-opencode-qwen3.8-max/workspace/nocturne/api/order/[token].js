// GET /api/order/[token] — order status for the confirmation page.
// Prodigi is the authoritative store: we look orders up by merchantReference NCT-<token>,
// or (when only a Stripe session id is known) by scanning recent orders for metadata.stripeSession.
const cfg = require('../lib/server');

async function findByToken(token) {
  const cached = await cfg.kvGet(`order:${token}`).catch(() => null);
  if (cached && cached.prodigiOrderId) return cached;
  const r = await fetch(
    `https://${cfg.PRODIGI_HOST}/v4.0/Orders?merchantReferences=${encodeURIComponent('NCT-' + token)}&top=1`,
    { headers: { 'X-API-Key': cfg.PRODIGI_KEY } }
  );
  const j = await r.json().catch(() => ({}));
  const o = (j.orders || [])[0];
  if (!o) return null;
  return { token, prodigiOrderId: o.id, stage: o.status?.stage, order: o, placedAt: o.created, qty: o.items?.[0]?.copies, size: o.items?.[0]?.attributes?.size, printAssetUrl: o.items?.[0]?.assets?.[0]?.url };
}

async function findBySession(sessionId) {
  const cached = await cfg.kvGet(`sess:${sessionId}`).catch(() => null);
  if (cached) return findByToken(cached);
  const r = await fetch(`https://${cfg.PRODIGI_HOST}/v4.0/Orders?top=100`, { headers: { 'X-API-Key': cfg.PRODIGI_KEY } });
  const j = await r.json().catch(() => ({}));
  for (const o of j.orders || []) {
    if (o.metadata?.stripeSession === sessionId || o.idempotencyKey === `stripe-${sessionId}`) {
      const token = String(o.merchantReference || '').replace(/^NCT-/, '');
      return { token, prodigiOrderId: o.id, stage: o.status?.stage, order: o, placedAt: o.created, qty: o.items?.[0]?.copies, size: o.items?.[0]?.attributes?.size, printAssetUrl: o.items?.[0]?.assets?.[0]?.url };
    }
  }
  return null;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return cfg.json(res, 405, { error: 'GET only' });
  const url = new URL(req.url, 'http://x');
  const pathToken = (url.pathname.split('/').pop() || '').replace(/\.json$/, '');
  const sessionParam = url.searchParams.get('session');

  let rec = null;
  if (sessionParam) rec = await findBySession(sessionParam).catch(() => null);
  if (!rec && pathToken && pathToken !== 'x') rec = await findByToken(pathToken).catch(() => null);

  if (!rec) {
    return cfg.json(res, 200, { placed: false, note: 'No fulfilled order found yet — the webhook places the print order a few seconds after payment.' });
  }

  const o = rec.order || null;
  return cfg.json(res, 200, {
    placed: true,
    token: rec.token,
    prodigiOrderId: rec.prodigiOrderId,
    stage: rec.stage,
    size: rec.size,
    qty: rec.qty,
    placedAt: rec.placedAt,
    printAssetUrl: rec.printAssetUrl,
    prodigi: o
      ? {
          status: o.status,
          shipments: (o.shipments || []).map((s) => ({ status: s.status, carrier: s.carrier, tracking: s.tracking || null, dispatchDate: s.dispatchDate || null })),
          charges: o.charges || [],
        }
      : null,
  });
};
