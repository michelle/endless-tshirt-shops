'use strict';
/**
 * NightLoom — personalized star-map t-shirts.
 * Express server: storefront, design preview, checkout (Stripe / demo),
 * payment webhooks, fulfillment to Prodigi, order status.
 */
const express = require('express');
const path = require('path');
const crypto = require('crypto');
const config = require('./src/config');
const store = require('./src/store');
const payments = require('./src/payments');
const { fulfill, refreshProdigiStatus, artPathFor } = require('./src/fulfill');
const { renderDesign } = require('./src/design');
const { CITIES, geocode, wallToUtc, timezoneFor, describeLocal } = require('./src/geocode');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', true);

/* ---------------- validation ---------------- */

const TEXT_ALLOWED = /[^\p{L}\p{N} .,'’&\-–—·:!?()"°]/gu; // strip anything exotic (font coverage)

function cleanText(v, max) {
  if (typeof v !== 'string') return '';
  return v.replace(TEXT_ALLOWED, '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function validateOrderInput(body) {
  const errors = [];
  const d = body.design || {};
  const p = body.product || {};
  const c = body.customer || {};

  const title = cleanText(d.title, 40);
  if (!title) errors.push('Design title is required (up to 40 characters).');
  const subtitle = cleanText(d.subtitle || '', 70);

  const date = typeof d.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.date) ? d.date : null;
  if (!date) errors.push('A valid date (YYYY-MM-DD) is required.');
  else {
    const y = +date.slice(0, 4);
    if (y < 1900 || y > 2100) errors.push('Date must be between 1900 and 2100.');
    const dt = new Date(date + 'T12:00:00Z');
    if (isNaN(dt.getTime())) errors.push('Invalid date.');
  }
  const time = typeof d.time === 'string' && /^\d{2}:\d{2}$/.test(d.time) ? d.time : '21:00';

  const lat = Number(d.lat), lon = Number(d.lon);
  if (!isFinite(lat) || lat < -90 || lat > 90) errors.push('Latitude must be between -90 and 90.');
  if (!isFinite(lon) || lon < -180 || lon > 180) errors.push('Longitude must be between -180 and 180.');
  const placeName = cleanText(d.placeName || '', 60);
  const countryName = cleanText(d.countryName || '', 60);
  const palette = config.palettes.includes(d.palette) ? d.palette : 'midnight';
  const constellations = d.constellations !== false;

  const color = config.product.colors.some(x => x.id === p.color) ? p.color : null;
  if (!color) errors.push('Choose a shirt color.');
  const size = config.product.sizes.includes(String(p.size).toLowerCase()) ? String(p.size).toLowerCase() : null;
  if (!size) errors.push('Choose a shirt size.');
  const qty = Math.min(5, Math.max(1, parseInt(p.qty, 10) || 1));

  const name = cleanText(c.name, 80);
  if (!name) errors.push('Recipient name is required.');
  const email = typeof c.email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(c.email.trim()) ? c.email.trim().toLowerCase().slice(0, 120) : null;
  if (!email) errors.push('A valid email address is required.');
  const phone = cleanText(c.phone || '', 32);
  const line1 = cleanText(c.line1, 100);
  if (!line1) errors.push('Street address is required.');
  const line2 = cleanText(c.line2 || '', 100);
  const city = cleanText(c.city, 60);
  if (!city) errors.push('City is required.');
  const state = cleanText(c.state || '', 60);
  const zip = cleanText(c.zip, 20);
  if (!zip) errors.push('Postal/ZIP code is required.');
  const country = typeof c.country === 'string' && config.countries.includes(c.country.toUpperCase()) ? c.country.toUpperCase() : null;
  if (!country) errors.push('Choose a supported shipping country.');

  if (errors.length) return { errors };

  let utc;
  try {
    utc = wallToUtc(date, time, lat, lon).utc;
  } catch (e) {
    return { errors: ['Could not resolve the timezone for this location.'] };
  }

  return {
    order: {
      design: { title, subtitle, date, time, lat, lon, placeName, countryName, palette, constellations, utcISO: utc.toISOString() },
      product: { sku: config.prodigi.sku, color, size, qty },
      customer: { name, email, phone, line1, line2, city, state, zip, country },
      pricing: {
        currency: config.pricing.currency,
        unitAmount: config.pricing.unitAmount,
        shippingAmount: config.pricing.shippingAmount,
        totalAmount: config.pricing.unitAmount * qty + config.pricing.shippingAmount,
      },
    },
  };
}

/* ---------------- helpers ---------------- */

function orderPublicView(o, extra) {
  return Object.assign({
    id: o.id,
    createdAt: o.createdAt,
    design: o.design,
    product: o.product,
    pricing: o.pricing,
    shippingTo: { name: o.customer.name, city: o.customer.city, state: o.customer.state, zip: o.customer.zip, country: o.customer.country },
    payment: { provider: o.payment.provider, status: o.payment.status, paidAt: o.payment.paidAt },
    fulfillment: {
      status: o.fulfillment.status,
      prodigiOrderId: o.fulfillment.prodigiOrderId,
      outcome: o.fulfillment.outcome,
      error: o.fulfillment.error,
      assetUrl: o.fulfillment.assetUrl,
      sentAt: o.fulfillment.sentAt,
      prodigiStage: o.fulfillment.prodigiStage,
      prodigiSnapshot: o.fulfillment.prodigiSnapshot,
    },
  }, extra || {});
}

function requireOrder(req, res) {
  const o = store.getOrder(req.params.id);
  if (!o) { res.status(404).json({ error: 'Order not found' }); return null; }
  return o;
}

/* ---------------- middleware ---------------- */

app.use('/webhooks/stripe', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '64kb' }));
app.use(express.static(path.join(config.ROOT, 'public'), { extensions: ['html'] }));

