'use strict';

const path = require('path');
const fs = require('fs');
const express = require('express');

const art = require('./src/art');
const { renderPng } = require('./src/render');
const db = require('./src/db');
const prodigi = require('./src/prodigi');
const payu = require('./src/payu');
const paygate = require('./src/paygate');
const stripeDriver = require('./src/stripeDriver');
const btcpay = require('./src/btcpay');
const { PALETTES, palettesForShirt } = require('./src/palettes');

const PORT = Number(process.env.PORT || 3000);
const ART_CACHE = path.join(__dirname, 'art-cache');
fs.mkdirSync(ART_CACHE, { recursive: true });

const PRICE_USD = 34;
const USD_TO_INR = 84; // display conversion for the PayU (INR) sandbox
const SKU = 'GLOBAL-TEE-BC-3001';
const SIZES = ['s', 'm', 'l', 'xl', '2xl'];
const SHIRT_COLORS = ['black', 'white'];
const COUNTRIES = ['US', 'GB', 'CA', 'AU', 'DE', 'FR', 'NL', 'IE', 'ES', 'IT'];

function publicUrl() {
  return (db.getConfig().publicUrl || process.env.PUBLIC_URL || `http://localhost:${PORT}`).replace(/\/$/, '');
}

function activeDriver() {
  const cfg = db.getConfig();
  if (cfg.paymentDriver) return cfg.paymentDriver;
  if (cfg.stripe && cfg.stripe.secretKey) return 'stripe';
  return 'payu';
}

const app = express();
app.disable('x-powered-by');

