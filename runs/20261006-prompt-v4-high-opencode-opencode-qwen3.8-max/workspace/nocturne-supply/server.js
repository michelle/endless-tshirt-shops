// Nocturne Supply Co. — storefront + fulfillment server.
const express = require('express');
const path = require('path');
const crypto = require('crypto');

const { buildSVG, skyFacts } = require('./lib/design');
const { mockupSVG } = require('./scripts/make-mockups');
const { resolveMoment, formatCoords } = require('./lib/moment');
const { PRODUCT, SIZES, COLORS, PRICING, SHIPPING_METHODS, assertValidItems } = require('./lib/catalog-config');
const prodigi = require('./lib/prodigi');
const orders = require('./lib/orders');
const fulfillment = require('./lib/fulfillment');

const app = express();
const PORT = process.env.PORT || 3000;

// Stripe (optional at runtime; simulated test checkout when absent)
let stripe = null;
const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
if (STRIPE_SECRET) {
  try {
    stripe = require('stripe')(STRIPE_SECRET);
  } catch (e) {
    console.error('stripe sdk init failed:', e.message);
  }
}
const paymentsMode = stripe ? 'stripe' : 'simulated';

// webhook needs the raw body; parse JSON for everything else
app.use('/api/stripe-webhook', express.raw({ type: '*/*' }));
app.use(express.json({ limit: '256kb' }));

app.use(express.static(path.join(__dirname, 'public')));
app.use('/artwork', express.static(path.join(__dirname, 'artwork')));

const HEADLINE_PRESETS = [
  'THE NIGHT YOU WERE BORN',
  'THE NIGHT WE MET',
  'THE NIGHT WE SAID YES',
  'THE NIGHT WE BECAME US',
  'THE NIGHT THE SKY WAS OURS',
  'UNDER THIS SKY',
];

