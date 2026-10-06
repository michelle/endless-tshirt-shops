'use strict';
const express = require('express');
const path = require('path');
const config = require('./src/config');
const catalog = require('./src/catalog');
const { normalizeDesign, ValidationError } = require('./src/design/params');
const { renderSvg } = require('./src/design/render');
const { renderPrintPng } = require('./src/design/print');
const orders = require('./src/orders');
const { verify, tag, tagOk } = require('./src/sign');
const { fulfill } = require('./src/fulfill');
const prodigi = require('./src/prodigi');
const stripePay = config.paymentProvider === 'stripe' ? require('./src/payments/stripe') : null;
const demoPay = require('./src/payments/demo');

const app = express();
app.set('trust proxy', true);
app.disable('x-powered-by');

const originOf = (req) => config.publicUrl || `${req.get('x-forwarded-proto') || req.protocol}://${req.get('host')}`;

app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Frame-Options': 'DENY',
  });
  next();
});

// Minimal per-IP limiter for the expensive endpoints.
const hits = new Map();
function limit(max, windowMs) {
  return (req, res, next) => {
    const key = `${req.ip}:${req.path}`;
    const now = Date.now();
    const rec = hits.get(key) || { n: 0, reset: now + windowMs };
    if (now > rec.reset) { rec.n = 0; rec.reset = now + windowMs; }
    rec.n++;
    hits.set(key, rec);
    if (hits.size > 5000) for (const [k, v] of hits) if (now > v.reset) hits.delete(k);
    if (rec.n > max) return res.status(429).json({ error: 'Too many requests, please slow down.' });
    next();
  };
}

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ---- Stripe webhook (raw body; must be registered before express.json) ----
app.post('/api/webhooks/stripe', express.raw({ type: '*/*', limit: '1mb' }), wrap(async (req, res) => {
  if (!stripePay || !config.stripe.webhookSecret) return res.status(404).end();
  let event;
  try {
    event = stripePay.constructEvent(req.body, req.get('stripe-signature'));
  } catch (e) {
    console.warn('Stripe webhook signature check failed:', e.message);
    return res.status(400).send('Bad signature');
  }
  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    const order = stripePay.orderIfPaid(event.data.object);
    if (order) await fulfill(order, { provider: 'stripe', session: event.data.object.id, event: event.id });
    else console.log(`Session ${event.data.object.id} not paid yet (${event.data.object.payment_status}); not fulfilling`);
  } else if (event.type === 'checkout.session.async_payment_failed') {
    console.warn('Async payment failed for session', event.data.object.id);
  }
  res.json({ received: true });
}));

app.use(express.json({ limit: '64kb' }));

// ---- Public config ----
app.get('/api/config', (req, res) => {
  res.json({
    price: catalog.UNIT_PRICE_CENTS,
    colors: catalog.COLORS,
    sizes: catalog.SIZES,
    countries: Object.fromEntries(Object.entries(catalog.COUNTRIES).map(([k, v]) => [k, { name: v.name, needsState: !!v.needsState, ship: v.ship }])),
    maxQty: catalog.MAX_QTY_PER_LINE,
    payment: config.paymentProvider,
  });
});

app.get('/api/health', (req, res) => res.json({ ok: true, payment: config.paymentProvider, prodigi: config.prodigi.env }));

// ---- Design preview (same geometry as the print file) ----
app.get('/api/design.svg', limit(120, 60_000), wrap(async (req, res) => {
  const q = req.query;
  let design;
  try { design = normalizeDesign(q); } catch (e) {
    if (e instanceof ValidationError) return res.status(400).json({ error: e.message, field: e.field });
    throw e;
  }
  const color = catalog.colorById(q.color) || catalog.COLORS[0];
  const svg = renderSvg(design, { tone: color.tone, animate: q.anim === '1', drawIn: q.draw === '1', idp: q.idp });
  res.set({ 'Content-Type': 'image/svg+xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' }).send(svg);
}));

