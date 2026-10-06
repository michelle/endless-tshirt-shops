// Contours — store server. Plain node:http, no framework.
// Static storefront + JSON API + fulfilment pipeline.

import http from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from './lib/config.mjs';
import { createStripeApi, verifyWebhookSignature } from './lib/stripeapi.mjs';
import { createProdigiApi, shippingQuote, ProdigiError } from './lib/prodigi.mjs';
import { getTerrain } from './lib/terrarium.mjs';
import { renderDesignSVG, renderPrintSVG, PRINT_W, cleanTitle, cleanPlace } from './public/design.js';
import { renderSvgToPng } from './lib/svgtopng.mjs';
import { verifySignedParams, mintSignedParams } from './lib/signedurl.mjs';
import { fulfilFromSession, prodigiStatus } from './lib/fulfil.mjs';
import { recentOrders, getOrder } from './lib/orders.mjs';
import {
  SKU, COLORS, SIZES, EXTENTS, COUNTRIES, SHIPPING_METHODS,
  validateColorSize, unitPriceCents, shirtPriceCents, shippingRetailCents,
  colorByKey, extentByKey, MAX_TITLE_LEN, MAX_PLACE_LEN,
} from './public/catalog.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUB = path.join(ROOT, 'public');
const cfg = loadConfig();
const stripe = createStripeApi(cfg.stripeSecretKey);
const prodigi = createProdigiApi(cfg.prodigiApiKey, cfg.prodigiEnv);

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ttf': 'font/ttf',
  '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8',
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, {
    'Content-Length': Buffer.byteLength(body),
    ...headers,
  });
  res.end(body);
}
function sendJSON(res, status, obj, headers = {}) {
  send(res, status, JSON.stringify(obj), { 'Content-Type': 'application/json; charset=utf-8', ...headers });
}
function sendError(res, status, message) {
  sendJSON(res, status, { error: String(message).slice(0, 300) });
}

function baseUrlOf(req) {
  if (cfg.publicBaseUrl) return cfg.publicBaseUrl.replace(/\/$/, '');
  const host = req.headers.host;
  if (!host) return 'http://localhost:' + cfg.port;
  const proto = req.headers['x-forwarded-proto'] || (req.socket.encrypted ? 'https' : 'http');
  return `${proto}://${host}`;
}

function serveStatic(req, res, pathname) {
  let rel = pathname === '/' ? '/index.html' : pathname;
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.normalize(path.join(PUB, rel));
  if (!file.startsWith(PUB)) return sendError(res, 403, 'forbidden');
  if (!existsSync(file) || !statSync(file).isFile()) return sendError(res, 404, 'not found: ' + pathname);
  const ext = path.extname(file).toLowerCase();
  const body = readFileSync(file);
  res.writeHead(200, {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Content-Length': body.length,
    'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600',
  });
  req.method === 'HEAD' ? res.end() : res.end(body);
}

