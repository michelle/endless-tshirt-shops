import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import express from 'express';
import Stripe from 'stripe';
import {
  renderDesign, normalizeDesign, CATALOG, LAYOUTS, SHIPPING_CENTS, SKU, FONT_DIR, PRINT_W,
} from './design.js';
import { svgToPng } from './render.js';
import { store, PRINTS_DIR, DATA_DIR } from './store.js';
import { prodigi } from './prodigi.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 4242);
const RUNTIME_PATH = path.join(DATA_DIR, 'runtime.json');

if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY missing');
if (!process.env.PRODIGI_API_KEY) throw new Error('PRODIGI_API_KEY missing');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Public URL + webhook secret can change at runtime (quick tunnels), so the
// tunnel supervisor writes them to data/runtime.json and we re-read lazily.
let runtimeCache = { mtime: 0, value: {} };
function runtime() {
  try {
    const st = fs.statSync(RUNTIME_PATH);
    if (st.mtimeMs !== runtimeCache.mtime) {
      runtimeCache = { mtime: st.mtimeMs, value: JSON.parse(fs.readFileSync(RUNTIME_PATH, 'utf8')) };
    }
  } catch {
    runtimeCache = { mtime: 0, value: {} };
  }
  return runtimeCache.value;
}
const appUrl = () => (runtime().appUrl || process.env.APP_URL || `http://localhost:${PORT}`).replace(/\/$/, '');
const webhookSecret = () => runtime().stripeWebhookSecret || process.env.STRIPE_WEBHOOK_SECRET;

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
const log = (...a) => console.log(new Date().toISOString(), ...a);

// ---------- Stripe webhook (raw body, must be before express.json) ----------
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], webhookSecret());
  } catch (err) {
    log('webhook signature failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  log('webhook', event.type, event.data.object.id);
  try {
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      const session = event.data.object;
      if (session.payment_status === 'paid') await fulfillSession(session.id);
      else log('session not paid yet', session.id, session.payment_status);
    } else if (event.type === 'checkout.session.async_payment_failed') {
      const o = store.findOrderBySession(event.data.object.id);
      if (o) store.updateOrder(o.id, { status: 'payment_failed' });
    }
    res.json({ received: true });
  } catch (err) {
    log('fulfilment error', err);
    // 500 => Stripe retries with backoff.
    res.status(500).json({ error: err.message });
  }
});

app.use(express.json({ limit: '64kb' }));
app.use('/fonts', express.static(FONT_DIR, { maxAge: '30d', immutable: true }));
app.use(express.static(path.join(__dirname, '../public'), { extensions: ['html'] }));
// Print-ready files, fetched by Prodigi. Only exist for paid orders.
app.use('/prints', express.static(PRINTS_DIR, { maxAge: '1d' }));

// ---------- Catalog & previews ----------
app.get('/api/catalog', (req, res) => res.json({ ...CATALOG, sku: SKU, sandbox: prodigi.isSandbox() }));

function previewPng(design, area, width) {
  const svgs = renderDesign(design);
  const svg = svgs[area];
  if (!svg) return null;
  return svgToPng(svg, Math.max(200, Math.min(1400, Number(width) || 800)));
}

app.post('/api/preview', (req, res) => {
  const { design, area = 'back', width } = req.body || {};
  const png = previewPng(design || {}, area, width);
  if (!png) return res.status(404).end();
  res.type('png').set('Cache-Control', 'no-store').send(png);
});

app.get('/api/preview/:designId/:area.png', (req, res) => {
  const rec = store.getDesign(req.params.designId);
  if (!rec) return res.status(404).end();
  const png = previewPng(rec.design, req.params.area, req.query.w);
  if (!png) return res.status(404).end();
  res.type('png').set('Cache-Control', 'public, max-age=3600').send(png);
});

app.get('/api/designs/:id', (req, res) => {
  const rec = store.getDesign(req.params.id);
  if (!rec) return res.status(404).json({ error: 'not found' });
  res.json(rec);
});

