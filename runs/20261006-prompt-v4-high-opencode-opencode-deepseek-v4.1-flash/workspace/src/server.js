// Echoform storefront + API server.

import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { CONFIG, RUNTIME_DIR, ensureDirs } from './config.js';
import { BRAND, THEMES, GARMENTS, SIZES } from './brand.js';
import { normalizeDesign, encodeToken, decodeToken } from './design.js';
import { renderMockup, renderPrint } from './render.js';
import { createCheckoutSession, retrieveSession, constructEvent, stripe } from './stripe.js';
import { fulfillFromSession } from './fulfill.js';
import { getOrder, listOrders } from './orders.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
ensureDirs();

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function publicBase(req) {
  if (CONFIG.publicUrl) return CONFIG.publicUrl;
  try {
    const f = path.join(RUNTIME_DIR, 'public_url.txt');
    if (fs.existsSync(f)) {
      const u = fs.readFileSync(f, 'utf8').trim();
      if (u) return u.replace(/\/$/, '');
    }
  } catch {
    /* ignore */
  }
  const proto = req.get('x-forwarded-proto') || req.protocol || 'http';
  return `${proto}://${req.get('host')}`;
}

// small LRU-ish cache for rendered PNGs
const pngCache = new Map();
const CACHE_MAX = 80;
function cached(key, producer) {
  if (pngCache.has(key)) {
    const v = pngCache.get(key);
    pngCache.delete(key);
    pngCache.set(key, v);
    return v;
  }
  const v = producer();
  pngCache.set(key, v);
  if (pngCache.size > CACHE_MAX) pngCache.delete(pngCache.keys().next().value);
  return v;
}

// ---------------------------------------------------------------------------
// static + body parsing
// ---------------------------------------------------------------------------

// Stripe webhook needs the raw body, so register it before the JSON parser.
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  let event;
  try {
    event = constructEvent(req.body, req.get('stripe-signature'));
  } catch (err) {
    return res.status(400).send(`Webhook signature error: ${err.message}`);
  }
  if (event.type === 'checkout.session.completed') {
    try {
      await fulfillFromSession(event.data.object, { publicBase: publicBase(req) });
    } catch (err) {
      console.error('webhook fulfill error', err.message);
    }
  }
  res.json({ received: true });
});

app.use(express.json({ limit: '64kb' }));
app.use('/fonts', express.static(path.join(__dirname, '..', 'fonts')));
app.use(express.static(path.join(__dirname, '..', 'public'), { extensions: ['html'] }));

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

app.get('/healthz', (req, res) => {
  res.json({ ok: true, service: 'echoform', time: new Date().toISOString() });
});

app.get('/api/config', (req, res) => {
  res.json({
    brand: BRAND,
    price: CONFIG.priceCents,
    currency: CONFIG.currency,
    sku: CONFIG.sku,
    themes: Object.values(THEMES).map((t) => ({ id: t.id, name: t.name, swatch: t.swatch })),
    garments: Object.values(GARMENTS).map((g) => ({
      id: g.id,
      name: g.name,
      hex: g.hex,
      dark: g.dark,
      defaultTheme: g.defaultTheme,
    })),
    sizes: SIZES,
    defaults: { message: 'Always look up', dedication: '', theme: 'signal', garment: 'black', size: 'm', variant: 0 },
  });
});

// Canonical design (adds the server-computed serial) for the studio UI.
app.get('/api/design.json', (req, res) => {
  res.json(normalizeDesign(req.query));
});

// Live mockup preview from raw (unsigned) fields.
app.get('/api/preview.png', (req, res) => {
  const design = normalizeDesign(req.query);
  const key = `p:${JSON.stringify(design)}`;
  const buf = cached(key, () => renderMockup(design));
  res.set('Content-Type', 'image/png');
  res.set('Cache-Control', 'public, max-age=300');
  res.set('X-Design-Token', encodeToken(design));
  res.send(buf);
});

// Print-ready asset. Prodigi downloads this URL. Signed token keeps it stable.
app.get('/api/print.png', (req, res) => {
  const design = decodeToken(req.query.d);
  if (!design) return res.status(400).json({ error: 'invalid design token' });
  const key = `t:${JSON.stringify(design)}`;
  const buf = cached(key, () => renderPrint(design));
  res.set('Content-Type', 'image/png');
  res.set('Cache-Control', 'public, max-age=3600');
  res.send(buf);
});

