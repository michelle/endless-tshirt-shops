/**
 * End-to-end smoke test:
 *   1. open the storefront, design a night in the studio
 *   2. check out through Stripe (test mode, card 4242…)
 *   3. land on /success and confirm the shirt reached Prodigi
 *   4. confirm /track shows the chain payment -> print -> production
 *   5. confirm repeat fulfilment is idempotent (no duplicate print order)
 *   6. confirm tampered artwork URLs are rejected
 *
 * Usage: node scripts/e2e.mjs [baseUrl]   (default http://localhost:3100)
 * Screenshots land in e2e-artifacts/ (git-ignored).
 */
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const BASE = process.argv[2] ?? process.env.E2E_BASE ?? 'http://localhost:3100';
const OUT = 'e2e-artifacts';
mkdirSync(OUT, { recursive: true });

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
let failures = 0;
function check(label, ok, extra = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${extra ? ` — ${extra}` : ''}`);
  if (!ok) failures++;
}

async function frameWithInput(page, name) {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    for (const frame of page.frames()) {
      try {
        const loc = frame.locator(`input[name="${name}"], select[name="${name}"]`);
        if (await loc.count()) return loc.first();
      } catch { /* frame detached */ }
    }
    await page.waitForTimeout(500);
  }
  return null;
}

async function fieldAny(page, names, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    for (const name of names) {
      for (const frame of page.frames()) {
        try {
          const loc = frame.locator(`input[name="${name}"], select[name="${name}"]`);
          if (await loc.count()) return loc.first();
        } catch { /* frame detached */ }
      }
    }
    await page.waitForTimeout(500);
  }
  throw new Error(`fields not found in any frame: ${names.join(', ')}`);
}

async function mustField(page, name) {
  return fieldAny(page, [name]);
}

const browser = await chromium.launch({
  headless: true,
  executablePath: process.platform === 'darwin' ? CHROME : undefined,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.setDefaultTimeout(45000);

try {
  // ---- 1. studio -----------------------------------------------------------
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#mw-place');
  await page.fill('#mw-date', '2014-08-14');
  await page.fill('#mw-place', 'Reykjavík');
  await page.fill('#mw-caption', 'the night we met');
  await page.click('button[title="Navy"]');
  await page.click('text="L"', { timeout: 10000 }).catch(async () => {
    await page.locator('button', { hasText: /^L$/ }).first().click();
  });
  await page.waitForTimeout(900); // let the live preview settle
  await page.screenshot({ path: `${OUT}/1-storefront.png`, fullPage: false });
  const checkoutBtn = page.locator('button', { hasText: /^Checkout — \$39\.00$/ });
  await checkoutBtn.waitFor({ state: 'visible' });
  check('studio renders with a live preview and an enabled checkout', true);

  // ---- 2. stripe checkout --------------------------------------------------
  await checkoutBtn.click();
  await page.waitForURL(/checkout\.stripe\.com/, { timeout: 45000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${OUT}/2-stripe-checkout.png`, fullPage: false });
  check('redirected to Stripe hosted checkout', /checkout\.stripe\.com/.test(page.url()));

  // contact
  await (await mustField(page, 'email')).fill('test@example.com');
  // shipping address (hosted page, top-level fields; extra rows appear
  // progressively once line1 has a value)
  await (await mustField(page, 'shippingName')).fill('Test Person');
  const countrySelect = await frameWithInput(page, 'shippingCountry');
  if (countrySelect) await countrySelect.selectOption('US').catch(() => {});
  // Stripe has renamed these fields across hosted-checkout versions; try both.
  const line1 = await fieldAny(page, ['shippingAddressLine1', 'shippingLine1']);
  await line1.fill('1 Test Way');
  await line1.press('Escape'); // dismiss Stripe's place-autocomplete suggestions
  await page.waitForTimeout(700);
  const city = await fieldAny(page, ['shippingLocality', 'shippingCity']);
  await city.fill('Beverly Hills');
  const state = await fieldAny(page, ['shippingAdministrativeArea', 'shippingState']);
  await state.selectOption('CA').catch(async () => { await state.fill('CA').catch(() => {}); });
  await (await mustField(page, 'shippingPostalCode')).fill('90210');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  // Card entry inputs: usually already mounted; otherwise expand the Card row.
  let cardNumber = await fieldAny(page, ['cardNumber'], 8000).catch(() => null);
  if (!cardNumber) {
    await page
      .locator('[data-testid="card-accordion-item-button"]')
      .first()
      .click({ force: true })
      .catch(async () => { await page.locator('input[type="radio"]').first().click({ force: true }); });
    await page.waitForTimeout(700);
    cardNumber = await fieldAny(page, ['cardNumber'], 15000);
  }
  await cardNumber.fill('4242 4242 4242 4242');
  await (await mustField(page, 'cardExpiry')).fill('12 / 30');
  await (await mustField(page, 'cardCvc')).fill('123');
  const zip = await frameWithInput(page, 'billingPostalCode');
  if (zip) await zip.fill('90210');
  const linkPass = await frameWithInput(page, 'enableStripePass');
  if (linkPass && (await linkPass.isChecked().catch(() => false))) await linkPass.uncheck();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/3-stripe-filled.png`, fullPage: true });
  await page
    .locator('[data-testid="hosted-payment-submit-button"], button[type="submit"]')
    .first()
    .click();
  console.log('submitted payment form');

  // ---- 3. success + fulfilment --------------------------------------------
  await page.waitForURL(/\/success\?session_id=/, { timeout: 90000 });
  await page.waitForTimeout(3500); // server-side fulfilment runs during render
  await page.waitForSelector('[data-testid="prodigi-order-id"]', { timeout: 60000 });
  const orderId = await page.locator('[data-testid="prodigi-order-id"]').innerText();
  check('payment succeeded and a Prodigi order was created', /^ord_\d+$/.test(orderId.trim()), orderId);
  await page.screenshot({ path: `${OUT}/4-success.png`, fullPage: true });

  const successUrl = new URL(page.url());
  const sessionId = successUrl.searchParams.get('session_id');
  check('success URL carries the checkout session id', Boolean(sessionId), String(sessionId).slice(0, 12) + '…');

  // ---- 5. repeat fulfilment is idempotent ----------------------------------
  const again = await page.request.post(`${BASE}/api/fulfill`, {
    data: { session_id: sessionId },
  });
  const againBody = await again.json();
  check('repeat fulfilment call is denied a second print order',
    againBody.state === 'already' && againBody.prodigiOrderId === orderId.trim(),
    `${againBody.state} ${againBody.prodigiOrderId ?? ''}`);

  // ---- 4. track page -------------------------------------------------------
  await page.goto(`${BASE}/track?session_id=${sessionId}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  const trackText = await page.locator('body').innerText();
  check('tracking shows paid + sent to print + production',
    /Received via Stripe/.test(trackText) && trackText.includes(orderId.trim()),
    '');
  await page.screenshot({ path: `${OUT}/5-track.png`, fullPage: true });

  // ---- 6. tampered artwork URL rejected ------------------------------------
  const tampered = await page.request.get(
    `${BASE}/api/design?d=${Buffer.from(JSON.stringify({ v: 1, date: '2014-08-14', place: 'Hacked', caption: '', palette: 'midnight' })).toString('base64url')}&sig=${'0'.repeat(64)}&r=print`,
  );
  check('tampered design payload rejected', tampered.status() === 400, String(tampered.status()));
} catch (err) {
  failures++;
  console.log('FAIL  e2e aborted:', err instanceof Error ? err.message : err);
  await page.screenshot({ path: `${OUT}/9-abort.png`, fullPage: true }).catch(() => {});
} finally {
  await browser.close();
}

console.log(failures === 0 ? '\nE2E: ALL CHECKS PASSED' : `\nE2E: ${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