// ---------- Checkout ----------
const SHIP_COUNTRIES = ['US', 'CA', 'GB', 'IE', 'AU', 'NZ', 'DE', 'FR', 'ES', 'IT', 'NL', 'BE', 'AT', 'CH', 'SE', 'DK', 'NO', 'FI', 'PT', 'PL', 'CZ', 'JP', 'SG', 'MX'];

app.post('/api/checkout', async (req, res) => {
  try {
    const design = normalizeDesign(req.body?.design || {});
    const id = crypto.randomBytes(8).toString('hex');
    store.putDesign(id, design);
    const layout = LAYOUTS[design.layout];
    const base = appUrl();
    const title = `${design.tourName.toUpperCase()} · ${design.subtitle.toUpperCase()}`;
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: layout.priceCents,
            product_data: {
              name: `HEADLINER tour tee — ${title}`,
              description: `Bella+Canvas 3001, ${CATALOG.SHIRT_COLORS[design.shirtColor].label}, size ${design.size.toUpperCase()}, ${layout.label.toLowerCase()} print. Printed to order.`,
              images: [`${base}/api/preview/${id}/${design.layout === 'classic' ? 'back' : 'front'}.png?w=800`],
              metadata: { designId: id },
            },
          },
        },
      ],
      shipping_address_collection: { allowed_countries: SHIP_COUNTRIES },
      shipping_options: [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: { amount: SHIPPING_CENTS, currency: 'usd' },
            display_name: 'Standard shipping',
            delivery_estimate: {
              minimum: { unit: 'business_day', value: 5 },
              maximum: { unit: 'business_day', value: 12 },
            },
          },
        },
      ],
      phone_number_collection: { enabled: true },
      metadata: { designId: id },
      payment_intent_data: { metadata: { designId: id } },
      success_url: `${base}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/?design=${id}`,
    });
    store.putOrder({
      id: `hl_${id}`,
      designId: id,
      status: 'awaiting_payment',
      stripeSessionId: session.id,
      amountTotal: session.amount_total,
      currency: session.currency,
      createdAt: new Date().toISOString(),
    });
    res.json({ url: session.url, designId: id, sessionId: session.id });
  } catch (err) {
    log('checkout error', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------- Fulfilment: only runs for sessions Stripe reports as paid ----------
const inflight = new Map();
async function fulfillSession(sessionId) {
  if (inflight.has(sessionId)) return inflight.get(sessionId);
  const p = (async () => {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== 'paid') throw new Error(`session ${sessionId} not paid (${session.payment_status})`);
    const designId = session.metadata?.designId;
    const rec = designId && store.getDesign(designId);
    if (!rec) throw new Error(`design ${designId} not found for session ${sessionId}`);
    let order = store.findOrderBySession(sessionId);
    if (!order) {
      order = store.putOrder({ id: `hl_${designId}`, designId, status: 'paid', stripeSessionId: sessionId, createdAt: new Date().toISOString() });
    }
    if (order.prodigiOrderId) return order; // idempotent

    const design = normalizeDesign(rec.design);
    const layout = LAYOUTS[design.layout];
    store.updateOrder(order.id, {
      status: 'paid',
      amountTotal: session.amount_total,
      currency: session.currency,
      customerEmail: session.customer_details?.email,
      paymentIntent: session.payment_intent,
    });

    // Render 300-DPI print files (transparent PNG, exact print-area aspect).
    const svgs = renderDesign(design);
    const assets = [];
    for (const area of layout.printAreas) {
      const file = `${order.id}-${area}.png`;
      const full = path.join(PRINTS_DIR, file);
      if (!fs.existsSync(full)) fs.writeFileSync(full, svgToPng(svgs[area], PRINT_W));
      assets.push({ printArea: area, url: `${appUrl()}/prints/${file}` });
    }

    const ship = session.collected_information?.shipping_details || session.shipping_details;
    if (!ship?.address) throw new Error(`no shipping address on session ${sessionId}`);
    const a = ship.address;
    const payload = {
      merchantReference: order.id,
      shippingMethod: 'Standard',
      idempotencyKey: sessionId,
      callbackUrl: `${appUrl()}/api/prodigi/callback`,
      recipient: {
        name: ship.name || session.customer_details?.name || 'Customer',
        email: session.customer_details?.email || undefined,
        phoneNumber: session.customer_details?.phone || undefined,
        address: {
          line1: a.line1,
          line2: a.line2 || undefined,
          postalOrZipCode: a.postal_code,
          countryCode: a.country,
          townOrCity: a.city,
          stateOrCounty: a.state || undefined,
        },
      },
      items: [
        {
          merchantReference: designId,
          sku: SKU,
          copies: 1,
          sizing: 'fitPrintArea',
          attributes: { color: design.shirtColor, size: design.size },
          assets,
        },
      ],
      metadata: { stripeSessionId: sessionId, designId },
    };
    store.updateOrder(order.id, { status: 'submitting_to_prodigi', prodigiPayload: payload });
    const resp = await prodigi.createOrder(payload);
    const po = resp.order;
    log('prodigi order created', po.id, po.status?.stage, resp.outcome);
    return store.updateOrder(order.id, {
      status: 'sent_to_printer',
      prodigiOrderId: po.id,
      prodigiOutcome: resp.outcome,
      prodigiStage: po.status?.stage,
      prodigiStatus: po.status,
      fulfilledAt: new Date().toISOString(),
    });
  })();
  inflight.set(sessionId, p);
  try {
    return await p;
  } catch (err) {
    const o = store.findOrderBySession(sessionId);
    if (o) store.updateOrder(o.id, { status: 'fulfilment_error', lastError: String(err.message).slice(0, 1000) });
    throw err;
  } finally {
    inflight.delete(sessionId);
  }
}

// Prodigi order status callbacks.
app.post('/api/prodigi/callback', (req, res) => {
  const po = req.body?.order || req.body;
  const o = po?.id && store.findOrderByProdigiId(po.id);
  if (o) {
    store.updateOrder(o.id, { prodigiStage: po.status?.stage, prodigiStatus: po.status, shipments: po.shipments });
    log('prodigi callback', po.id, po.status?.stage);
  }
  res.json({ ok: true });
});

function publicOrder(o) {
  if (!o) return null;
  const { prodigiPayload, ...rest } = o;
  return rest;
}

// Success page polls this. If the webhook hasn't landed yet we verify payment
// directly with Stripe (server-side) and fulfil; same idempotent path.
app.get('/api/orders/by-session/:sid', async (req, res) => {
  const sid = req.params.sid;
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sid)) return res.status(400).json({ error: 'bad session id' });
  let order = store.findOrderBySession(sid);
  if (!order || !order.prodigiOrderId) {
    try {
      const session = await stripe.checkout.sessions.retrieve(sid);
      if (session.payment_status === 'paid') order = await fulfillSession(sid);
      else if (order) store.updateOrder(order.id, { status: `awaiting_payment` });
    } catch (err) {
      log('by-session fulfil error', err.message);
      order = store.findOrderBySession(sid);
    }
  }
  if (!order) return res.status(404).json({ error: 'not found' });
  res.json(publicOrder(order));
});

app.get('/api/orders/:id', async (req, res) => {
  const o = store.getOrder(req.params.id);
  if (!o) return res.status(404).json({ error: 'not found' });
  if (o.prodigiOrderId && req.query.refresh) {
    try {
      const r = await prodigi.getOrder(o.prodigiOrderId);
      store.updateOrder(o.id, { prodigiStage: r.order.status?.stage, prodigiStatus: r.order.status, shipments: r.order.shipments });
    } catch (err) {
      log('prodigi refresh failed', err.message);
    }
  }
  res.json(publicOrder(store.getOrder(o.id)));
});

app.get('/api/health', (req, res) => res.json({ ok: true, appUrl: appUrl(), webhookConfigured: Boolean(webhookSecret()), sandbox: prodigi.isSandbox() }));

app.listen(PORT, () => log(`HEADLINER listening on http://localhost:${PORT} (public: ${appUrl()})`));