app.post('/api/checkout', async (req, res) => {
  try {
    const design = normalizeDesign(req.body || {});
    const token = encodeToken(design);
    const base = publicBase(req);
    const session = await createCheckoutSession({ design, designToken: token, publicBase: base });
    res.json({ ok: true, url: session.url, sessionId: session.id, token });
  } catch (err) {
    console.error('checkout error', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Payment success redirect. Verifies with Stripe, then fulfills (idempotent).
app.get('/checkout/success', async (req, res) => {
  const id = String(req.query.session_id || '');
  if (!id.startsWith('cs_')) return res.status(400).send(confirmationPage({ error: 'Missing checkout session.' }));
  let order;
  try {
    const session = await retrieveSession(id);
    order = await fulfillFromSession(session, { publicBase: publicBase(req) });
  } catch (err) {
    order = getOrder(id) || { id, status: 'error', error: err.message };
  }
  res.send(confirmationPage({ order }));
});

app.get('/api/orders/:id', async (req, res) => {
  const order = getOrder(req.params.id);
  if (!order) return res.status(404).json({ error: 'not found' });
  res.json(order);
});

// Retry / force fulfillment for a paid session (admin only).
app.all('/api/admin/fulfill', async (req, res) => {
  if (req.query.key !== CONFIG.adminKey) return res.status(401).json({ error: 'unauthorized' });
  const id = String(req.query.session_id || req.body?.sessionId || '');
  if (!id) return res.status(400).json({ error: 'session_id required' });
  try {
    const session = await retrieveSession(id);
    const order = await fulfillFromSession(session, { publicBase: publicBase(req) });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Simple admin view.
app.get('/admin', (req, res) => {
  if (req.query.key !== CONFIG.adminKey) return res.status(401).send('unauthorized');
  const rows = listOrders()
    .map(
      (o) => `<tr><td>${o.id}</td><td>${o.status}</td><td>${o.design?.message || ''}</td>
      <td>${o.design?.serial || ''}</td><td>${o.prodigiOrderId || ''}</td>
      <td>${o.email || ''}</td><td>$${((o.amountTotal || 0) / 100).toFixed(2)}</td></tr>`
    )
    .join('');
  res.send(`<!doctype html><meta charset=utf-8><title>Echoform orders</title>
  <style>body{font:14px ui-monospace,monospace;padding:24px}table{border-collapse:collapse}td,th{border:1px solid #ccc;padding:6px 10px;text-align:left}</style>
  <h1>Echoform orders (${listOrders().length})</h1>
  <table><tr><th>Session</th><th>Status</th><th>Message</th><th>Serial</th><th>Prodigi</th><th>Email</th><th>Total</th></tr>${rows}</table>`);
});

// ---------------------------------------------------------------------------
// confirmation page
// ---------------------------------------------------------------------------

function confirmationPage({ order, error }) {
  const paid = order && order.paymentStatus === 'paid';
  const ok = order && ['submitted', 'submitting'].includes(order.status);
  const title = error
    ? 'Something went wrong'
    : ok
      ? 'Your soundprint is on its way'
      : paid
        ? 'Order received'
        : 'Payment not completed';
  let body;
  if (error) {
    body = `<p>${error}</p><p><a href="/#design">Return to the studio</a></p>`;
  } else if (!paid) {
    body = `<p>We haven't received payment for this order yet, so nothing has been sent to print.</p>
      <p><a href="/#design">Return to the studio</a> to try again.</p>`;
  } else {
    body = `<p>Thanks${order.email ? `, ${order.email}` : ''}. Your one-of-one <strong>“${order.design?.message || ''}”</strong>
       soundprint (NO. ${order.design?.serial || ''}) has been sent to production.</p>
       <ul>
         <li>Payment: <strong>${order.paymentStatus || 'paid'}</strong></li>
         <li>Fulfillment: <strong>${order.status}</strong>${order.prodigiOrderId ? ` · Prodigi order <code>${order.prodigiOrderId}</code>` : ''}</li>
         <li>Garment: ${order.design?.garment || ''} · size ${(order.design?.size || '').toUpperCase()}</li>
       </ul>
       <p>You'll get tracking by email once it ships. <a href="/#design">Design another</a>.</p>`;
  }
  return `<!doctype html><html><head><meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} · Echoform</title>
  <style>
    body{margin:0;background:#0e0f12;color:#f3efe8;font:16px/1.6 ui-sans-serif,system-ui,-apple-system,sans-serif;
      display:flex;min-height:100vh;align-items:center;justify-content:center;padding:24px}
    .card{max-width:560px;background:#17191f;border:1px solid #2a2d36;border-radius:20px;padding:40px}
    h1{font-size:26px;margin:0 0 16px;font-weight:600}
    a{color:#7cf7e4}
    ul{padding-left:18px}
    code{background:#0e0f12;padding:2px 6px;border-radius:6px}
  </style></head><body><div class="card"><h1>${title}</h1>${body}</div></body></html>`;
}

// ---------------------------------------------------------------------------
// webhook auto-registration (best effort)
// ---------------------------------------------------------------------------

async function ensureWebhook(base) {
  if (!base || !CONFIG.stripeSecretKey) return;
  const stateFile = path.join(RUNTIME_DIR, 'webhook.json');
  let state = {};
  try {
    state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  } catch {
    state = {};
  }
  if (state.url === base && state.secret && state.id) {
    process.env.STRIPE_WEBHOOK_SECRET = state.secret;
    console.log('[stripe] reusing webhook endpoint', state.id);
    return;
  }
  try {
    const s = stripe();
    const ep = await s.webhookEndpoints.create({
      url: `${base}/api/stripe/webhook`,
      enabled_events: ['checkout.session.completed'],
      description: 'Echoform fulfillment',
    });
    process.env.STRIPE_WEBHOOK_SECRET = ep.secret;
    fs.writeFileSync(stateFile, JSON.stringify({ id: ep.id, url: base, secret: ep.secret }, null, 2));
    // clean up the previous endpoint if any
    if (state.id && state.id !== ep.id) {
      try {
        await s.webhookEndpoints.del(state.id);
      } catch {
        /* ignore */
      }
    }
    console.log('[stripe] registered webhook endpoint', ep.id, '->', base);
  } catch (err) {
    console.warn('[stripe] could not register webhook:', err.message);
  }
}

// ---------------------------------------------------------------------------
// start
// ---------------------------------------------------------------------------

const server = app.listen(CONFIG.port, () => {
  const base = CONFIG.publicUrl || `http://localhost:${CONFIG.port}`;
  console.log(`Echoform listening on http://localhost:${CONFIG.port} (public: ${base})`);
  console.log(`Prodigi SKU ${CONFIG.sku} · price $${(CONFIG.priceCents / 100).toFixed(2)} · sandbox ${CONFIG.prodigiBase}`);
  ensureWebhook(base).catch(() => {});
});

export { app, server, publicBase };