// Simple per-IP rate limiter for expensive endpoints.
const buckets = new Map();
function rateLimit(key, capacity, perMs) {
  return (req, res, next) => {
    const id = `${key}:${req.ip}`;
    const now = Date.now();
    let b = buckets.get(id);
    if (!b || now > b.reset) { b = { n: 0, reset: now + perMs }; buckets.set(id, b); }
    if (b.n >= capacity) return res.status(429).json({ error: 'Too many requests, slow down a moment.' });
    b.n++;
    next();
  };
}
setInterval(() => {
  const now = Date.now();
  for (const [k, b] of buckets) if (now > b.reset) buckets.delete(k);
}, 60000).unref();

/* ---------------- storefront API ---------------- */

app.get('/api/config', (req, res) => {
  res.json({
    store: { name: 'NightLoom', tagline: 'Wear the sky from your moment.' },
    pricing: config.pricing,
    product: { name: config.product.name, brand: config.product.brand, sizes: config.product.sizes, colors: config.product.colors },
    palettes: config.palettes,
    countries: config.countries,
    cities: CITIES,
    paymentMode: config.stripe.enabled ? 'stripe' : 'demo',
  });
});

app.get('/api/geocode', rateLimit('geo', 12, 60000), async (req, res) => {
  const q = cleanText(String(req.query.q || ''), 120);
  if (!q) return res.status(400).json({ error: 'Query required' });
  try {
    const hit = await geocode(q);
    if (!hit) return res.status(404).json({ error: 'No match found for that place.' });
    hit.timezone = timezoneFor(hit.lat, hit.lon);
    res.json(hit);
  } catch (e) {
    res.status(502).json({ error: 'Geocoding service unavailable; try a city from the list or enter coordinates.' });
  }
});

/* ---------------- preview ---------------- */

const previewCache = new Map(); // paramsHash -> { buf, at }
const PREVIEW_CACHE_MAX = 60;
const PREVIEW_WIDTH = 860;