function readBody(req, limit = 1_000_000) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(new Error('body too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

// ---------- API handlers ----------

async function handleGeo(res, url) {
  const q = (url.searchParams.get('q') || '').trim();
  if (q.length < 2) return sendJSON(res, 200, { results: [] });
  const api = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=8&language=en&format=json`;
  const r = await fetch(api, { signal: AbortSignal.timeout(10000) });
  if (!r.ok) return sendError(res, 502, 'geocoding service unavailable');
  const data = await r.json();
  const results = (data.results || []).map((x) => ({
    name: x.name,
    admin1: x.admin1, country: x.country, countryCode: x.country_code,
    lat: x.latitude, lng: x.longitude,
    elevation: x.elevation, feature: x.feature_code,
    label: [x.name, x.admin1, x.country].filter(Boolean).join(', '),
  }));
  sendJSON(res, 200, { results });
}

async function handleContours(res, url) {
  const lat = Number(url.searchParams.get('lat'));
  const lng = Number(url.searchParams.get('lng'));
  const extParam = url.searchParams.get('extent') || 'valley';
  const ext = extentByKey(extParam) || EXTENTS.find((e) => Math.abs(e.km - Number(extParam)) < 0.01);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !ext) {
    return sendError(res, 400, 'lat, lng and a valid extent are required');
  }
  try {
    const terrain = await getTerrain(lat, lng, ext.km);
    sendJSON(res, 200, { extentKm: ext.km, ...terrain }, { 'Cache-Control': 'public, max-age=86400' });
  } catch (e) {
    sendError(res, e instanceof ProdigiError ? e.status || 502 : 400, e.message);
  }
}

async function computeShippingOption({ country, sizeKey, colorKey, qty, shippingMethod }) {
  const color = colorByKey(colorKey);
  const quotes = await shippingQuote(prodigi, {
    destinationCountryCode: country,
    item: { sku: SKU, copies: qty, attributes: { size: sizeKey, color: color.prodigi } },
  });
  const wanted = SHIPPING_METHODS.find((m) => m.key === shippingMethod)?.prodigi || 'Budget';
  const match = quotes.find((q) => q.method === wanted) || quotes[0];
  return {
    method: match.method,
    retailCents: shippingRetailCents(match.shippingCost?.amount ?? '5.00'),
    costCents: Math.round(parseFloat(match.shippingCost?.amount || '0') * 100),
    carrier: match.carrier ? `${match.carrier.name} · ${match.carrier.service}` : null,
  };
}

async function handleQuote(res, url) {
  const country = (url.searchParams.get('country') || '').toUpperCase();
  const sizeKey = url.searchParams.get('size') || 'l';
  const colorKey = url.searchParams.get('color') || 'black';
  const qty = Math.min(Math.max(Number(url.searchParams.get('qty')) || 1, 1), 10);
  const shippingMethod = url.searchParams.get('method') || 'budget';
  if (!COUNTRIES.some((c) => c.code === country)) return sendError(res, 400, 'unsupported destination country');
  if (!validateColorSize(colorKey, sizeKey)) return sendError(res, 400, 'invalid colour/size combination');
  try {
    const option = await computeShippingOption({ country, sizeKey, colorKey, qty, shippingMethod });
    sendJSON(res, 200, {
      country,
      unitCents: unitPriceCents(sizeKey),
      qty,
      shirtCents: shirtPriceCents(sizeKey, qty),
      shippingCents: option.retailCents,
      totalCents: shirtPriceCents(sizeKey, qty) + option.retailCents,
      shippingMethod: option.method,
      carrier: option.carrier,
      currency: 'usd',
    });
  } catch (e) {
    sendError(res, 502, 'could not get a live shipping quote for this destination: ' + e.message);
  }
}

function validateDesignInput(body) {
  const errors = [];
  const title = cleanTitle(body.title);
  const place = cleanPlace(body.place);
  const lat = Number(body.lat);
  const lng = Number(body.lng);
  const ext = extentByKey(String(body.extent || ''));
  const color = colorByKey(String(body.colorKey || ''));
  const sizeKey = String(body.sizeKey || '');
  const qty = Math.min(Math.max(Number(body.qty) || 1, 1), 10);
  const country = String(body.country || '').toUpperCase();
  const shippingMethod = String(body.shippingMethod || 'budget');
  if (!Number.isFinite(lat) || lat < -84 || lat > 84) errors.push('latitude out of range');
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) errors.push('longitude out of range');
  if (!ext) errors.push('invalid extent');
  if (!color) errors.push('invalid colour');
  if (!validateColorSize(color?.key, sizeKey)) errors.push('invalid colour/size combination');
  if (!COUNTRIES.some((c) => c.code === country)) errors.push('unsupported destination country');
  if (!SHIPPING_METHODS.some((m) => m.key === shippingMethod)) errors.push('invalid shipping method');
  return { errors, title, place, lat, lng, ext, color, sizeKey, qty, country, shippingMethod };
}

async function handleCheckout(req, res) {
  if (!cfg.paymentsReady) return sendError(res, 503, 'payments are not configured on this deployment');
  let body;
  try { body = JSON.parse((await readBody(req)).toString('utf8') || '{}'); }
  catch { return sendError(res, 400, 'invalid JSON body'); }

  const v = validateDesignInput(body);
  if (v.errors.length) return sendError(res, 400, v.errors.join('; '));
  // terrain sanity: reject spots with no elevation data before charging anyone
  try {
    const terrain = await getTerrain(v.lat, v.lng, v.ext.km);
    if (terrain.flat) return sendError(res, 400, 'no contour lines here — try a hillier spot or a wider window');
  } catch (e) {
    return sendError(res, 400, e.message);
  }

  let option;
  try {
    option = await computeShippingOption({ country: v.country, sizeKey: v.sizeKey, colorKey: v.color.key, qty: v.qty, shippingMethod: v.shippingMethod });
  } catch (e) {
    return sendError(res, 502, 'could not get a live shipping quote: ' + e.message);
  }

  const base = baseUrlOf(req);
  const designMeta = {
    t: v.title, p: v.place, la: v.lat, lo: v.lng,
    e: v.ext.key, ck: v.color.key, sz: v.sizeKey, q: v.qty, sm: v.shippingMethod,
  };
  const { d, sig } = mintSignedParams(designMeta, cfg.printSigningSecret);
  const previewUrl = `${base}/api/preview.png?d=${d}&sig=${sig}`;

  const shirtCents = shirtPriceCents(v.sizeKey, v.qty);
  const totalCents = shirtCents + option.retailCents;

  try {
    const session = await stripe.createCheckoutSession({
      mode: 'payment',
      'line_items[0][quantity]': v.qty,
      'line_items[0][price_data][currency]': 'usd',
      'line_items[0][price_data][unit_amount]': unitPriceCents(v.sizeKey),
      'line_items[0][price_data][product_data][name]': 'Contours Tee — custom topographic map',
      'line_items[0][price_data][product_data][description]': `${v.title || v.place || 'Custom terrain'} · Bella + Canvas 3001 · printed from real elevation data`,
      'line_items[0][price_data][product_data][images][0]': previewUrl,
      'line_items[1][quantity]': 1,
      'line_items[1][price_data][currency]': 'usd',
      'line_items[1][price_data][unit_amount]': option.retailCents,
      'line_items[1][price_data][product_data][name]': `Shipping & handling (${option.method})`,
      'shipping_address_collection[allowed_countries][0]': v.country,
      'metadata[design]': JSON.stringify(designMeta),
      'metadata[store]': 'contours',
      success_url: `${base}/order/success`,
      cancel_url: `${base}/#configure`,
    });
    sendJSON(res, 200, { url: session.url, sessionId: session.id, totalCents });
  } catch (e) {
    console.error('checkout session failed:', e.message);
    sendError(res, 502, 'could not start checkout: ' + e.message);
  }
}