// ---- Print file served to Prodigi (HMAC-signed, so only designs from real orders/previews we signed) ----
app.get('/print/:token.png', limit(30, 60_000), wrap(async (req, res) => {
  const t = verify(req.params.token);
  if (!t || !t.d || !catalog.colorById(t.c)) return res.status(404).end();
  const png = await renderPrintPng(normalizeDesign(t.d), t.c);
  res.set({ 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=31536000, immutable' }).send(png);
}));

// ---- Pricing ----
app.post('/api/quote', wrap(async (req, res) => {
  const q = orders.quote(req.body || {});
  res.json({ units: q.units, subtotal: q.subtotal, shipping: q.shipping, total: q.total, currency: q.currency });
}));

// ---- Checkout: validate, price on the server, hand off to the payment provider ----
app.post('/api/checkout', limit(20, 60_000), wrap(async (req, res) => {
  const order = orders.buildOrder(req.body || {}, originOf(req));
  const token = orders.signOrder(order);
  const provider = stripePay || demoPay;
  const out = await provider.createCheckout(order, token);
  console.log(JSON.stringify({ evt: 'checkout_created', order: order.id, provider: config.paymentProvider, total: order.total }));
  res.json({ redirectUrl: out.redirectUrl, orderId: order.id });
}));

// ---- Demo provider endpoints (disabled whenever Stripe is the provider) ----
app.get('/api/demo/order', (req, res) => {
  if (config.paymentProvider !== 'demo') return res.status(404).end();
  const o = orders.openOrder(req.query.o);
  if (!o) return res.status(400).json({ error: 'This checkout link is invalid or has expired.' });
  res.json({ id: o.id, items: o.items.map((i) => ({ name: i.d.name, color: i.c, size: i.s, qty: i.q })), subtotal: o.subtotal, shipping: o.shipping, total: o.total, email: o.recipient.email });
});

app.post('/api/demo/pay', limit(30, 60_000), wrap(async (req, res) => {
  if (config.paymentProvider !== 'demo') return res.status(404).end();
  const order = orders.openOrder(req.body && req.body.o);
  if (!order) return res.status(400).json({ error: 'This checkout link is invalid or has expired.' });
  const result = demoPay.charge(req.body.card);
  if (!result.ok) return res.status(402).json({ error: result.message });
  const f = await fulfill(order, { provider: 'demo', payment: result.paymentId });
  res.json({ redirectUrl: `${order.origin}/order.html?id=${order.id}&t=${f.statusToken}` });
}));

// ---- Return from Stripe: confirm with Stripe directly (webhook may be slower), fulfil idempotently ----
app.post('/api/finalize', limit(60, 60_000), wrap(async (req, res) => {
  if (!stripePay) return res.status(404).end();
  const sid = String((req.body && req.body.sid) || '');
  if (!/^cs_[A-Za-z0-9_]+$/.test(sid)) return res.status(400).json({ error: 'Invalid session' });
  const session = await stripePay.retrieveSession(sid);
  const order = stripePay.orderIfPaid(session);
  if (!order) return res.json({ paid: false });
  const f = await fulfill(order, { provider: 'stripe', session: sid, via: 'return' });
  res.json({ paid: true, id: order.id, t: f.statusToken });
}));

// ---- Order status (link is HMAC-tagged; data comes from Prodigi) ----
app.get('/api/order-status', limit(60, 60_000), wrap(async (req, res) => {
  const id = String(req.query.id || '');
  if (!/^AST-[0-9A-F]{12}$/.test(id) || !tagOk(id, req.query.t)) return res.status(404).json({ error: 'Order not found' });
  const p = await prodigi.findByReference(id);
  if (!p) return res.status(404).json({ error: 'We have not received this order yet. Check back in a minute.' });
  res.json({
    id,
    stage: p.status.stage,
    details: p.status.details,
    issues: (p.status.issues || []).map((i) => i.description),
    shipments: (p.shipments || []).map((s) => ({ carrier: s.carrier && s.carrier.name, tracking: s.tracking && { number: s.tracking.number, url: s.tracking.url }, dispatched: s.dispatchDate })),
    items: p.items.map((i) => ({ color: i.attributes.color, size: i.attributes.size, qty: i.copies, status: i.status })),
    shipTo: { name: p.recipient.name, city: p.recipient.address.townOrCity, country: p.recipient.address.countryCode },
  });
}));

app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'], maxAge: '5m' }));

app.use((err, req, res, next) => {
  if (err instanceof ValidationError) return res.status(400).json({ error: err.message, field: err.field });
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on our side. Please try again.' });
});

if (require.main === module) {
  app.listen(config.port, () => console.log(`Asterism on :${config.port} (payments: ${config.paymentProvider}, prodigi: ${config.prodigi.env})`));
}
module.exports = app;
