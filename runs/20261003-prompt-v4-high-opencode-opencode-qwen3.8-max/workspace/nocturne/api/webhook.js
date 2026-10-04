// POST /api/webhook — Stripe webhook: ONLY after payment succeeds do we place the
// Prodigi print order. Idempotent via `stripe-<session id>` so Stripe retries can never
// double-print a shirt.
const Stripe = require('stripe');
const cfg = require('../lib/server');
const { THEMES } = require('../lib/render');
const { PRICE_USD } = require('../lib/design');

async function fulfill(session) {
  const { token, s, size, qty } = session.metadata || {};
  if (!token || !s || !size) {
    console.log(`webhook: session ${session.id} has no NOCTURNE metadata — ignoring`);
    return null;
  }
  const copies = Math.min(5, Math.max(1, parseInt(qty, 10) || 1));
  const design = JSON.parse(Buffer.from(s, 'base64url').toString('utf8'));
  const theme = THEMES[design.theme] || THEMES['chart-cream'];
  const cd = session.customer_details || {};
  const addr = cd.address || {};

  const assetUrl = `${cfg.APP_URL}/api/print/${token}?s=${s}`;
  const order = {
    merchantReference: `NCT-${token}`,
    shippingMethod: 'Standard',
    idempotencyKey: `stripe-${session.id}`,
    callbackUrl: `${cfg.APP_URL}/api/callback`,
    recipient: {
      name: cd.name || 'NOCTURNE Customer',
      email: session.customer_details?.email || session.customer_email || undefined,
      address: {
        line1: addr.line1 || '',
        line2: addr.line2 || '',
        townOrCity: addr.city || '',
        stateOrCounty: addr.state || null,
        postalOrZipCode: addr.postal_code || '',
        countryCode: (addr.country || 'US').toUpperCase(),
      },
    },
    items: [
      {
        merchantReference: `tee-${token}`,
        sku: 'GLOBAL-TEE-BC-3001',
        copies,
        sizing: 'fitPrintArea',
        attributes: { color: theme.shirt, size },
        recipientCost: { amount: PRICE_USD.toFixed(2), currency: 'USD' },
        assets: [{ printArea: 'front', url: assetUrl }],
      },
    ],
    metadata: { store: 'nocturne', stripeSession: session.id, designToken: token },
  };

  const existing = await cfg.kvGet(`order:${token}`).catch(() => null);
  if (existing && existing.prodigiOrderId) {
    console.log(`webhook: order for ${token} already placed (${existing.prodigiOrderId}) — skipping`);
    return existing;
  }

  const result = await cfg.prodigiCreateOrder(order);
  if (!result.ok || !result.body.order) {
    console.error(`webhook: Prodigi order failed`, result.status, JSON.stringify(result.body).slice(0, 500));
    throw new Error(`prodigi order failed: ${result.status}`);
  }
  const prodigiOrder = result.body.order;

  const record = {
    token,
    sessionId: session.id,
    prodigiOrderId: prodigiOrder.id,
    stage: prodigiOrder.status?.stage || 'Created',
    design,
    size,
    qty: copies,
    placedAt: new Date().toISOString(),
    printAssetUrl: assetUrl,
  };
  await cfg.kvSet(`order:${token}`, record).catch(() => {});
  await cfg.kvSet(`sess:${session.id}`, token).catch(() => {});
  console.log(`webhook: paid session ${session.id} -> Prodigi order ${prodigiOrder.id}`);
  return record;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return cfg.json(res, 405, { error: 'POST only' });
  const payload = await cfg.readBody(req, 1024 * 1024);
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    const stripe = new Stripe(cfg.STRIPE_SECRET);
    event = stripe.webhooks.constructEvent(payload, sig, cfg.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('webhook signature verification failed:', err.message);
    return cfg.json(res, 400, { error: `signature verification failed: ${err.message}` });
  }

  try {
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      await fulfill(event.data.object);
    }
  } catch (err) {
    console.error('webhook fulfillment error:', err);
    // 500 makes Stripe retry with backoff; idempotency prevents duplicates
    return cfg.json(res, 500, { error: 'fulfillment failed, will retry' });
  }
  return cfg.json(res, 200, { received: true });
};