app.get('/api/preview', rateLimit('preview', 90, 60000), (req, res) => {
  try {
    const q = Object.assign({}, req.query);
    if (!q.title) q.title = 'YOUR SKY AWAITS'; // placeholder while the customer types
    const v = validateOrderInput({
      design: Object.assign({}, q, { lat: Number(q.lat), lon: Number(q.lon), constellations: q.constellations !== 'false' }),
      product: { color: config.product.colors[0].id, size: 'm', qty: 1 },
      customer: { name: 'Preview', email: 'preview@example.com', line1: '1 Preview Way', city: 'Preview', zip: '00000', country: 'US' },
    });
    if (v.errors) return res.status(400).json({ errors: v.errors });
    const design = v.order.design;
    const key = crypto.createHash('sha1').update(JSON.stringify(design)).digest('hex');
    let hit = previewCache.get(key);
    if (!hit) {
      const buf = renderDesign(design, { width: PREVIEW_WIDTH, quality: 'preview' });
      hit = { buf, at: Date.now() };
      if (previewCache.size >= PREVIEW_CACHE_MAX) {
        const oldest = [...previewCache.entries()].sort((a, b) => a[1].at - b[1].at)[0][0];
        previewCache.delete(oldest);
      }
      previewCache.set(key, hit);
    }
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(hit.buf);
  } catch (e) {
    console.error('preview error:', e);
    res.status(500).json({ error: 'Preview render failed.' });
  }
});

app.get('/api/sky-info', rateLimit('preview', 90, 60000), (req, res) => {
  try {
    const lat = Number(req.query.lat), lon = Number(req.query.lon);
    const date = String(req.query.date || '');
    const time = String(req.query.time || '21:00');
    if (!isFinite(lat) || !isFinite(lon) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'Bad parameters' });
    const { utc, tz } = wallToUtc(date, time, lat, lon);
    const local = describeLocal(utc.toISOString(), lat, lon);
    const { computeSky } = require('./src/astro');
    const sky = computeSky(utc, lat, lon, { magLimit: 6.5, withConstellations: true });
    res.json({
      tz,
      utcISO: utc.toISOString(),
      localTime: local.local,
      starCount: sky.stars.length,
      moon: { phase: sky.moon.phaseName, fraction: +sky.moon.k.toFixed(3), visible: sky.moon.visible, waxing: sky.moon.waxing },
      planets: sky.planets.map(p => ({ name: p.name, magnitude: p.mag === null ? null : +p.mag.toFixed(2) })),
      constellations: sky.constellations.filter(c => c.label.inside).map(c => c.latin || c.en).slice(0, 12),
      sunAltitude: +sky.sun.alt.toFixed(1),
      daylight: sky.daylight,
    });
  } catch (e) {
    console.error('sky-info error:', e);
    res.status(500).json({ error: 'Sky computation failed.' });
  }
});

/* ---------------- orders & checkout ---------------- */

app.post('/api/orders', rateLimit('orders', 20, 60000), async (req, res) => {
  try {
    const v = validateOrderInput(req.body || {});
    if (v.errors) return res.status(400).json({ errors: v.errors });
    const order = store.createOrder(v.order);
    store.event(order, 'checkout.requested');
    const base = config.publicBase();
    const checkout = await payments.createCheckout(order, base);
    order.payment.provider = checkout.provider;
    order.payment.reference = checkout.reference;
    store.event(order, 'checkout.created', { provider: checkout.provider });
    store.save();
    res.json({ orderId: order.id, checkoutUrl: checkout.url, provider: checkout.provider });
  } catch (e) {
    console.error('create order error:', e);
    res.status(500).json({ error: 'Could not start checkout. Please try again.' });
  }
});

/** Demo-mode payment page (served as HTML shell; details fetched client-side). */
app.get('/pay/:id', (req, res) => {
  const o = requireOrder(req, res);
  if (!o) return;
  res.sendFile(path.join(config.ROOT, 'public', 'pay.html'));
});

