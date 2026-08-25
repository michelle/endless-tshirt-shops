import { chromium } from 'playwright';

const BASE = process.env.BASE || 'https://benchmark-20260825-harness6-high-cl-orcin.vercel.app';
const SHOTS = '/tmp/dtshots';
import { mkdirSync } from 'fs';
mkdirSync(SHOTS, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.setDefaultTimeout(30000);

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

try {
  log('open', BASE);
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.screenshot({ path: `${SHOTS}/01-home.png` });

  // pick unisex + L
  await page.click('label[for="style-unisex"]');
  await page.click('label[for="size-L"]');
  await page.screenshot({ path: `${SHOTS}/02-options.png` });

  log('click buy');
  await page.click('.buy-button');

  // wait for embedded checkout iframe
  const iframeEl = await page.waitForSelector('.checkout-mount iframe', { timeout: 45000 });
  log('iframe mounted');
  await page.waitForTimeout(6000);
  await page.screenshot({ path: `${SHOTS}/03-checkout.png`, fullPage: true });

  const frame = page.frameLocator('.checkout-mount iframe');

  const fill = async (sel, value, name) => {
    try {
      const loc = frame.locator(sel).first();
      await loc.waitFor({ state: 'visible', timeout: 8000 });
      await loc.fill(value);
      log('filled', name || sel);
      return true;
    } catch (e) {
      log('SKIP', name || sel, e.message.split('\n')[0]);
      return false;
    }
  };

  // close any Link popup that appears at any point
  page.context().on('page', async (popup) => {
    log('closing popup', popup.url().slice(0, 60));
    await popup.close().catch(() => {});
  });

  // non-Link-enrolled email avoids the Link login popup
  const email = `dt-tester-${Math.floor(Math.random() * 1e9)}@example.com`;
  await fill('input[name="email"]', email, 'email');
  await fill('input[name="shippingName"]', 'Jenny Rosen', 'name');
  // country select
  try {
    await frame.locator('select[name="shippingCountry"]').selectOption('US');
    log('country US');
  } catch { log('SKIP country'); }
  await page.waitForTimeout(1000);
  await fill('input[name="shippingAddressLine1"]', '510 Townsend St', 'address1');
  // dismiss possible autocomplete dropdown
  await page.keyboard.press('Escape').catch(() => {});
  // "enter address manually" link sometimes needed
  try {
    const manual = frame.getByText('Enter address manually', { exact: false }).first();
    if (await manual.isVisible({ timeout: 2000 })) { await manual.click(); log('manual address'); }
  } catch {}
  await fill('input[name="shippingAddressLine1"]', '510 Townsend St', 'address1(2)');
  await fill('input[name="shippingLocality"]', 'San Francisco', 'city');
  await fill('input[name="shippingPostalCode"]', '94103', 'zip');
  try {
    await frame.locator('select[name="shippingAdministrativeArea"]').selectOption('CA');
    log('state CA');
  } catch { log('SKIP state select'); }

  await page.screenshot({ path: `${SHOTS}/04-address.png`, fullPage: true });

  // expand the Card accordion option, retrying in case a Link popup steals focus
  const fillInAnyFrame = async (selector, value, name) => {
    for (let attempt = 0; attempt < 10; attempt++) {
      for (const f of page.frames()) {
        try {
          const el = await f.$(selector);
          if (el && (await el.isVisible())) {
            await el.fill(value);
            log('filled', name);
            return true;
          }
        } catch {}
      }
      await page.waitForTimeout(1000);
    }
    log('FAILED to fill', name);
    return false;
  };

  for (let i = 0; i < 4; i++) {
    try {
      await frame.locator('[data-testid="card-accordion-item-button"]').click({ timeout: 5000 });
      log('clicked card accordion button');
    } catch (e) {
      log('accordion click retry', e.message.split('\n')[0]);
    }
    await page.waitForTimeout(2500);
    const found = await page
      .frames()
      .reduce(async (accP, f) => (await accP) || !!(await f.$('input[name="cardNumber"]').catch(() => null)), Promise.resolve(false));
    if (found) break;
  }
  await page.screenshot({ path: `${SHOTS}/04b-card-open.png`, fullPage: true });

  await fillInAnyFrame('input[name="cardNumber"]', '4242424242424242', 'cardNumber');
  await fillInAnyFrame('input[name="cardExpiry"]', '12 / 34', 'cardExpiry');
  await fillInAnyFrame('input[name="cardCvc"]', '123', 'cardCvc');
  await fillInAnyFrame('input[name="billingName"]', 'Jenny Rosen', 'billingName');
  // Link "save my info" is on by default and requires a phone number
  try {
    const phone = frame.locator('input[name="phoneNumber"]');
    if (await phone.isVisible({ timeout: 3000 })) {
      await phone.fill('2015550123');
      log('filled phone');
    }
  } catch { log('SKIP phone'); }
  // dismiss any open address-autocomplete dropdown
  try {
    await frame.getByText('Card information', { exact: false }).first().click({ timeout: 3000 });
  } catch {}
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${SHOTS}/05-filled.png`, fullPage: true });

  log('submit payment');
  await frame.locator('button[type="submit"], .SubmitButton').first().click();

  await page.waitForURL('**/success**', { timeout: 90000 });
  log('redirected to success:', page.url());
  await page.screenshot({ path: `${SHOTS}/06-success.png`, fullPage: true });

  // wait for prodigi order id to show
  try {
    await page.waitForSelector('.Success-order code', { timeout: 120000 });
    const orderId = await page.textContent('.Success-order code');
    log('PRODIGI ORDER:', orderId);
  } catch {
    log('no prodigi order id shown within timeout');
  }
  await page.screenshot({ path: `${SHOTS}/07-final.png`, fullPage: true });
  console.log('SUCCESS_URL', page.url());
} catch (err) {
  console.error('E2E FAILED:', err.message);
  await page.screenshot({ path: `${SHOTS}/99-error.png`, fullPage: true }).catch(() => {});
  process.exitCode = 1;
} finally {
  await browser.close();
}