async function handleOrderStatus(req, res, url) {
  const sessionId = url.searchParams.get('session_id');
  if (!sessionId) return sendError(res, 400, 'session_id required');
  try {
    const { record, fulfilled, reason } = await fulfilFromSession({
      stripe, prodigi, config: cfg, sessionId, baseUrl: baseUrlOf(req),
    });
    const out = {
      paid: record.paymentStatus === 'paid',
      status: record.status,
      orderId: record.id,
      prodigiOrderId: record.prodigiOrderId || null,
      fulfilled,
      reason: reason || null,
      design: record.design,
      error: record.error || null,
    };
    if (record.prodigiOrderId) out.prodigi = await prodigiStatus(prodigi, record.prodigiOrderId);
    sendJSON(res, 200, out);
  } catch (e) {
    if (/No such checkout\.session/i.test(e.message)) return sendError(res, 404, 'unknown order');
    console.error('order status failed:', e.message);
    sendError(res, 502, e.message);
  }
}

async function handleWebhook(req, res) {
  const raw = await readBody(req, 1_000_000);
  if (!cfg.stripeWebhookSecret) {
    // Still fulfil (re-verified from Stripe), but log loudly.
    console.error('STRIPE_WEBHOOK_SECRET missing — signature NOT verified');
    return sendJSON(res, 503, { error: 'webhook not configured' });
  }
  const sig = req.headers['stripe-signature'];
  if (!verifyWebhookSignature(raw, sig, cfg.stripeWebhookSecret)) {
    return sendJSON(res, 400, { error: 'bad signature' });
  }
  let event;
  try { event = JSON.parse(raw.toString('utf8')); } catch { return sendJSON(res, 400, { error: 'bad payload' }); }
  const handled = ['checkout.session.completed', 'checkout.session.async_payment_succeeded'];
  if (!handled.includes(event.type)) return sendJSON(res, 200, { received: true, ignored: event.type });
  const sessionId = event.data?.object?.id;
  try {
    const { record, fulfilled, reason } = await fulfilFromSession({
      stripe, prodigi, config: cfg, sessionId,
      baseUrl: cfg.publicBaseUrl || baseUrlOf(req),
    });
    if (!fulfilled) {
      console.error(`webhook fulfil incomplete for ${sessionId}: ${reason}`);
      return sendJSON(res, 500, { error: reason || 'fulfilment incomplete' }); // Stripe retries
    }
    sendJSON(res, 200, { received: true, fulfilled: true, prodigiOrderId: record.prodigiOrderId });
  } catch (e) {
    console.error('webhook fulfil failed:', e.message);
    sendJSON(res, 500, { error: 'fulfilment failed; Stripe will retry' });
  }
}

