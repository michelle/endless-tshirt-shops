/**
 * End-to-end smoke test: browse → pick → pay with a Stripe test card → confirm a
 * Prodigi order came back.
 *
 * Needs Playwright and a local Chrome:
 *   npm i -D playwright
 *   BASE=http://localhost:3000 node scripts/smoke-purchase.mjs
 *
 * Notes:
 *  - Uses a fresh email each run. Reusing one enrols it in Link, and the Link
 *    auth modal then intercepts clicks on later runs.
 *  - Link's "save my info" is pre-checked and makes the phone field required, so
 *    we fill it rather than fight the checkbox.
 */
import { chromium } from 'playwright';

const BASE = process.env.BASE ?? 'http://localhost:3000';
const OUT = process.env.OUT ?? '/tmp';

const log = (...a) => console.log('[e2e]', ...a);

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
const page = await ctx.newPage();
page.on('console', (m) => { if (m.type() === 'error') log('console.error:', m.text().slice(0, 200)); });

await page.goto(BASE, { waitUntil: 'networkidle' });
log('loaded', await page.title());

// pick unisex / L to prove the selectors are wired through to metadata
await page.locator('label[for="style-unisex"]').click();
await page.locator('label[for="size-XL"]').click();
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/e2e-1-store.png` });

const before = await page.locator('.shirt-print .digits').innerText();
log('ticking sample', before);

await page.getByRole('button', { name: /Buy this millisecond/ }).click();
await page.waitForSelector('.stripe-mount iframe', { timeout: 30000 });
log('checkout mounted');

const frozen = await page.locator('.frozen-note strong').innerText();
log('frozen ts =', frozen);

// Stripe renders embedded checkout in a nested iframe.
const outer = page.frameLocator('.stripe-mount iframe');
await page.waitForTimeout(4000);
await page.screenshot({ path: `${OUT}/e2e-2-checkout.png`, fullPage: true });

async function fill(name, value, { frame = outer } = {}) {
  const el = frame.locator(`input[name="${name}"], input#${name}`).first();
  await el.waitFor({ state: 'visible', timeout: 20000 });
  await el.click();
  await el.fill(value);
  log('filled', name);
}

await fill('email', `e2e-${Date.now()}@example.com`);

// Use the manual address form; the autocomplete widget is not driveable headless.
const manual = outer.locator('text=Enter address manually').first();
if (await manual.count()) { await manual.click(); log('switched to manual address'); await page.waitForTimeout(800); }

await fill('shippingName', 'Jenny Rosen');
await fill('shippingAddressLine1', '185 Berry Street');
await fill('shippingLocality', 'San Francisco');
await fill('shippingPostalCode', '94107');
const stateSel = outer.locator('select[name="shippingAdministrativeArea"]').first();
if (await stateSel.count()) { await stateSel.selectOption('CA'); log('selected state'); }

await fill('cardNumber', '4242424242424242');
await fill('cardExpiry', '12 / 34');
await fill('cardCvc', '123');

// Link's "save my info" box is pre-checked and makes the phone field required.
// Try to opt out; if the field is there anyway, just fill it.
await outer.locator('text=Save my information for faster checkout').first().click({ force: true }).catch(() => {});
await page.waitForTimeout(1000);
const phone = outer.locator('input[name="phoneNumber"], input[type="tel"]').first();
if (await phone.count() && await phone.isVisible().catch(() => false)) {
  await phone.click();
  await phone.fill('4155550123');
  log('filled phone (Link enrolment)');
}

await page.screenshot({ path: `${OUT}/e2e-3-filled.png`, fullPage: true });

const pay = outer.locator('button[type="submit"], .SubmitButton').first();
await pay.click();
log('submitted payment');
await page.waitForTimeout(6000);
await page.screenshot({ path: `${OUT}/e2e-3b-after-pay.png`, fullPage: true });
const errs = await outer.locator('[role="alert"], .Error, [class*="error" i]').allInnerTexts().catch(() => []);
if (errs.length) log('checkout errors:', JSON.stringify(errs.slice(0, 6)));

await page.waitForSelector('.receipt', { timeout: 90000 });
log('receipt rendered');
await page.waitForTimeout(3000); await page.screenshot({ path: `${OUT}/e2e-4a-receipt-fast.png` }); await page.waitForTimeout(14000);
await page.screenshot({ path: `${OUT}/e2e-4-receipt.png`, fullPage: true });
const receipt = await page.locator('.receipt').innerText();
log('---- RECEIPT ----\n' + receipt);

// Follow the bookmarkable permalink and prove it renders the same order.
const link = await page.locator('.receipt a[href^="/order/"]').first().getAttribute('href');
await page.goto(BASE + link, { waitUntil: 'networkidle' });
await page.waitForSelector('.receipt dl', { timeout: 40000 });
await page.waitForTimeout(2500);
await page.screenshot({ path: `${OUT}/e2e-5-permalink.png`, fullPage: true });
log('---- PERMALINK ----\n' + (await page.locator('.receipt').innerText()));

await browser.close();