/** Demo-mode payment confirmation — mirrors a payment webhook. */
app.post('/api/pay/demo/:id', async (req, res) => {
  const o = requireOrder(req, res);
  if (!o) return;
  if (config.stripe.enabled) return res.status(400).json({ error: 'Demo payments are disabled while Stripe is configured.' });
  if (o.payment.status === 'paid') return res.json({ ok: true, redirect: `/order/${o.id}` });
  const fail = !!(req.body && req.body.fail);
  if (fail) {
    o.payment.status = 'failed';
    store.event(o, 'payment.failed', 'demo card declined');
    store.save();
    return res.status(402).json({ ok: false, error: 'Card declined (simulated).' });
  }
  o.payment.status = 'paid';
  o.payment.provider = 'demo';
  o.payment.paidAt = new Date().toISOString();
  o.payment.reference = `demo_${crypto.randomBytes(6).toString('hex')}`;
  store.event(o, 'payment.succeeded', { provider: 'demo', simulated: true });
  store.save();
  fulfill(o.id).catch(e => console.error('fulfillment error:', e));
  res.json({ ok: true, redirect: `/order/${o.id}` });
});

/* ---------------- Stripe webhook ---------------- */

app.post('/webhooks/stripe', (req, res) => {
  if (!config.stripe.enabled) return res.status(404).send('Stripe not configured');
  try {
    const sig = req.headers['stripe-signature'];
    const { orderId } = payments.handleStripeWebhook(req.body, sig);
    res.json({ received: true });
    if (!orderId) return;
    const order = store.getOrder(orderId);
    if (!order) return;
    if (order.payment.status === 'paid') { fulfill(orderId).catch(e => console.error('refulfill error:', e)); return; }
    order.payment.status = 'paid';
    order.payment.provider = 'stripe';
    order.payment.paidAt = new Date().toISOString();
    store.event(order, 'payment.succeeded', { provider: 'stripe' });
    store.save();
    fulfill(orderId).catch(e => console.error('fulfillment error:', e));
  } catch (e) {
    console.error('stripe webhook error:', e.message);
    res.status(400).send(`Webhook Error: ${e.message}`);
  }
});

/* ---------------- fulfillment retry ---------------- */

app.post('/api/orders/:id/retry', async (req, res) => {
  const o = requireOrder(req, res);
  if (!o) return;
  if (o.payment.status !== 'paid') return res.status(400).json({ error: 'Order is not paid.' });
  if (o.fulfillment.status === 'sent') return res.json({ ok: true, alreadySent: true });
  const result = await fulfill(o.id);
  res.json({ ok: result.fulfillment.status === 'sent', fulfillment: orderPublicView(result).fulfillment });
});

/* ---------------- order status ---------------- */

app.get('/order/:id', (req, res) => {
  const o = requireOrder(req, res);
  if (!o) return;
  res.sendFile(path.join(config.ROOT, 'public', 'order.html'));
});

app.get('/api/orders/:id', async (req, res) => {
  const o = requireOrder(req, res);
  if (!o) return;
  if (o.fulfillment.prodigiOrderId) await refreshProdigiStatus(o.id);
  res.json(orderPublicView(o));
});

/* ---------------- print artwork (fetched by Prodigi) ---------------- */

app.get('/art/:file', (req, res) => {
  const m = /^nl_[a-f0-9]{16}\.png$/.exec(req.params.file || '');
  if (!m) return res.status(404).send('Not found');
  const orderId = req.params.file.slice(0, -4);
  const o = store.getOrder(orderId);
  if (!o || o.payment.status !== 'paid') return res.status(404).send('Not found');
  const file = artPathFor(orderId);
  if (!require('fs').existsSync(file)) return res.status(404).send('Not found');
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.sendFile(file);
});

/* ---------------- misc ---------------- */

app.get('/healthz', (req, res) => res.json({ ok: true, paymentMode: config.stripe.enabled ? 'stripe' : 'demo', publicBase: config.publicBase() }));

app.listen(config.PORT, () => {
  console.log(`NightLoom listening on :${config.PORT}`);
  console.log(`  payments : ${config.stripe.enabled ? 'Stripe Checkout' : 'DEMO mode (set STRIPE_SECRET_KEY for Stripe)'}`);
  console.log(`  prodigi  : ${config.prodigi.baseUrl} (${config.prodigi.apiKey ? 'key set' : 'NO KEY'})`);
  console.log(`  public   : ${config.publicBase()}`);
});
