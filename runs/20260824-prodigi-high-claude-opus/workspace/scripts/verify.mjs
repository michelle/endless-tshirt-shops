#!/usr/bin/env node
/**
 * End-to-end check of the whole shop against a running deployment.
 *
 *   node scripts/verify.mjs                        # against http://localhost:3000
 *   node scripts/verify.mjs https://your.app       # against a deployment
 *
 * Needs STRIPE_SECRET_KEY (and, to inspect the print order, PRODIGI_API_KEY) in
 * the environment or in .env.local. It walks the real path a customer takes:
 * create the PaymentIntent through our own API, confirm it with a Stripe test
 * card, then let the order endpoint drive Prodigi fulfillment and verify a print
 * order actually exists.
 *
 * Everything it creates is test/sandbox data.
 */

import { readFileSync } from 'node:fs';
import { createHmac } from 'node:crypto';

const BASE = (process.argv[2] ?? 'http://localhost:3000').replace(/\/$/, '');

/* --- env ----------------------------------------------------------------- */

function loadDotEnv() {
  try {
    for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
      const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
    }
  } catch {
    /* no .env.local; rely on the environment */
  }
}
loadDotEnv();

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
const PRODIGI_KEY = process.env.PRODIGI_API_KEY;

/* --- tiny test harness --------------------------------------------------- */

let failures = 0;
const results = [];

function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  if (!ok) failures += 1;
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${name}${detail ? ` — ${detail}` : ''}`);
}

function section(title) {
  console.log(`\n${title}`);
}

async function stripeApi(path, body, method = 'POST') {
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method,
    headers: {
      Authorization: `Basic ${Buffer.from(`${STRIPE_KEY}:`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body ? new URLSearchParams(body).toString() : undefined,
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(`Stripe ${path}: ${json.error?.message ?? response.status}`);
  }
  return json;
}

/* --- 1. health ----------------------------------------------------------- */

section(`1. Deployment health (${BASE})`);

const health = await fetch(`${BASE}/api/health?deep=1`).then((r) => r.json());
check('config: stripe key present', health.config?.stripe?.configured === true);
check('config: stripe in test mode', health.config?.stripe?.mode === 'test', `mode=${health.config?.stripe?.mode}`);
check('config: prodigi key present', health.config?.prodigi?.configured === true);
check('stripe api reachable', health.checks?.stripe?.ok === true, JSON.stringify(health.checks?.stripe?.error ?? ''));
check('prodigi api reachable', health.checks?.prodigi?.ok === true, JSON.stringify(health.checks?.prodigi?.error ?? ''));

// Advisory: Prodigi's /quotes endpoint has its own downtime, and we can still
// take and print orders while it is out. Report it, don't fail the run for it.
const economics = health.checks?.economics;
if (economics?.unavailable) {
  console.log(`  skip  unit economics (prodigi /quotes unavailable: ${String(economics.error).slice(0, 70)})`);
} else {
  check(
    'unit economics: cost < price',
    economics?.profitable === true,
    `cost ${economics?.unitCost?.amount} vs price ${economics?.retailPrice}, margin ${economics?.marginPerShirt}`,
  );
}
check(
  'artwork endpoint publicly reachable',
  health.checks?.artwork?.publiclyReachable === true,
  `status=${health.checks?.artwork?.status} type=${health.checks?.artwork?.contentType}`,
);

/* --- 2. storefront ------------------------------------------------------- */

section('2. Storefront');

const home = await fetch(BASE);
const html = await home.text();
check('GET / is 200', home.status === 200);
check('page has the tagline', html.includes('we sell a t-shirt with the current datetime'));
check('page renders both cuts', html.includes('Fitted') && html.includes('Unisex'));
check('page renders all four sizes', ['S', 'M', 'L', 'XL'].every((s) => html.includes(`size-${s}`)));
check('price is $22.50 marked down from $30.00', html.includes('$22.50') && html.includes('$30.00'));
check(
  'publishable key is configured for the browser',
  health.config?.stripe?.publishableKeyConfigured === true,
);

