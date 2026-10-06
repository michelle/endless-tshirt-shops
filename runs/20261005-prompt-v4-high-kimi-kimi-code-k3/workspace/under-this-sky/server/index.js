import express from 'express';
import crypto from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';
import { renderDesignSVG } from '../public/starmap.js';
import { localToUtcIso } from './timezone.js';
import { signParams, verifyToken } from './sign.js';
import * as prodigi from './prodigi.js';
import { putOrder, getOrder } from './store.js';

const {
  PORT = 8787,
  PUBLIC_URL = `http://localhost:${PORT}`,
  STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET,
  ART_SIGNING_SECRET,
} = process.env;

if (!STRIPE_SECRET_KEY || !ART_SIGNING_SECRET) {
  console.error('STRIPE_SECRET_KEY and ART_SIGNING_SECRET are required');
  process.exit(1);
}

// Bella+Canvas 3001 via Prodigi, front print area 4680x5790 (~300 DPI)
const SHIRT = {
  sku: 'GLOBAL-TEE-BC-3001',
  printW: 4680,
  printH: 5790,
  priceCents: 3499,
  currency: 'usd',
  sizes: ['s', 'm', 'l', 'xl', '2xl', '3xl'],
  colors: { black: 'dark', white: 'light', 'navy blue': 'dark' },
};

const SHIP_COUNTRIES = ['US','GB','CA','AU','NZ','DE','FR','ES','IT','NL','BE','IE','PT','SE','NO','DK','FI','AT','CH','PL','CZ','JP','SG','AE','BR','MX'];

const catalog = JSON.parse(readFileSync(new URL('../public/catalog.json', import.meta.url)));
const FONT_FILES = ['fonts/CormorantGaramond-500.ttf', 'fonts/CormorantGaramond-600.ttf', 'fonts/CormorantGaramond-700.ttf'];
const CACHE_DIR = new URL('../data/cache/', import.meta.url).pathname;
mkdirSync(CACHE_DIR, { recursive: true });

const app = express();
app.use((req, res, next) => {
  // keep the stripe webhook body raw for signature verification
  if (req.path === '/api/stripe/webhook') return next();
  express.json()(req, res, next);
});

// ---------- design rendering ----------
function renderPng(params) {
  const { iso } = localToUtcIso(params.lat, params.lon, params.d, params.t);
  const svg = renderDesignSVG(
    { iso, lat: params.lat, lon: params.lon, title: params.title, subtitle: params.sub, place: params.place, theme: params.theme },
    catalog,
    { width: SHIRT.printW, height: SHIRT.printH }
  );
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: SHIRT.printW },
    font: { fontFiles: FONT_FILES, loadSystemFonts: false, defaultFontFamily: 'Cormorant Garamond' },
    background: 'rgba(0,0,0,0)',
  });
  return resvg.render().asPng();
}

function validateDesignParams(p) {
  const errs = [];
  if (typeof p.lat !== 'number' || p.lat < -80 || p.lat > 84) errs.push('lat');
  if (typeof p.lon !== 'number' || p.lon < -180 || p.lon > 180) errs.push('lon');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.d || '') || Number.isNaN(Date.parse(`${p.d}T00:00:00Z`))) errs.push('date');
  if (!/^\d{2}:\d{2}$/.test(p.t || '')) errs.push('time');
  if (typeof p.title !== 'string' || p.title.trim().length === 0 || p.title.length > 42) errs.push('title');
  if (typeof p.sub !== 'string' || p.sub.length > 60) errs.push('sub');
  if (typeof p.place !== 'string' || p.place.length > 44) errs.push('place');
  if (!['dark', 'light'].includes(p.theme)) errs.push('theme');
  return errs;
}