function safeText(s, max) {
  return String(s ?? '').replace(/[<>&\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

// ---------------------------------------------------------------- config ----
app.get('/api/config', (_req, res) => {
  res.json({
    paymentsMode,
    stripe: stripe ? { publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || null } : null,
    product: { sku: PRODUCT.sku, name: PRODUCT.name },
    sizes: SIZES,
    colors: COLORS,
    pricing: PRICING,
    shippingMethods: SHIPPING_METHODS,
    headlinePresets: HEADLINE_PRESETS,
    prodigiEnv: prodigi.PRODIGI_BASE.includes('sandbox') ? 'sandbox' : 'live',
  });
});

// ---------------------------------------------------------------- preview ---
app.get('/api/preview', (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lon = parseFloat(req.query.lon);
    if (!Number.isFinite(lat) || lat < -89.9 || lat > 89.9) throw new Error('invalid latitude');
    if (!Number.isFinite(lon) || lon < -180 || lon > 180) throw new Error('invalid longitude');
    const shirtColor = COLORS.find((c) => c.id === req.query.color)?.id || 'black';
    const moment = resolveMoment(
      String(req.query.date || ''),
      String(req.query.time || '22:00'),
      lat,
      lon
    );
    const spec = {
      utcDate: moment.utcDate,
      lat,
      lon,
      headline: safeText(req.query.headline, 60) || 'THE NIGHT YOU WERE BORN',
      dedication: safeText(req.query.dedication, 28) || null,
      subline: `${moment.dateLong} · ${moment.time12} · ${safeText(req.query.place, 48) || formatCoords(lat, lon)}`.toUpperCase(),
      coordsLine: formatCoords(lat, lon),
      shirtColor,
    };
    const svg = buildSVG(spec, { size: 2000, mwStep: 2, maxStars: 2600 });
    const { renderPNG } = require('./lib/design');
    const mockPng = renderPNG(svg, 1500).toString('base64');
    const facts = skyFacts(spec);
    res.json({ svg, mockupSvg: mockupSVG(mockPng, shirtColor), facts, moment: { zone: moment.zone, dateLong: moment.dateLong, time12: moment.time12 } });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ---------------------------------------------------------------- quote -----
app.post('/api/quote', async (req, res) => {
  try {
    const items = assertValidItems(req.body.items);
    const country = String(req.body.country || 'US').toUpperCase();
    if (!/^[A-Z]{2}$/.test(country)) throw new Error('invalid country code');
    const method = SHIPPING_METHODS[req.body.shippingMethod] ? req.body.shippingMethod : 'Standard';

    const quoteItems = [];
    for (const it of items) {
      quoteItems.push({
        sku: PRODUCT.sku,
        copies: it.qty,
        attributes: { color: it.color, size: it.size },
        assets: [{ printArea: PRODUCT.printArea }],
      });
    }
    const q = await prodigi.quote(country, quoteItems, method);

    const shirtCents = items.reduce((n, it) => n + PRICING.shirtUnit * it.qty, 0);
    const shippingCents = Math.round((q.shippingCost + PRICING.shippingMarkup / 100) * 100);
    const totalCents = shirtCents + shippingCents + PRICING.handling;
    res.json({
      method,
      eta: SHIPPING_METHODS[method].eta,
      fulfillmentCountry: q.fulfillmentCountry,
      carrier: q.carrier,
      lineItems: [
        { label: `Shirts (${items.reduce((n, i) => n + i.qty, 0)})`, cents: shirtCents },
        { label: `Shipping (${method})`, cents: shippingCents },
        { label: 'Packing & handling', cents: PRICING.handling },
      ],
      totalCents,
      currency: PRICING.currency,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --------------------------------------------------------------- checkout ---
app.post('/api/checkout', async (req, res) => {
  try {
    const items = assertValidItems(req.body.items);
    const b = req.body;
    const addr = b.address || {};
    const required = ['name', 'line1', 'city', 'postal', 'country'];
    for (const k of required) {
      if (!safeText(addr[k], 200)) throw new Error(`shipping address field missing: ${k}`);
    }
    const lat = parseFloat(b.design?.lat);
    const lon = parseFloat(b.design?.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) throw new Error('design location missing');
    const moment = resolveMoment(String(b.design.date), String(b.design.time || '22:00'), lat, lon);

    const quote = {
      items: items.map((it) => ({
        sku: PRODUCT.sku,
        copies: it.qty,
        attributes: { color: it.color, size: it.size },
        assets: [{ printArea: PRODUCT.printArea }],
      })),
    };
    const method = SHIPPING_METHODS[b.shippingMethod] ? b.shippingMethod : 'Standard';
    let q;
    try {
      q = await prodigi.quote(String(addr.country).toUpperCase(), quote.items, method);
    } catch (e) {
      q = { shippingCost: method === 'Express' ? 18 : 6 };
    }

    const shirtCents = items.reduce((n, it) => n + PRICING.shirtUnit * it.qty, 0);
    const shippingCents = Math.round((q.shippingCost + PRICING.shippingMarkup / 100) * 100);
    const totalCents = shirtCents + shippingCents + PRICING.handling;

    const order = orders.save(orders.appendHistory({
      id: orders.orderId(),
      created: new Date().toISOString(),
      status: 'awaiting_payment',
      design: {
        date: b.design.date,
        time: b.design.time || '22:00',
        lat,
        lon,
        utcISO: moment.utcDate.toISOString(),
        timezone: moment.zone,
        headline: safeText(b.design.headline, 60) || 'THE NIGHT YOU WERE BORN',
        dedication: safeText(b.design.dedication, 28) || null,
        place: safeText(b.design.place, 48) || '',
        subline: `${moment.dateLong} · ${moment.time12} · ${safeText(b.design.place, 48) || formatCoords(lat, lon)}`,
        coordsLine: formatCoords(lat, lon),
      },
      items,
      shipping: {
        name: safeText(addr.name, 200),
        email: safeText(b.email, 200) || safeText(addr.email, 200) || null,
        phone: safeText(addr.phone, 60) || null,
        method,
        address: {
          line1: safeText(addr.line1, 200),
          line2: safeText(addr.line2, 200) || null,
          city: safeText(addr.city, 200),
          state: safeText(addr.state, 200) || null,
          postal: safeText(addr.postal, 40),
          country: String(addr.country).toUpperCase(),
        },
      },
      pricing: { currency: PRICING.currency, shirtCents, shippingCents, handlingCents: PRICING.handling, totalCents },
      payment: null,
      prodigi: null,
    }, 'created'));

    if (stripe) {
      const base = (process.env.PUBLIC_URL || `http://localhost:${PORT}`).replace(/\/+$/, '');
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        client_reference_id: order.id,
        metadata: { orderId: order.id },
        customer_email: order.shipping.email || undefined,
        line_items: [
          ...items.map((it) => ({
            price_data: {
              currency: 'usd',
              unit_amount: PRICING.shirtUnit,
              product_data: { name: `Nocturne sky tee — ${it.size.toUpperCase()} / ${it.color}` },
            },
            quantity: it.qty,
          })),
          {
            price_data: { currency: 'usd', unit_amount: shippingCents, product_data: { name: `Shipping (${method})` } },
            quantity: 1,
          },
          {
            price_data: { currency: 'usd', unit_amount: PRICING.handling, product_data: { name: 'Packing & handling' } },
            quantity: 1,
          },
        ],
        success_url: `${base}/success.html?order=${order.id}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${base}/checkout.html?cancelled=1&order=${order.id}`,
      });
      order.stripeSessionId = session.id;
      orders.appendHistory(order, 'checkout_session_created', { session: session.id });
      orders.save(order);
      res.json({ mode: 'stripe', orderId: order.id, url: session.url });
    } else {
      order.payment = { method: 'simulated', note: 'Stripe keys not configured; simulated test payment' };
      orders.save(order);
      res.json({ mode: 'simulated', orderId: order.id, totalCents });
    }
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// simulated payment confirmation (only when Stripe is not configured)
app.post('/api/demo-pay', async (req, res) => {
  if (stripe) return res.status(400).json({ error: 'payments handled by Stripe when configured' });
  const order = orders.load(req.body.orderId);
  if (!order) return res.status(404).json({ error: 'order not found' });
  if (order.status !== 'awaiting_payment') {
    return res.json({ orderId: order.id, status: order.status });
  }
  order.status = 'paid';
  order.payment = {
    method: 'simulated',
    paidAt: new Date().toISOString(),
    amountCents: order.pricing.totalCents,
    currency: order.pricing.currency,
  };
  orders.appendHistory(order, 'payment_succeeded', { simulated: true });
  orders.save(order);
  const fulfilled = await fulfillment.fulfill(order);
  res.json({ orderId: order.id, status: fulfilled.status, prodigiOrderId: fulfilled.prodigi?.orderId });
});

// ------------------------------------------------------------ stripe hook ---
app.post('/api/stripe-webhook', async (req, res) => {
  if (!stripe || !STRIPE_WEBHOOK_SECRET) return res.status(400).end();
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('webhook signature invalid:', err.message);
    return res.status(400).end();
  }
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const orderId = session.metadata?.orderId || session.client_reference_id;
    const order = orders.load(orderId);
    if (order && order.status === 'awaiting_payment') {
      order.status = 'paid';
      order.stripeSessionId = session.id;
      order.payment = {
        method: 'stripe',
        paidAt: new Date().toISOString(),
        amountCents: session.amount_total,
        currency: session.currency,
        paymentIntent: session.payment_intent || null,
      };
      orders.appendHistory(order, 'payment_succeeded', { stripeSession: session.id });
      orders.save(order);
      await fulfillment.fulfill(order);
    }
  }
  res.json({ received: true });
});

// ---------------------------------------------------------------- orders ----
// Customer-facing status (no PII beyond what the holder of the id already has)
app.get('/api/order/:id', async (req, res) => {
  const order = orders.load(req.params.id);
  if (!order) return res.status(404).json({ error: 'order not found' });
  let prodigiInfo = null;
  if (order.status === 'fulfilled') {
    try {
      prodigiInfo = await fulfillment.prodigiStatus(order);
    } catch (_) { /* status polling is best-effort */ }
  }
  res.json({
    id: order.id,
    created: order.created,
    status: order.status,
    payment: order.payment ? { method: order.payment.method, paidAt: order.payment.paidAt, amountCents: order.payment.amountCents, currency: order.payment.currency } : null,
    items: order.items,
    shippingMethod: order.shipping.method,
    design: {
      headline: order.design.headline,
      dedication: order.design.dedication,
      subline: order.design.subline,
      coordsLine: order.design.coordsLine,
      lat: order.design.lat,
      lon: order.design.lon,
      date: order.design.date,
      time: order.design.time,
    },
    totalCents: order.pricing.totalCents,
    prodigi: order.prodigi?.orderId ? { orderId: order.prodigi.orderId } : null,
    prodigiStatus: prodigiInfo,
    history: order.statusHistory,
  });
});

// operator endpoint (set ADMIN_TOKEN to enable); lists all orders + statuses
app.get('/api/admin/orders', (req, res) => {
  const token = process.env.ADMIN_TOKEN;
  if (!token || req.query.token !== token) return res.status(403).json({ error: 'forbidden' });
  res.json(orders.list().map((o) => ({
    id: o.id, created: o.created, status: o.status,
    total: o.pricing?.totalCents, prodigiOrderId: o.prodigi?.orderId ?? null,
    country: o.shipping?.address?.country, history: o.statusHistory,
  })));
});

// operator retry for failed fulfillments
app.post('/api/admin/retry', async (req, res) => {
  const token = process.env.ADMIN_TOKEN;
  if (!token || req.body.token !== token) return res.status(403).json({ error: 'forbidden' });
  const order = orders.load(req.body.orderId);
  if (!order) return res.status(404).json({ error: 'order not found' });
  if (order.status !== 'fulfillment_failed') return res.status(400).json({ error: `order is ${order.status}` });
  order.status = 'paid';
  orders.save(order);
  const done = await fulfillment.fulfill(order);
  res.json({ orderId: done.id, status: done.status });
});

app.get('/healthz', (_req, res) => res.json({ ok: true, paymentsMode }));

app.listen(PORT, () => {
  console.log(`Nocturne Supply Co. listening on :${PORT} (payments: ${paymentsMode}, prodigi: ${prodigi.PRODIGI_BASE})`);
});