/* --- 3. artwork --------------------------------------------------------- */

section('3. Print artwork');

const stamp = Date.now();
const art = await fetch(`${BASE}/api/artwork?t=${stamp}&format=print`);
const artBytes = Buffer.from(await art.arrayBuffer());
check('artwork responds 200', art.status === 200);
check('artwork is a PNG', artBytes.subarray(1, 4).toString() === 'PNG');
const width = artBytes.readUInt32BE(16);
const height = artBytes.readUInt32BE(20);
check('artwork is print resolution', width === 2340 && height === 2895, `${width}x${height}`);
check('artwork has an alpha channel', artBytes[25] === 6, `colorType=${artBytes[25]}`);
check('artwork is immutably cached', (art.headers.get('cache-control') ?? '').includes('immutable'));

const badArt = await fetch(`${BASE}/api/artwork?t=nonsense`);
check('artwork rejects bad timestamps', badArt.status === 400);

/* --- 4. checkout guards ------------------------------------------------- */

section('4. Checkout validation');

const badStyle = await fetch(`${BASE}/api/payment-intent`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ style: 'sequinned', size: 'M', timestampMs: Date.now() }),
});
check('rejects unknown style', badStyle.status === 400);

const badSize = await fetch(`${BASE}/api/payment-intent`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ style: 'unisex', size: 'XXXL', timestampMs: Date.now() }),
});
check('rejects unknown size', badSize.status === 400);

/* --- 5. buy a shirt ----------------------------------------------------- */

section('5. Buy a shirt (Stripe test card 4242…)');