// Design → terrain → SVG → PNG, from the signed, self-contained URL payload.
async function handleDesignImage(req, res, url, { print }) {
  const payload = verifySignedParams(url.searchParams.get('d'), url.searchParams.get('sig'), cfg.printSigningSecret);
  if (!payload) return sendError(res, 403, 'invalid or unsigned design link');
  const v = validateDesignInput({
    title: payload.t, place: payload.p, lat: payload.la, lng: payload.lo,
    extent: payload.e, colorKey: payload.ck, sizeKey: payload.sz, qty: payload.q || 1,
    country: 'US', shippingMethod: 'budget',
  });
  if (v.errors.length) return sendError(res, 400, v.errors.join('; '));
  try {
    const terrain = await getTerrain(v.lat, v.lng, v.ext.km);
    const design = {
      title: v.title, place: v.place, lat: v.lat, lng: v.lng,
      extentKm: v.ext.km, colorKey: v.color.key, sizeKey: v.sizeKey,
    };
    const svg = print
      ? renderPrintSVG(design, terrain)
      : renderDesignSVG(design, terrain, { width: 1200 }).svg;
    const png = await renderSvgToPng(svg, { width: print ? PRINT_W : 1200 });
    res.writeHead(200, {
      'Content-Type': 'image/png',
      'Content-Length': png.length,
      'Cache-Control': 'public, max-age=31536000, immutable',
    });
    req.method === 'HEAD' ? res.end() : res.end(png);
  } catch (e) {
    sendError(res, print ? 500 : 400, e.message);
  }
}

async function handleOrdersList(res) {
  sendJSON(res, 200, { orders: recentOrders(100) });
}

// ---------- request plumbing ----------

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;
  const t0 = Date.now();
  res.on('finish', () => {
    if (p !== '/healthz') console.log(`${new Date().toISOString()} ${req.method} ${p} → ${res.statusCode} (${Date.now() - t0}ms)`);
  });
  try {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' });
      return res.end();
    }
    if (p === '/healthz') return send(res, 200, 'ok', { 'Content-Type': 'text/plain' });
    if (p === '/' || p === '/index.html') return serveStatic(req, res, '/index.html');
    if (p === '/order/success' || p === '/order-success') return serveStatic(req, res, '/order-success.html');
    if (p === '/orders' || p === '/orders.html') return serveStatic(req, res, '/orders.html');

    if (p === '/api/geo' && req.method === 'GET') return await handleGeo(res, url);
    if (p === '/api/contours' && req.method === 'GET') return await handleContours(res, url);
    if (p === '/api/quote' && req.method === 'GET') return await handleQuote(res, url);
    if (p === '/api/checkout' && req.method === 'POST') return await handleCheckout(req, res);
    if (p === '/api/order' && req.method === 'GET') return await handleOrderStatus(req, res, url);
    if (p === '/api/stripe-webhook' && req.method === 'POST') return await handleWebhook(req, res);
    if (p === '/api/orders' && req.method === 'GET') return await handleOrdersList(res);
    if (p === '/api/print.png' && req.method === 'GET') return await handleDesignImage(req, res, url, { print: true });
    if (p === '/api/preview.png' && req.method === 'GET') return await handleDesignImage(req, res, url, { print: false });

    return serveStatic(req, res, p);
  } catch (e) {
    console.error(`${req.method} ${p} →`, e);
    if (!res.headersSent) sendError(res, 500, 'internal error');
  }
});

server.listen(cfg.port, () => {
  console.log(`Contours store → http://localhost:${cfg.port}`);
  console.log(`payments ready: ${cfg.paymentsReady} · prodigi: ${cfg.prodigiEnv} · webhook secret: ${cfg.stripeWebhookSecret ? 'configured' : 'MISSING'}`);
});
