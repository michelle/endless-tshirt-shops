#!/usr/bin/env node
// End-to-end purchase test for Nightshift.
//
//   NODE_PATH=<path-to-playwright> tools/e2e.mjs [base-url]
//
// Drives a real browser through the whole pipeline: design a shirt (place
// search included), render + upload the print, create a Stripe Checkout
// Session, pay with the standard test card, land on the order page, and
// verify the order reached Prodigi. Needs playwright:
// `npm i -D playwright` in a scratch checkout (not here — Vercel deploys
// install dependencies, and playwright must not ship to production).
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  console.error('playwright is not available: run `npm i -D playwright` and pass its node_modules via NODE_PATH.');
  process.exit(2);
}

const BASE = process.argv[2] || process.env.BASE_URL;
if (!BASE) {
  console.error('usage: tools/e2e.mjs <base-url>');
  process.exit(2);
}

const TEST_ADDRESS = {
  name: 'Robin Vega',
  email: `nightshift.e2e+${Date.now()}@example.com`,
  line1: '14 Harbor Lane',
  city: 'Cape May',
  state: 'NJ',
  zip: '08204',
  country: 'US',
};

const log = (step, detail = '') => console.log(`✓ ${step}${detail ? ` — ${detail}` : ''}`);
const fail = (step, detail) => {
  console.error(`✗ ${step}: ${detail}`);
  process.exit(1);
};

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 1400 } });
const requests = [];
page.on('response', (response) => {
  if (response.url().includes('/api/')) requests.push([response.status(), response.url(), response.request().method()]);
});

try {
  // ---- design ----------------------------------------------------------
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.fill('#date', '1991-06-14');
  await page.fill('#time', '23:42');
  await page.fill('#placeSearch', 'Cape May');
  await page.waitForSelector('#placeResults li:not(.none)', { timeout: 15000 });
  await page.click('#placeResults li');
  await page.fill('#title', 'The night we met');
  await page.click('.swatch.theme[data-id="tide"]');
  await page.click('.swatch.color[data-id="black"]');
  await page.click('.size[data-id="l"]');
  await page.selectOption('#quantity', '2');
  await page.waitForFunction(() => document.querySelector('#skyStats').textContent.includes('stars'));
  log('designer renders the sky', await page.textContent('#skyStats'));

  // ---- shipping ----------------------------------------------------------
  await page.click('#toShipping');
  await page.fill('#shipName', TEST_ADDRESS.name);
  await page.fill('#shipEmail', TEST_ADDRESS.email);
  await page.fill('#shipLine1', TEST_ADDRESS.line1);
  await page.fill('#shipCity', TEST_ADDRESS.city);
  await page.fill('#shipState', TEST_ADDRESS.state);
  await page.fill('#shipZip', TEST_ADDRESS.zip);
  await page.selectOption('#shipCountry', TEST_ADDRESS.country);

  // ---- pay ---------------------------------------------------------------
  await page.click('#payButton');
  // The print render + upload + session creation can take a few seconds.
  await page.waitForURL(/stripe\.com|checkout\.stripe\.com/, { timeout: 60000 });
  log('reached Stripe Checkout', page.url().slice(0, 60) + '…');

  const emailField = page.locator('#email');
  if (await emailField.count()) {
    const value = await emailField.inputValue();
    if (!value) await emailField.fill(TEST_ADDRESS.email);
  }
  // New Stripe Checkout: select the card payment method, then fill the
  // same-origin card form.
  const cardOption = page.locator('#payment-method-label-card');
  await page.waitForSelector('#payment-method-label-card', { timeout: 30000 });
  await cardOption.click({ force: true });
  await page.waitForSelector('input[name="cardNumber"]', { state: 'attached', timeout: 20000 });
  await page.fill('input[name="cardNumber"]', '4242424242424242');
  await page.fill('input[name="cardExpiry"]', '12/34');
  await page.fill('input[name="cardCvc"]', '123');
  const nameField = page.locator('input[name="billingName"]');
  if (await nameField.count()) await nameField.fill(TEST_ADDRESS.name);
  const zipField = page.locator('input[name="billingPostalCode"]');
  if (await zipField.count()) await zipField.fill(TEST_ADDRESS.zip);
  const save = page.locator('input[name="enableStripePass"]');
  if (await save.count()) {
    try { await save.uncheck({ timeout: 3000 }); } catch { /* already off or hidden */ }
  }
  const pay = page.locator('[data-testid="hosted-payment-submit-button"], button[type="submit"]').first();
  await pay.click({ timeout: 15000 });

  // ---- land on the order page -------------------------------------------
  await page.waitForURL(/\/order\.html\?session_id=/, { timeout: 60000 });
  await page.waitForSelector('#prodigiOrder:not(:empty)', { timeout: 30000 });
  const prodigiOrder = await page.textContent('#prodigiOrder');
  log('order fulfilled by Prodigi', prodigiOrder);
  await page.waitForSelector('#keepsakeCanvas');
  log('order page shows the keepsake render');

  for (const [status, url, method] of requests) {
    if (status >= 400) fail('no failed API calls expected', `${method} ${url} → ${status}`);
  }
  console.log(`\nAPI calls made by the flow:`);
  for (const [status, url, method] of requests) console.log(`  ${method} ${status} ${url.replace(BASE, '')}`);

  // Idempotency: the same session can be re-checked without a second order.
  const sessionId = new URL(page.url()).searchParams.get('session_id');
  const again = await fetch(`${BASE}/api/order-status?session_id=${sessionId}`).then((r) => r.json());
  if (again.orderId !== prodigiOrder) fail('re-check is idempotent', JSON.stringify(again));
  log('re-check is idempotent', again.orderId);
  if (!again.repeat) console.log('  (first-fulfillment response was not marked repeat — fine, timing)');

  console.log(`\nE2E PASS — ${BASE} order ${prodigiOrder}`);
} catch (error) {
  fail('e2e flow', error.message);
} finally {
  await browser.close();
}