// Raw body for webhook signature verification (must come before json parser)
app.use('/webhooks/stripe', express.raw({ type: '*/*' }));
app.use('/webhooks/btcpay', express.raw({ type: '*/*' }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

const svgMemCache = new Map();

// ---------- Design endpoints ----------

app.get('/api/config', (req, res) => {
  res.json({
    priceUsd: PRICE_USD,
    priceInr: PRICE_USD * USD_TO_INR,
    paymentDriver: activeDriver(),
    sizes: SIZES,
    shirtColors: SHIRT_COLORS,
    countries: COUNTRIES,
    palettes: { black: palettesForShirt('black'), white: palettesForShirt('white') },
  });
});

app.get('/api/design.svg', (req, res) => {
  try {
    const word = art.sanitizeWord(req.query.word);
    const paletteId = String(req.query.palette || '');
    if (!word || !PALETTES[paletteId]) return res.status(400).json({ error: 'invalid word or palette' });
    const key = art.designKey(word, paletteId);
    let svg = svgMemCache.get(key);
    if (!svg) {
      svg = art.buildDesignSVG(word, paletteId).svg;
      if (svgMemCache.size > 200) svgMemCache.clear();
      svgMemCache.set(key, svg);
    }
    db.registerDesign(art.designId(word, paletteId), { word, paletteId });
    res.set('Content-Type', 'image/svg+xml').set('Cache-Control', 'public, max-age=3600').send(svg);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

async function ensureArtPng(designId) {
  const file = path.join(ART_CACHE, `${designId}.png`);
  if (fs.existsSync(file)) return file;
  const designs = db.getDesigns();
  const info = designs[designId];
  if (!info) throw new Error(`unknown design ${designId}`);
  const { svg } = art.buildDesignSVG(info.word, info.paletteId);
  const png = await renderPng(svg);
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, png);
  fs.renameSync(tmp, file);
  return file;
}

app.get('/art/:id.png', async (req, res) => {
  try {
    const file = await ensureArtPng(req.params.id);
    res.set('Content-Type', 'image/png').set('Cache-Control', 'public, max-age=86400').sendFile(file);
  } catch (e) {
    res.status(404).json({ error: e.message });
  }
});

// ---------- Orders ----------

function validateOrderInput(b) {
  const word = art.sanitizeWord(b.word);
  const paletteId = String(b.palette || '');
  const shirtColor = String(b.shirtColor || '');
  const size = String(b.size || '').toLowerCase();
  const r = b.recipient || {};
  const errs = [];
  if (!word) errs.push('word');
  if (!PALETTES[paletteId]) errs.push('palette');
  if (PALETTES[paletteId] && !PALETTES[paletteId].shirt.includes(shirtColor)) errs.push('shirtColor');
  if (!SHIRT_COLORS.includes(shirtColor)) errs.push('shirtColor');
  if (!SIZES.includes(size)) errs.push('size');
  for (const f of ['name', 'email', 'line1', 'townOrCity', 'postalOrZipCode', 'countryCode']) {
    if (!r[f] || !String(r[f]).trim()) errs.push(`recipient.${f}`);
  }
  if (r.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(r.email)) errs.push('recipient.email');
  if (r.countryCode && !COUNTRIES.includes(r.countryCode)) errs.push('recipient.countryCode');
  return { errs, word, paletteId, shirtColor, size };
}

app.post('/api/orders', async (req, res) => {
  try {
    const { errs, word, paletteId, shirtColor, size } = validateOrderInput(req.body || {});
    if (errs.length) return res.status(400).json({ error: 'invalid fields', fields: errs });

    const id = db.newOrderId();
    const designId = art.designId(word, paletteId);
    const edition = art.editionCode(word, paletteId);
    db.registerDesign(designId, { word, paletteId });

    const r = req.body.recipient;
    const order = {
      id,
      createdAt: new Date().toISOString(),
      word,
      paletteId,
      shirtColor,
      size,
      designId,
      edition,
      priceUsd: PRICE_USD,
      recipient: {
        name: String(r.name).slice(0, 120),
        email: String(r.email).slice(0, 120),
        phone: String(r.phone || '').slice(0, 30),
        line1: String(r.line1).slice(0, 120),
        line2: String(r.line2 || '').slice(0, 120),
        townOrCity: String(r.townOrCity).slice(0, 80),
        stateOrCounty: String(r.stateOrCounty || '').slice(0, 80),
        postalOrZipCode: String(r.postalOrZipCode).slice(0, 20),
        countryCode: String(r.countryCode).slice(0, 2),
      },
      payment: { driver: activeDriver(), status: 'pending' },
      fulfillment: { status: 'not_started' },
    };

    const base = publicUrl();
    const urls = {
      returnUrl: `${base}/payment/return/${id}`,
      successUrl: `${base}/order/${id}?r=paid`,
      cancelUrl: `${base}/?cancelled=${id}`,
      imageUrl: `${base}/art/${designId}.png`,
    };

    const driver = order.payment.driver;
    if (driver === 'paygate') {
      const cfg = db.getConfig().paygate;
      const pg = await paygate.initiate(cfg, order, PRICE_USD, {
        returnUrl: `${base}/payment/paygate/return/${id}`,
        notifyUrl: `${base}/webhooks/paygate`,
      });
      order.payment.payRequestId = pg.payRequestId;
      db.createOrder(order);
      return res.json({ orderId: id, driver, action: pg.action, params: pg.params });
    }

    if (driver === 'payu') {
      const cfg = db.getConfig().payu;
      await payu.ensureSalt(cfg); // self-heal rotating sandbox salt
      db.saveConfig(db.getConfig()); // persist possibly-updated salt
      order.payment.amountInr = PRICE_USD * USD_TO_INR;
      const amountStr = order.payment.amountInr.toFixed(2);
      const { action, params } = payu.buildPaymentParams(cfg, order, amountStr, urls);
      db.createOrder(order);
      return res.json({ orderId: id, driver, action, params });
    }

    if (driver === 'stripe') {
      const cfg = db.getConfig().stripe;
      const session = await stripeDriver.createCheckoutSession(cfg, order, PRICE_USD, urls);
      order.payment.stripeSessionId = session.id;
      db.createOrder(order);
      return res.json({ orderId: id, driver, url: session.url });
    }

    if (driver === 'btcpay') {
      const cfg = db.getConfig().btcpay;
      const invoice = await btcpay.createInvoice(cfg, order, PRICE_USD, urls);
      order.payment.btcpayInvoiceId = invoice.id;
      db.createOrder(order);
      return res.json({ orderId: id, driver, url: invoice.checkoutLink });
    }

    return res.status(500).json({ error: `unknown payment driver ${driver}` });
  } catch (e) {
    console.error('order creation failed:', e);
    res.status(502).json({ error: e.message });
  }
});

// Exactly-once fulfillment: payment confirmed -> Prodigi order.
async function fulfillOrder(order, source) {
  if (order.payment.status !== 'paid') return;
  if (order.fulfillment.status === 'submitted') return;
  if (order.fulfillment.status === 'submitting') return; // in-flight
  order.fulfillment.status = 'submitting';
  db.saveOrder(order);
  try {
    await ensureArtPng(order.designId); // make sure the PNG exists before Prodigi fetches it
    const base = publicUrl();
    const result = await prodigi.createOrder({
      merchantReference: order.id,
      idempotencyKey: order.id,
      callbackUrl: `${base}/webhooks/prodigi`,
      recipient: order.recipient,
      sku: SKU,
      attributes: { color: order.shirtColor, size: order.size },
      imageUrl: `${base}/art/${order.designId}.png`,
    });
    order.fulfillment.status = 'submitted';
    delete order.fulfillment.error;
    order.fulfillment.submittedAt = new Date().toISOString();
    order.fulfillment.prodigiOrderId = result.order && result.order.id;
    order.fulfillment.prodigiStage = result.order && result.order.status && result.order.status.stage;
    order.fulfillment.source = source;
    console.log(`[fulfill] order ${order.id} -> Prodigi ${order.fulfillment.prodigiOrderId} (via ${source})`);
  } catch (e) {
    order.fulfillment.status = 'error';
    order.fulfillment.error = e.message;
    console.error(`[fulfill] order ${order.id} failed:`, e.message);
  }
  db.saveOrder(order);
}

// Confirms a PayGate transaction server-side and fulfills if approved.
async function confirmPaygate(order, source) {
  const cfg = db.getConfig().paygate;
  const status = await paygate.queryStatus(cfg, order);
  order.payment.gatewayStatus = status.TRANSACTION_STATUS;
  if (status.TRANSACTION_STATUS === '1') {
    if (order.payment.status !== 'paid') {
      order.payment.status = 'paid';
      order.payment.paidAt = new Date().toISOString();
      order.payment.gatewayTxnId = status.TRANSACTION_ID || order.payment.payRequestId;
      db.saveOrder(order);
    }
    await fulfillOrder(order, source);
    return 'paid';
  }
  if (order.payment.status === 'pending') {
    order.payment.status = 'failed';
    order.payment.failReason = `paygate status ${status.TRANSACTION_STATUS} (${status.RESULT_DESC || 'not approved'})`;
    db.saveOrder(order);
  }
  return 'not_paid';
}

// PayGate redirects the customer's browser here after payment (POST).
app.post('/payment/paygate/return/:orderId', async (req, res) => {
  const order = db.getOrder(req.params.orderId);
  if (!order) return res.status(404).send('unknown order');
  try {
    const result = await confirmPaygate(order, 'paygate-return');
    return res.redirect(303, `/order/${order.id}?r=${result === 'paid' ? 'paid' : 'failed'}`);
  } catch (e) {
    console.error('paygate return error:', e.message);
    return res.redirect(303, `/order/${order.id}?r=pending`);
  }
});
app.get('/payment/paygate/return/:orderId', async (req, res) => {
  const order = db.getOrder(req.params.orderId);
  if (!order) return res.status(404).send('unknown order');
  try {
    const result = await confirmPaygate(order, 'paygate-return');
    return res.redirect(303, `/order/${order.id}?r=${result === 'paid' ? 'paid' : 'failed'}`);
  } catch (e) {
    return res.redirect(303, `/order/${order.id}?r=pending`);
  }
});

// PayGate server-to-server notify (fires even if the customer closes the tab).
app.post('/webhooks/paygate', async (req, res) => {
  const order = db.getOrder((req.body || {}).REFERENCE);
  if (order) {
    try {
      await confirmPaygate(order, 'paygate-notify');
    } catch (e) {
      console.error('paygate notify error:', e.message);
    }
  }
  res.send('OK');
});

// PayU posts the payment result here (both success and failure URLs).
app.post('/payment/return/:orderId', async (req, res) => {
  const order = db.getOrder(req.params.orderId);
  if (!order) return res.status(404).send('unknown order');
  const f = req.body || {};
  const cfg = db.getConfig().payu;
  let ok = false;
  try {
    ok = f.txnid === order.id && payu.verifyResponse(cfg, f) && String(f.status).toLowerCase() === 'success';
  } catch (e) {
    console.error('payu verify error:', e.message);
  }
  if (ok) {
    order.payment.status = 'paid';
    order.payment.paidAt = new Date().toISOString();
    order.payment.gatewayTxnId = f.mihpayid || null;
    order.payment.mode = f.mode || null;
    db.saveOrder(order);
    await fulfillOrder(order, 'payu-return');
    return res.redirect(303, `/order/${order.id}?r=paid`);
  }
  order.payment.status = 'failed';
  order.payment.failReason = f.error_Message || f.status || 'hash-mismatch';
  db.saveOrder(order);
  return res.redirect(303, `/order/${order.id}?r=failed`);
});

// Stripe webhook: checkout.session.completed
app.post('/webhooks/stripe', async (req, res) => {
  const cfg = db.getConfig().stripe || {};
  const payload = req.body.toString('utf8');
  if (cfg.webhookSecret && !stripeDriver.verifyWebhookSignature(cfg.webhookSecret, payload, req.headers['stripe-signature'])) {
    return res.status(400).send('bad signature');
  }
  let event;
  try {
    event = JSON.parse(payload);
  } catch {
    return res.status(400).send('bad json');
  }
  if (event.type === 'checkout.session.completed') {
    const s = event.data.object;
    const order = db.getOrder(s.metadata && s.metadata.orderId);
    if (order && s.payment_status === 'paid') {
      order.payment.status = 'paid';
      order.payment.paidAt = new Date().toISOString();
      order.payment.stripePaymentIntent = s.payment_intent;
      db.saveOrder(order);
      await fulfillOrder(order, 'stripe-webhook');
    }
  }
  res.json({ received: true });
});

// BTCPay webhook
app.post('/webhooks/btcpay', async (req, res) => {
  const cfg = db.getConfig().btcpay || {};
  const payload = req.body.toString('utf8');
  if (cfg.webhookSecret && !btcpay.verifyWebhookSignature(cfg.webhookSecret, payload, req.headers['btcpay-sig'])) {
    return res.status(400).send('bad signature');
  }
  let event;
  try {
    event = JSON.parse(payload);
  } catch {
    return res.status(400).send('bad json');
  }
  if (event.type === 'InvoiceSettled' || event.type === 'InvoiceProcessing') {
    const order = db.getOrder(event.metadata && event.metadata.orderId);
    if (order && event.type === 'InvoiceSettled') {
      order.payment.status = 'paid';
      order.payment.paidAt = new Date().toISOString();
      db.saveOrder(order);
      await fulfillOrder(order, 'btcpay-webhook');
    }
  }
  res.json({ received: true });
});

// Retry fulfillment after a fixable error (paid orders only).
app.post('/api/orders/:id/retry-fulfillment', async (req, res) => {
  const order = db.getOrder(req.params.id);
  if (!order) return res.status(404).json({ error: 'not found' });
  if (order.payment.status !== 'paid') return res.status(400).json({ error: 'order not paid' });
  if (order.fulfillment.status !== 'error') return res.status(400).json({ error: `fulfillment is ${order.fulfillment.status}` });
  order.fulfillment.status = 'not_started';
  db.saveOrder(order);
  await fulfillOrder(order, 'manual-retry');
  res.json({ fulfillment: order.fulfillment });
});

// Prodigi callback: order status updates
app.post('/webhooks/prodigi', (req, res) => {
  const body = req.body || {};
  const orderRef = body.order && body.order.merchantReference;
  const order = orderRef && db.getOrder(orderRef);
  if (order) {
    order.fulfillment.prodigiStage = body.order.status && body.order.status.stage;
    order.fulfillment.prodigiDetails = body.order.status && body.order.status.details;
    order.fulfillment.lastCallbackAt = new Date().toISOString();
    db.saveOrder(order);
  }
  res.json({ received: true });
});

// ---------- Status pages ----------

app.get('/api/orders/:id', async (req, res) => {
  const order = db.getOrder(req.params.id);
  if (!order) return res.status(404).json({ error: 'not found' });
  // Refresh fulfillment stage from Prodigi (cheap, keeps status live even without callbacks)
  if (order.fulfillment.status === 'submitted' && order.fulfillment.prodigiOrderId) {
    try {
      const po = await prodigi.getOrder(order.fulfillment.prodigiOrderId);
      order.fulfillment.prodigiStage = po.order.status.stage;
      order.fulfillment.prodigiDetails = po.order.status.details;
      order.fulfillment.shipments = po.order.shipments || [];
      db.saveOrder(order);
    } catch { /* non-fatal */ }
  }
  res.json({
    id: order.id,
    word: order.word,
    paletteId: order.paletteId,
    shirtColor: order.shirtColor,
    size: order.size,
    edition: order.edition,
    designId: order.designId,
    priceUsd: order.priceUsd,
    payment: { driver: order.payment.driver, status: order.payment.status, gatewayTxnId: order.payment.gatewayTxnId || null },
    fulfillment: order.fulfillment,
  });
});

app.get('/order/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'order.html'));
});

app.listen(PORT, () => {
  console.log(`ONEOFONE listening on :${PORT} (public: ${publicUrl()}, driver: ${activeDriver()})`);
});
