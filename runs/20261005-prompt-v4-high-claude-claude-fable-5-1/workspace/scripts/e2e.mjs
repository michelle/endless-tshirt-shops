// End-to-end purchase with Stripe's test card against a running store.
//   node scripts/e2e.mjs https://your-store.vercel.app
// Requires: npm i -D playwright && npx playwright install chromium  (or set PW_MODULE to a playwright install)
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const base = (process.argv[2] || 'http://localhost:3456').replace(/\/$/, '');
const pwPath = process.env.PW_MODULE || 'playwright';
const { chromium } = await import(pwPath.startsWith('/') ? pathToFileURL(path.join(pwPath, 'index.mjs')).href : pwPath);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.setDefaultTimeout(45000);
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

try {
  log('open', base);
  await page.goto(base + '/#build', { waitUntil: 'networkidle' });
  await page.waitForSelector('#design svg');

  // Build a design: new place, date, caption, colour, size
  await page.fill('#place', 'Reykjavik');
  await page.waitForSelector('#suggest li[data-i]');
  await page.click('#suggest li[data-i="0"]');
  await page.fill('#date', '2015-01-10');
  await page.dispatchEvent('#date', 'change');
  await page.fill('#caption', 'E2E test order');
  await page.click('.swatch[title="Navy"]');
  await page.click('#sizes button:has-text("M")');
  await page.waitForFunction(() => document.querySelector('#facts').innerText.includes('Reykjavik') && !document.querySelector('#buy').disabled);
  log('design ready:', (await page.locator('#facts').innerText()).split('\n')[0]);

  await page.click('#buy');
  await page.waitForURL(/checkout\.stripe\.com/);
  log('on Stripe Checkout');

  // Stripe Checkout (test mode) form
  await page.fill('input[name="email"]', 'e2e-buyer@example.com');
  await page.fill('input[name="shippingName"]', 'E2E Buyer');
  await page.selectOption('select[name="shippingCountry"]', 'US');
  const manual = page.getByText('Enter address manually');
  if (await manual.count()) await manual.first().click();
  await page.fill('input[name="shippingAddressLine1"]', '123 Test Street');
  await page.fill('input[name="shippingLocality"]', 'Portland');
  await page.selectOption('select[name="shippingAdministrativeArea"]', 'OR');
  await page.fill('input[name="shippingPostalCode"]', '97201');
  await page.fill('input[name="phoneNumber"]', '5035550100');

  // Opt out of Link so no one-time code is required, then pick "Card" and fill the test card.
  const link = page.locator('input[name="enableStripePass"]');
  if (await link.count() && await link.isChecked()) await link.uncheck({ force: true });
  const cardRadio = page.locator('input[type="radio"][value="card"], [data-testid="card-accordion-item"], label:has-text("Card")').first();
  if (await cardRadio.count()) await cardRadio.click();
  await page.waitForSelector('input[name="cardNumber"]');
  await page.fill('input[name="cardNumber"]', '4242424242424242');
  await page.fill('input[name="cardExpiry"]', '12 / 34');
  await page.fill('input[name="cardCvc"]', '123');
  const billingName = page.locator('input[name="billingName"]');
  if (await billingName.count() && await billingName.isVisible()) await billingName.fill('E2E Buyer');
  const billingSame = page.locator('input[name="billingAddressSameAsShipping"]');
  if (await billingSame.count() && !(await billingSame.isChecked())) await billingSame.check({ force: true });

  await page.click('[data-testid="hosted-payment-submit-button"]');
  log('submitted payment');
  await page.waitForURL((u) => u.href.startsWith(base + '/success'), { timeout: 90000 });
  const sessionId = new URL(page.url()).searchParams.get('session_id');
  log('back on success page, session', sessionId);

  await page.waitForFunction(() => /Prodigi order ord_/.test(document.querySelector('#t-print-s')?.textContent || ''), null, { timeout: 60000 });
  const printLine = await page.locator('#t-print-s').innerText();
  const paidLine = await page.locator('#t-paid-s').innerText();
  log('PAID:', paidLine);
  log('PRINT:', printLine);
  await page.screenshot({ path: 'out/e2e-success.png', fullPage: true });

  const status = await (await fetch(`${base}/api/order-status?session_id=${sessionId}`)).json();
  console.log(JSON.stringify({ paid: status.paid, fulfillment: status.fulfillment, prodigi: status.prodigi?.stage, art_url: status.art_url }, null, 2));
  const art = await fetch(status.art_url, { method: 'HEAD' });
  log('art HEAD', art.status, art.headers.get('content-type'), art.headers.get('content-length'), 'bytes');
  if (!status.fulfillment?.prodigiOrderId) throw new Error('no Prodigi order id');
  log('E2E OK');
} catch (e) {
  await page.screenshot({ path: 'out/e2e-failure.png', fullPage: true }).catch(() => {});
  console.error('E2E FAILED:', e.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