// public, signed PNG endpoint — this is the URL handed to Prodigi
app.get('/api/design/:token.png', (req, res) => {
  const params = verifyToken(req.params.token, ART_SIGNING_SECRET);
  if (!params || validateDesignParams(params).length) return res.status(403).send('invalid token');
  const key = crypto.createHash('sha1').update(req.params.token).digest('hex');
  const file = `${CACHE_DIR}${key}.png`;
  try {
    if (!existsSync(file)) writeFileSync(file, renderPng(params));
    res.set({ 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400' });
    res.sendFile(file);
  } catch (e) {
    console.error('render failed', e);
    res.status(500).send('render failed');
  }
});

// timezone resolve for live preview + checkout
app.post('/api/resolve', (req, res) => {
  try {
    const { lat, lon, d, t } = req.body || {};
    res.json(localToUtcIso(Number(lat), Number(lon), String(d), String(t)));
  } catch {
    res.status(400).json({ error: 'invalid input' });
  }
});

// ---------- stripe ----------
async function stripeCall(method, path, formParams) {
  const res = await fetch(`https://api.stripe.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      ...(formParams ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    },
    body: formParams ? new URLSearchParams(formParams).toString() : undefined,
  });
  return { status: res.status, json: await res.json() };
}

app.post('/api/checkout', async (req, res) => {
  const b = req.body || {};
  const params = {
    lat: Number(b.lat), lon: Number(b.lon),
    d: String(b.date || ''), t: String(b.time || '12:00'),
    title: String(b.title || '').trim(), sub: String(b.subtitle || '').trim(),
    place: String(b.place || '').trim(), theme: SHIRT.colors[b.color] || null,
  };
  const errs = validateDesignParams(params);
  const size = String(b.size || '').toLowerCase();
  const color = String(b.color || '').toLowerCase();
  if (!SHIRT.sizes.includes(size)) errs.push('size');
  if (!(color in SHIRT.colors)) errs.push('color');
  if (errs.length) return res.status(400).json({ error: `invalid: ${errs.join(', ')}` });

  const token = signParams(params, ART_SIGNING_SECRET);
  const description = [
    `“${params.title}”`,
    params.place,
    `${params.d} ${params.t} local`,
  ].filter(Boolean).join(' · ');

  const { status, json } = await stripeCall('POST', '/v1/checkout/sessions', {
    mode: 'payment',
    success_url: `${PUBLIC_URL}/success.html?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${PUBLIC_URL}/#customize`,
    'line_items[0][price_data][currency]': SHIRT.currency,
    'line_items[0][price_data][unit_amount]': String(SHIRT.priceCents),
    'line_items[0][price_data][product_data][name]': `Custom Star Map Tee — ${color.replace(/\b\w/g, (c) => c.toUpperCase())} / ${size.toUpperCase()}`,
    'line_items[0][price_data][product_data][description]': description,
    'line_items[0][quantity]': '1',
    'metadata[token]': token,
    'metadata[size]': size,
    'metadata[color]': color,
    'shipping_address_collection[allowed_countries][0]': SHIP_COUNTRIES[0],
    ...Object.fromEntries(SHIP_COUNTRIES.slice(1).map((c, i) => [`shipping_address_collection[allowed_countries][${i + 1}]`, c])),
  });
  if (status !== 200 || !json.url) {
    console.error('checkout session failed', status, json);
    return res.status(502).json({ error: 'payment provider error' });
  }
  putOrder(json.id, { status: 'awaiting_payment', params, size, color, token });
  res.json({ url: json.url });
});

