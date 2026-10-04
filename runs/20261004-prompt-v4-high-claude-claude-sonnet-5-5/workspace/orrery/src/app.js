import express from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PRODUCT, SHIRT_COLORS, SIZES, ACCENTS, INKS, normalizeItem } from './catalog.js';
import { MIN_DATE, MAX_DATE } from './astro.js';
import { buildPrintSvg, designSummary } from './design.js';
import { renderPng } from './render.js';
import { normalizeRecipient, isEmail } from './address.js';
import { itemTitle, itemDescription } from './payments.js';

const PUBLIC_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
const FONT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'fonts');
const money = (c) => `$${(c / 100).toFixed(2)}`;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const safeEqual = (a, b) => {
  const x = Buffer.from(String(a ?? ''));
  const y = Buffer.from(String(b ?? ''));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

function rateLimiter(max, windowMs) {
  const hits = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip;
    const rec = hits.get(key) || { n: 0, reset: now + windowMs };
    if (now > rec.reset) Object.assign(rec, { n: 0, reset: now + windowMs });
    rec.n++;
    hits.set(key, rec);
    if (hits.size > 10000) for (const [k, v] of hits) if (now > v.reset) hits.delete(k);
    if (rec.n > max) return res.status(429).json({ error: 'Too many requests, please slow down.' });
    next();
  };
}