if (!STRIPE_KEY) {
  check('STRIPE_SECRET_KEY available', false, 'skipping purchase flow');
} else {
  const boughtAt = Date.now();
  const created = await fetch(`${BASE}/api/payment-intent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      style: 'fitted',
      size: 'L',
      timestampMs: boughtAt,
      email: 'verify@datetime.store',
    }),
  }).then((r) => r.json());

  check('payment intent created', Boolean(created.clientSecret), created.error ?? '');
  check('server honoured the client timestamp', created.timestampMs === boughtAt, `${created.timestampMs}`);
  check('server set the price, not the client', created.amount === 2250, `${created.amount}`);

  const intentId = created.paymentIntentId;

  // Confirm exactly as Stripe.js would, including the shipping address the
  // Address Element collects.
  const confirmed = await stripeApi(`payment_intents/${intentId}/confirm`, {
    payment_method: 'pm_card_visa',
    return_url: `${BASE}/order`,
    'shipping[name]': 'Jenny Rosen',
    'shipping[address][line1]': '185 Berry St',
    'shipping[address][line2]': 'Suite 550',
    'shipping[address][city]': 'San Francisco',
    'shipping[address][state]': 'CA',
    'shipping[address][postal_code]': '94107',
    'shipping[address][country]': 'US',
  });
  check('payment succeeded', confirmed.status === 'succeeded', confirmed.status);

  // The order page's lookup, which also drives fulfillment.
  const order = await fetch(
    `${BASE}/api/order?payment_intent=${intentId}` +
      `&payment_intent_client_secret=${encodeURIComponent(created.clientSecret)}`,
  ).then((r) => r.json());

  check('order lookup authorised', order.paid === true, JSON.stringify(order.error ?? ''));
  check('shirt timestamp preserved', order.shirt?.timestampMs === boughtAt, `${order.shirt?.timestampMs}`);
  check('shirt style/size preserved', order.shirt?.styleLabel === 'Fitted' && order.shirt?.size === 'L');
  check(
    'prodigi order created',
    order.fulfillment?.status === 'fulfilled',
    order.fulfillment?.error ?? order.fulfillment?.status,
  );

  const prodigiOrderId = order.fulfillment?.prodigiOrderId;
  console.log(`       payment intent : ${intentId}`);
  console.log(`       prodigi order  : ${prodigiOrderId}`);
  console.log(`       shirt stamp    : ${boughtAt}`);

  // Order lookup must be unguessable.
  const forged = await fetch(
    `${BASE}/api/order?payment_intent=${intentId}&payment_intent_client_secret=wrong`,
  );
  check('order lookup rejects a wrong client secret', forged.status === 404, `status=${forged.status}`);

  /* --- 6. verify with Prodigi directly --------------------------------- */

  section('6. Prodigi print order');

  if (!PRODIGI_KEY || !prodigiOrderId || order.fulfillment?.dryRun) {
    check('prodigi inspection', false, 'skipped (no key, no order, or dry-run mode)');
  } else {
    const host =
      health.config?.prodigi?.environment === 'live'
        ? 'api.prodigi.com'
        : 'api.sandbox.prodigi.com';
    const remote = await fetch(`https://${host}/v4.0/Orders/${prodigiOrderId}`, {
      headers: { 'X-API-Key': PRODIGI_KEY },
    }).then((r) => r.json());

    const item = remote.order?.items?.[0];
    check('prodigi order exists', remote.outcome === 'Ok', remote.outcome);
    check('prodigi sku is the fitted tee', item?.sku === 'GLOBAL-TEE-BC-6004', item?.sku);
    check('prodigi size attribute is L', item?.attributes?.size === 'l', JSON.stringify(item?.attributes));
    check('prodigi color attribute is black', item?.attributes?.color === 'black');
    check(
      'prodigi asset points at our artwork',
      item?.assets?.[0]?.url?.includes(`t=${boughtAt}`),
      item?.assets?.[0]?.url,
    );
    check('prodigi recipient carried over', remote.order?.recipient?.name === 'Jenny Rosen');
    check(
      'prodigi shipped to the right address',
      remote.order?.recipient?.address?.postalOrZipCode === '94107',
    );
    console.log(`       prodigi stage  : ${remote.order?.status?.stage}`);
    console.log(`       prodigi issues : ${JSON.stringify(remote.order?.status?.issues ?? [])}`);

    /* --- 7. idempotency ------------------------------------------------- */

    section('7. Idempotency');
    const again = await fetch(
      `${BASE}/api/order?payment_intent=${intentId}` +
        `&payment_intent_client_secret=${encodeURIComponent(created.clientSecret)}`,
    ).then((r) => r.json());
    check(
      'a second fulfillment attempt reuses the same print order',
      again.fulfillment?.prodigiOrderId === prodigiOrderId,
      `${again.fulfillment?.prodigiOrderId}`,
    );
  }

  /* --- 8. webhook ------------------------------------------------------- */

  section('8. Webhook endpoint');

  const unsigned = await fetch(`${BASE}/api/stripe-webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  check(
    'webhook rejects unsigned payloads',
    unsigned.status === 400 || unsigned.status === 503,
    `status=${unsigned.status}`,
  );

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (secret) {
    const payload = JSON.stringify({
      id: 'evt_verify',
      type: 'payment_intent.succeeded',
      data: { object: confirmed },
    });
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex');
    const signed = await fetch(`${BASE}/api/stripe-webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': `t=${timestamp},v1=${signature}`,
      },
      body: payload,
    });
    check('webhook accepts a correctly signed event', signed.status === 200, `status=${signed.status}`);
  } else {
    console.log('  skip  signed webhook test (STRIPE_WEBHOOK_SECRET not set locally)');
  }
}

/* --- summary ------------------------------------------------------------- */

const passed = results.filter((r) => r.ok).length;
console.log(`\n${passed}/${results.length} checks passed.`);
if (failures) {
  console.log('\nFailures:');
  for (const r of results.filter((x) => !x.ok)) console.log(`  - ${r.name} ${r.detail}`);
}
process.exit(failures ? 1 : 0);