function verifyStripeSignature(rawBody, header, secret, toleranceSec = 300) {
  if (!header) return false;
  const parts = header.split(',').map((kv) => kv.split('='));
  const t = parts.find(([k]) => k === 't')?.[1];
  const sigs = parts.filter(([k]) => k === 'v1').map(([, v]) => v);
  if (!t || !sigs.length) return false;
  if (Math.abs(Date.now() / 1000 - Number(t)) > toleranceSec) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${t}.${rawBody}`).digest();
  return sigs.some((s) => {
    const got = Buffer.from(s, 'hex');
    return got.length === expected.length && crypto.timingSafeEqual(got, expected);
  });
}

async function fulfill(session) {
  const existing = getOrder(session.id);
  if (existing?.prodigiOrderId) return; // idempotent

  const token = session.metadata?.token;
  const params = token && verifyToken(token, ART_SIGNING_SECRET);
  const size = session.metadata?.size;
  const color = session.metadata?.color;
  if (!params || !size || !color) {
    putOrder(session.id, { ...(existing || {}), status: 'error', error: 'bad session metadata' });
    return;
  }

  const sd = session.shipping_details || session.collected_information?.shipping_details || {};
  const a = sd.address || {};
  const order = {
    merchantReference: session.id,
    idempotencyKey: session.id,
    shippingMethod: 'Standard',
    recipient: {
      name: sd.name || session.customer_details?.name || 'Customer',
      email: session.customer_details?.email || undefined,
      address: {
        line1: a.line1 || '',
        line2: a.line2 || undefined,
        townOrCity: a.city || '',
        stateOrCounty: a.state || undefined,
        postalOrZipCode: a.postal_code || '',
        countryCode: a.country || '',
      },
    },
    items: [{
      merchantReference: 'starmap-tee-1',
      sku: SHIRT.sku,
      copies: 1,
      sizing: 'fitPrintArea',
      attributes: { size, color },
      assets: [{ printArea: 'front', url: `${PUBLIC_URL}/api/design/${token}.png` }],
      recipientCost: session.amount_total != null
        ? { amount: (session.amount_total / 100).toFixed(2), currency: (session.currency || 'usd').toUpperCase() }
        : undefined,
    }],
    callbackUrl: `${PUBLIC_URL}/api/prodigi/callback`,
    metadata: JSON.stringify({ store: 'under-this-sky', session: session.id }),
  };

  const { status, json } = await prodigi.createOrder(order);
  const ok = status === 200 && ['Created', 'AlreadyExists', 'OnHold', 'CreatedWithIssues'].includes(json?.outcome);
  putOrder(session.id, {
    ...(existing || {}),
    status: ok ? 'submitted' : 'error',
    params, size, color, token,
    recipient: { name: order.recipient.name, city: a.city, country: a.country },
    prodigiOutcome: json?.outcome,
    prodigiOrderId: json?.order?.id,
    prodigiError: ok ? undefined : { status, body: json },
  });
  console.log(`fulfill ${session.id}: prodigi ${json?.outcome} ${json?.order?.id || ''}`);
}

app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const raw = req.body;
  if (!verifyStripeSignature(raw, req.headers['stripe-signature'], STRIPE_WEBHOOK_SECRET)) {
    return res.status(400).send('bad signature');
  }
  let event;
  try { event = JSON.parse(raw.toString('utf8')); } catch { return res.status(400).send('bad json'); }
  try {
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      const session = event.data.object;
      if (session.payment_status === 'paid') await fulfill(session);
    }
  } catch (e) {
    console.error('webhook handler error', e);
    return res.status(500).send('handler error');
  }
  res.json({ received: true });
});

app.post('/api/prodigi/callback', (req, res) => {
  try {
    appendFileSync(new URL('../data/prodigi-callbacks.jsonl', import.meta.url), JSON.stringify({ at: new Date().toISOString(), body: req.body }) + '\n');
  } catch {}
  res.json({ received: true });
});

// ---------- order status for success page ----------
app.get('/api/order/:sessionId', (req, res) => {
  const o = getOrder(req.params.sessionId);
  if (!o) return res.status(404).json({ error: 'unknown order' });
  res.json({
    status: o.status,
    prodigiOrderId: o.prodigiOrderId || null,
    title: o.params?.title,
    place: o.params?.place,
    date: o.params?.d,
    time: o.params?.t,
    color: o.color,
    size: o.size,
    imageUrl: o.token ? `/api/design/${o.token}.png` : null,
  });
});

app.use(express.static(new URL('../public', import.meta.url).pathname));

app.listen(PORT, () => console.log(`under-this-sky listening on :${PORT} (public: ${PUBLIC_URL})`));