export function createApp({ config, orders, prodigi, payments, log = console }) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy === 'false' ? false : /^\d+$/.test(config.trustProxy) ? Number(config.trustProxy) : config.trustProxy);

  app.use((req, res, next) => {
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'X-Frame-Options': 'DENY',
      'Content-Security-Policy': "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; font-src 'self'; connect-src 'self'; form-action 'self' https://checkout.stripe.com; frame-ancestors 'none'; base-uri 'self'",
    });
    next();
  });

  // --- Stripe webhook (raw body needed for signature verification) ---
  app.post('/api/stripe/webhook', express.raw({ type: '*/*', limit: '1mb' }), async (req, res) => {
    if (!payments.parseWebhook) return res.status(404).end();
    let event;
    try {
      event = payments.parseWebhook(req.body, req.get('stripe-signature'));
    } catch (e) {
      log.warn?.(`[webhook] bad signature: ${e.message}`);
      return res.status(400).send('Invalid signature');
    }
    try {
      const obj = event.data.object;
      if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
        const s = payments.describeSession(obj);
        if (s.paid && s.orderId) {
          const { changed } = orders.markPaid(s.orderId, s);
          if (changed) orders.fulfill(s.orderId).catch((e) => log.error?.(e));
        }
      } else if (event.type === 'checkout.session.async_payment_failed') {
        orders.markPaymentFailed(payments.describeSession(obj).orderId);
      } else if (event.type === 'checkout.session.expired') {
        orders.markPaymentFailed(payments.describeSession(obj).orderId, 'expired');
      }
      res.json({ received: true });
    } catch (e) {
      // 500 makes Stripe retry delivery
      log.error?.(`[webhook] ${event.type} failed: ${e.message}`);
      res.status(500).send('Webhook handler error');
    }
  });

  app.use(express.json({ limit: '60kb' }));
  const limitPreview = rateLimiter(120, 60e3);
  const limitQuote = rateLimiter(40, 60e3);
  const limitCheckout = rateLimiter(10, 60e3);

  // --- storefront API ---
  app.get('/api/config', async (req, res) => {
    let countries = [];
    try {
      countries = await prodigi.shippableCountries();
    } catch (e) {
      log.error?.(`[config] could not load countries: ${e.message}`);
    }
    res.json({
      product: { title: PRODUCT.title, priceCents: PRODUCT.priceCents, currency: PRODUCT.currency, maxQtyPerLine: PRODUCT.maxQtyPerLine, maxLines: PRODUCT.maxLines },
      colors: Object.entries(SHIRT_COLORS).map(([id, c]) => ({ id, label: c.label, hex: c.hex, tone: c.tone })),
      accents: Object.entries(ACCENTS).map(([id, label]) => ({ id, label, hex: { dark: INKS.dark[id], light: INKS.light[id] } })),
      sizes: SIZES,
      dateRange: { min: MIN_DATE, max: MAX_DATE },
      countries,
      payment: { provider: payments.name, demo: payments.name === 'demo', sandboxFulfilment: config.prodigiIsSandbox },
    });
  });

  const previewCache = new Map();
  app.get('/api/preview.png', limitPreview, (req, res) => {
    const q = req.query;
    const parsed = normalizeItem({ ...q, name: q.name || 'Your Name', size: 'm', qty: 1, line: q.line ?? '' });
    if (parsed.errors) return res.status(400).json({ error: 'Invalid design', fields: parsed.errors });
    const w = Math.min(1400, Math.max(300, parseInt(q.w, 10) || 800));
    const bg = q.bg === '1';
    const key = JSON.stringify([parsed.item.date, parsed.item.name, parsed.item.line, parsed.item.color, parsed.item.accent, w, bg]);
    let png = previewCache.get(key);
    if (!png) {
      let svg = buildPrintSvg(parsed.item);
      if (bg) svg = svg.replace(/(<svg[^>]*>)/, `$1<rect width="100%" height="100%" fill="${SHIRT_COLORS[parsed.item.color].hex}"/>`);
      png = renderPng(svg, w);
      if (previewCache.size >= 150) previewCache.delete(previewCache.keys().next().value);
      previewCache.set(key, png);
    }
    res.set({ 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400' }).send(png);
  });

  app.get('/api/sky', (req, res) => {
    const parsed = normalizeItem({ ...req.query, name: 'x', size: 'm', color: 'black', accent: 'solar' });
    if (parsed.errors?.date) return res.status(400).json({ error: parsed.errors.date });
    const { sky, long, weekday } = designSummary(parsed.item);
    res.json({ date: long, weekday, moon: sky.moon });
  });

  async function priceCart(body) {
    const items = body?.items;
    if (!Array.isArray(items) || items.length === 0 || items.length > PRODUCT.maxLines) {
      return { status: 400, error: `Your cart needs 1-${PRODUCT.maxLines} items.` };
    }
    const normalized = [];
    for (const [i, raw] of items.entries()) {
      const r = normalizeItem(raw);
      if (r.errors) return { status: 400, error: `Item ${i + 1}: ${Object.values(r.errors)[0]}`, fields: r.errors };
      normalized.push(r.item);
    }
    const countries = await prodigi.shippableCountries();
    const country = String(body?.country || body?.address?.country || '').toUpperCase();
    if (!countries.includes(country)) return { status: 400, error: "We can't ship to that country yet.", fields: { country: 'Unsupported country' } };
    const q = await prodigi.quote(normalized, country);
    const subtotal = normalized.reduce((s, i) => s + PRODUCT.priceCents * i.qty, 0);
    // round shipping up to the next 50c
    const shippingCents = Math.ceil(q.shippingCostCents / 50) * 50;
    return { items: normalized, country, subtotalCents: subtotal, shippingCents, totalCents: subtotal + shippingCents, currency: PRODUCT.currency };
  }

  const handlePricingError = (res, e) => {
    log.error?.(`[pricing] ${e.message}`);
    res.status(e.status === 422 ? 400 : 502).json({ error: e.status === 422 ? "We can't ship that to this destination." : 'Shipping rates are unavailable right now. Please try again in a moment.' });
  };

  app.post('/api/quote', limitQuote, async (req, res) => {
    try {
      const p = await priceCart(req.body);
      if (p.error) return res.status(p.status).json({ error: p.error, fields: p.fields });
      res.json({ subtotalCents: p.subtotalCents, shippingCents: p.shippingCents, totalCents: p.totalCents, currency: p.currency });
    } catch (e) {
      handlePricingError(res, e);
    }
  });

  app.post('/api/checkout', limitCheckout, async (req, res) => {
    try {
      const countries = await prodigi.shippableCountries();
      const r = normalizeRecipient(req.body?.address, countries);
      if (r.errors) return res.status(400).json({ error: Object.values(r.errors)[0], fields: r.errors });
      if (!isEmail(req.body?.email)) return res.status(400).json({ error: 'Enter a valid email address.', fields: { email: 'Invalid email' } });
      const p = await priceCart({ items: req.body.items, country: r.recipient.country });
      if (p.error) return res.status(p.status).json({ error: p.error, fields: p.fields });
      if (typeof req.body.expectedTotalCents === 'number' && req.body.expectedTotalCents !== p.totalCents) {
        return res.status(409).json({ error: 'Prices changed, please review your total and try again.', totalCents: p.totalCents });
      }
      const order = orders.create({ items: p.items, recipient: r.recipient, email: req.body.email.trim(), shippingCents: p.shippingCents });
      try {
        const { url, ref } = await payments.createCheckout(order);
        orders.setPaymentRef(order.id, ref);
        res.json({ url, orderId: order.id });
      } catch (e) {
        orders.discard(order.id, 'canceled');
        throw e;
      }
    } catch (e) {
      if (e.name === 'ProdigiError') return handlePricingError(res, e);
      log.error?.(`[checkout] ${e.stack || e.message}`);
      res.status(500).json({ error: 'We could not start checkout. Please try again.' });
    }
  });

  const authOrder = (req, res) => {
    const order = orders.get(req.params.id);
    if (!order || !safeEqual(order.token, req.query.t)) {
      res.status(404).json({ error: 'Order not found' });
      return null;
    }
    return order;
  };

  app.get('/api/orders/:id', rateLimiter(120, 60e3), async (req, res) => {
    let order = authOrder(req, res);
    if (!order) return;
    try {
      order = await orders.syncPayment(order.id);
    } catch (e) {
      log.error?.(`[order sync] ${e.message}`);
    }
    let shipping = null;
    if (order.prodigiOrderId) {
      try {
        const po = (await prodigi.getOrder(order.prodigiOrderId)).order;
        shipping = {
          stage: po.status?.stage,
          shipments: (po.shipments || []).map((s) => ({ carrier: s.carrier?.name, service: s.carrier?.service, trackingUrl: s.tracking?.url, trackingNumber: s.tracking?.number, status: s.status })),
        };
      } catch (e) {
        log.warn?.(`[order] prodigi status failed for ${order.id}: ${e.message}`);
      }
    }
    res.json({
      id: order.id,
      status: order.status,
      createdAt: order.createdAt,
      items: order.items.map((i) => ({ ...i, title: itemTitle(i), description: itemDescription(i) })),
      subtotalCents: order.subtotalCents,
      shippingCents: order.shippingCents,
      totalCents: order.totalCents,
      shipTo: { name: order.recipient.name, city: order.recipient.city, country: order.recipient.country },
      email: order.email,
      shipping,
      demo: order.paymentProvider === 'demo',
    });
  });

  // --- print assets, fetched by Prodigi; only available once an order is paid ---
  app.get('/print/:id/:n.png', async (req, res) => {
    const order = orders.get(req.params.id);
    const idx = Number(req.params.n) - 1;
    if (!order || !safeEqual(order.token, req.query.t) || !orders.PAID_STATES.includes(order.status) || !order.items[idx]) {
      return res.status(404).end();
    }
    try {
      const file = await orders.printFile(order, idx);
      res.set({ 'Content-Type': 'image/png', 'Cache-Control': 'private, max-age=3600' });
      res.sendFile(path.resolve(file));
    } catch (e) {
      log.error?.(`[print] ${e.message}`);
      res.status(500).end();
    }
  });

  // --- demo payment (sandbox only) ---
  if (payments.name === 'demo') {
    app.get('/demo-pay/:id', (req, res) => {
      const order = orders.get(req.params.id);
      if (!order || !safeEqual(order.token, req.query.t)) return res.status(404).send('Not found');
      res.sendFile(path.join(PUBLIC_DIR, 'demo-pay.html'));
    });
    app.get('/api/demo/order/:id', (req, res) => {
      const order = authOrder(req, res);
      if (!order) return;
      res.json({ id: order.id, status: order.status, totalCents: order.totalCents, items: order.items.map((i) => ({ title: itemTitle(i), description: itemDescription(i), qty: i.qty })), shippingCents: order.shippingCents });
    });
    app.post('/api/demo/pay/:id', rateLimiter(20, 60e3), (req, res) => {
      const order = authOrder(req, res);
      if (!order) return;
      if (req.body?.outcome === 'decline') {
        orders.markPaymentFailed(order.id);
        return res.json({ ok: false, redirect: `/?canceled=1#cart` });
      }
      const { changed } = orders.markPaid(order.id, { ref: order.paymentRef, amountCents: order.totalCents, currency: order.currency });
      if (changed) orders.fulfill(order.id).catch((e) => log.error?.(e));
      res.json({ ok: true, redirect: `/order/${order.id}?t=${order.token}&paid=1` });
    });
  }

  // --- admin ---
  const requireAdmin = (req, res, next) => {
    if (!config.adminToken) return res.status(404).end();
    const [scheme, b64] = (req.get('authorization') || '').split(' ');
    const pass = scheme === 'Basic' ? Buffer.from(b64 || '', 'base64').toString().split(':').slice(1).join(':') : '';
    if (!safeEqual(pass, config.adminToken)) return res.set('WWW-Authenticate', 'Basic realm="admin"').status(401).send('Auth required');
    next();
  };
  app.get('/admin', requireAdmin, (req, res) => {
    const rows = orders.list().map((o) => `<tr><td><code>${esc(o.id)}</code></td><td>${new Date(o.createdAt).toISOString().replace('T', ' ').slice(0, 16)}</td><td><b>${esc(o.status)}</b></td><td>${money(o.totalCents)}</td><td>${esc(o.email)}</td><td>${esc(o.recipient.country)}</td><td>${o.items.map((i) => `${esc(i.name)} ${esc(i.date)} ${esc(i.color)}/${esc(i.size)} x${i.qty}`).join('<br>')}</td><td>${esc(o.prodigiOrderId || '')}</td><td>${o.fulfillAttempts}</td><td class="err">${esc(o.lastError || '')}</td><td>${o.status === 'fulfillment_failed' ? `<form method="post" action="/admin/orders/${esc(o.id)}/retry"><button>Retry</button></form>` : ''}</td></tr>`).join('');
    res.type('html').send(`<!doctype html><meta charset="utf-8"><title>Orders</title><style>body{font:13px system-ui;margin:20px}table{border-collapse:collapse}td,th{border:1px solid #ccc;padding:4px 8px;vertical-align:top}.err{color:#b00;max-width:360px;word-break:break-word}</style><h1>Orders (${config.prodigiIsSandbox ? 'Prodigi SANDBOX' : 'Prodigi LIVE'}, ${esc(payments.name)} payments)</h1><table><tr><th>ID<th>Created<th>Status<th>Total<th>Email<th>To<th>Items<th>Prodigi<th>Tries<th>Error<th></tr>${rows}</table>`);
  });
  app.post('/admin/orders/:id/retry', requireAdmin, express.urlencoded({ extended: false }), async (req, res) => {
    if (orders.retryNow(req.params.id)) orders.fulfill(req.params.id).catch((e) => log.error?.(e));
    res.redirect('/admin');
  });

  app.get('/healthz', (req, res) => res.json({ ok: true }));

  // --- pages & static ---
  app.get('/order/:id', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'order.html')));
  app.use('/fonts', express.static(FONT_DIR, { maxAge: '30d', immutable: true }));
  app.use(express.static(PUBLIC_DIR, { maxAge: '5m', extensions: ['html'] }));
  app.use((req, res) => res.status(404).type('text').send('Not found'));
  app.use((err, req, res, next) => {
    log.error?.(`[error] ${err.stack || err.message}`);
    if (res.headersSent) return next(err);
    res.status(err.status || 500).json({ error: err.status === 400 ? 'Bad request' : 'Something went wrong' });
  });

  return app;
}
