// End-to-end test: real browser through the live store, Stripe Checkout, webhook, Prodigi.
// Usage: node scripts/e2e.js <baseUrl>
const { chromium } = require('playwright');

const BASE = process.argv[2] || 'http://localhost:4173';
const EMAIL = 'skywatcher@example.com';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.setDefaultTimeout(60000);

  console.log('1. opening store:', BASE);
  await page.goto(BASE, { waitUntil: 'networkidle' });

  await page.fill('#date', '2022-06-14');
  await page.selectOption('#time', '23:00');
  await page.fill('#place', 'Paris');
  await page.waitForSelector('.suggestions button', { timeout: 15000 });
  await page.click('.suggestions button');
  await page.fill('#caption', 'The night we met');
  await page.click('[data-size="l"]');
  await page.click('[data-color="navy blue"]');

  await page.waitForFunction(() => {
    const img = document.getElementById('previewImg');
    return img && img.src.includes('/api/preview') && img.naturalWidth > 0;
  });
  console.log('2. preview rendered');

  await page.click('#buyBtn');
  await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30000 });
  console.log('3. on Stripe Checkout:', page.url().slice(0, 60) + '…');

  // shipping + payment form
  await page.fill('#email', EMAIL);
  await page.fill('#shippingName', 'Sky Watcher');
  await page.fill('#shippingAddressLine1', '500 5th Ave');
  // pick the address-autocomplete suggestion (auto-fills city/state/zip)
  try {
    await page.waitForSelector('text=New York, NY, USA', { timeout: 8000 });
    await page.click('text=New York, NY, USA');
  } catch {
    await page.fill('#shippingLocality', 'New York');
    const stateEl = await page.$('#shippingAdministrativeArea');
    const tag = await stateEl.evaluate((el) => el.tagName);
    if (tag === 'SELECT') await page.selectOption('#shippingAdministrativeArea', { label: 'New York' });
    else await page.fill('#shippingAdministrativeArea', 'NY');
    await page.fill('#shippingPostalCode', '10110');
  }
  await page.keyboard.press('Escape');
  // uncheck Link signup BEFORE touching the phone field (avoids OTP modal)
  const linkBox = page.locator('#enableStripePass');
  if (await linkBox.count() && await linkBox.isChecked()) await linkBox.click();
  await page.locator('input[name="phoneNumber"]:visible').first().fill('2125554242');
  // card fields mount in the main frame once the Card accordion opens
  await page.evaluate(() => {
    const b = document.querySelector('[data-testid="card-accordion-item-button"]');
    if (b) b.scrollIntoView();
    if (b) b.click();
  });
  await page.waitForSelector('#cardNumber', { timeout: 30000 });
  await page.fill('#cardNumber', '4242424242424242');
  await page.fill('#cardExpiry', '1234');
  await page.fill('#cardCvc', '424');
  await page.keyboard.press('Escape');
  const modal = page.locator('.VerificationModal-modalOverlay');
  if (await modal.count()) {
    await page.keyboard.press('Escape');
    const close = page.locator('.VerificationModal-modalOverlay button[aria-label*="lose" i], .Modal-Portal button[aria-label*="lose" i]');
    if (await close.count()) await close.first().click();
    await page.waitForTimeout(1000);
  }
  try { if (await payFrame.locator('input[name="postalCode"]').count()) await payFrame.fill('input[name="postalCode"]', '10110'); } catch {}

  await page.click('[data-testid="hosted-payment-submit-button"], button[type="submit"]');
  console.log('4. paid with test card, waiting for redirect…');

  try {
    await page.waitForURL(/success(\.html)?\?session_id=/, { timeout: 90000 });
  } catch (e) {
    await page.screenshot({ path: '/tmp/e2e-after-pay.png', fullPage: true });
    const errText = await page.evaluate(() => document.body.innerText.slice(0, 1500));
    console.log('PAGE TEXT AFTER PAY:', errText);
    throw e;
  }
  const sessionId = new URL(page.url()).searchParams.get('session_id');
  console.log('5. back on success page, session:', sessionId);

  await page.waitForSelector('#proof:visible', { timeout: 90000 });
  const status = await page.textContent('#status');
  console.log('6. fulfillment status:', status.trim());

  const r = await page.request.get(`${BASE}/api/order-status?session_id=${sessionId}`);
  const data = await r.json();
  console.log('7. order record:', JSON.stringify(data.fulfillment));

  await page.screenshot({ path: '/tmp/e2e-success.png' });
  await browser.close();

  if (data.fulfillment.status !== 'sent_to_print') {
    console.error('E2E FAIL: not sent to print');
    process.exit(1);
  }
  console.log('E2E PASS — prodigi order:', data.fulfillment.prodigiOrderId);
})().catch(async (e) => { console.error('E2E ERROR:', e.message); process.exit(1); });
