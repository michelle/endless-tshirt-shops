// End-to-end: design -> Stripe Checkout (test card) -> order page -> Prodigi.
import puppeteer from 'puppeteer-core';
const base = process.argv[2];
const garment = process.argv[3] || 'black';
const abandon = process.argv[4] === 'abandon'; // simulate buyer closing the tab after paying
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 1000 });
if (abandon) {
  await page.setRequestInterception(true);
  page.on('request', (r) => (r.url().includes('/api/order') ? r.abort() : r.continue()));
}
const shot = (n) => page.screenshot({ path: `out/e2e-${n}.png` });
try {
  await page.goto(`${base}/#design`, { waitUntil: 'networkidle0' });
  await page.evaluate((g) => localStorage.clear(), garment);
  await page.reload({ waitUntil: 'networkidle0' });
  await page.click('[data-preset="love"]');
  await page.click(`[data-g="${garment}"]`);
  await page.click('[data-size="L"] [data-d="1"]');
  await Promise.all([page.waitForNavigation({ timeout: 30000 }), page.click('#checkout')]);
  console.log('checkout url:', page.url().slice(0, 60));
  await page.waitForSelector('#email', { timeout: 30000 });
  await shot('1-checkout');
  const type = async (sel, v) => {
    await page.waitForSelector(sel, { visible: true, timeout: 15000 });
    for (let i = 0; i < 3; i++) {
      await page.click(sel, { clickCount: 3 });
      await page.keyboard.press('Backspace');
      await page.type(sel, v, { delay: 25 });
      const got = (await page.$eval(sel, (e) => e.value)).replace(/\D/g, '');
      if (!/^\d+$/.test(v.replace(/[\s/]/g, '')) || got.length >= v.replace(/\D/g, '').length) return;
    }
  };
  await type('#email', 'e2e-test@example.com');
  await page.select('#shippingCountry', 'US').catch(() => {});
  await type('#shippingName', 'Test Customer');
  await type('#shippingAddressLine1', '350 5th Ave');
  await page.keyboard.press('Escape');
  await type('#shippingLocality', 'New York');
  await type('#shippingPostalCode', '10118');
  await page.select('#shippingAdministrativeArea', 'NY').catch(() => {});
  if (await page.$('#phoneNumber')) await type('#phoneNumber', '2125550123');
  if (!(await page.$('#cardNumber:not([disabled])')) || !(await page.$eval('#cardNumber', (e) => e.offsetParent !== null).catch(() => false))) {
    await page.click('#payment-method-accordion-item-title-card, [data-testid="card-accordion-item-button"], input[value="card"]').catch(() => {});
  }
  await type('#cardNumber', '4242424242424242');
  await type('#cardExpiry', '1234');
  await type('#cardCvc', '123');
  if (await page.$('#billingName')) await type('#billingName', 'Test Customer').catch(() => {});
  // Re-assert name in case address autocomplete cleared it.
  if (!(await page.$eval('#shippingName', (e) => e.value))) await type('#shippingName', 'Test Customer');
  await shot('2-filled');
  await Promise.all([
    page.waitForNavigation({ timeout: 90000 }),
    page.click('[data-testid="hosted-payment-submit-button"], .SubmitButton'),
  ]);
  console.log('returned to:', page.url().slice(0, 80));
  if (abandon) {
    console.log('abandoned session: ' + new URL(page.url()).searchParams.get('session_id'));
    process.exit(0);
  }
  await page.waitForFunction(() => document.querySelector('#timeline li:nth-child(2)')?.classList.contains('done'), { timeout: 60000 });
  await new Promise((r) => setTimeout(r, 1500));
  await shot('3-order');
  console.log('order page:', await page.$eval('#timeline', (e) => e.innerText.replace(/\n+/g, ' | ')));
} catch (e) {
  console.error('FAILED:', e.message);
  await shot('fail');
} finally {
  await browser.close();
}
