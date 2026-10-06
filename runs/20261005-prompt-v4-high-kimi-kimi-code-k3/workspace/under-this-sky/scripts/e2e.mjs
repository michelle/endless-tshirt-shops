// Full end-to-end test: real customer flow through the live store.
// Storefront -> Stripe Checkout (test card) -> success page -> Prodigi order.
import { chromium } from 'playwright';

const STORE = process.env.STORE_URL || 'http://localhost:8787';

const browser = await chromium.launch();
const page = await browser.newPage();

console.log('1. opening store', STORE);
await page.goto(STORE, { waitUntil: 'networkidle' });
await page.screenshot({ path: 'out/e2e-1-home.png', fullPage: false });

// fill customizer
await page.fill('#title', 'The Night Leo Was Born');
await page.fill('#subtitle', 'Our Greatest Adventure');
await page.fill('#place', 'Porto');
await page.waitForTimeout(1400);
const suggestion = page.locator('#place-results div').first();
if (await suggestion.count()) await suggestion.click();
await page.fill('#date', '2023-09-02');
await page.fill('#time', '04:12');
await page.click('[data-color="navy blue"]');
await page.click('[data-size="l"]');
await page.waitForTimeout(1200);
await page.screenshot({ path: 'out/e2e-2-customized.png' });
console.log('2. customizer filled');

// buy -> stripe checkout
await page.click('#buy');
await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30000 });
console.log('3. on Stripe Checkout');
await page.waitForTimeout(3000);

const fillFirst = async (selectors, value) => {
  for (const s of selectors) {
    const el = page.locator(s).first();
    if (await el.count()) { await el.fill(value); return true; }
  }
  return false;
};

await fillFirst(['#email', 'input[name="email"]', 'input[type="email"]'], 'leo.dad@example.com');

// reveal manual address entry (new checkout hides fields behind this link)
const manual = page.locator('button:has-text("Enter address manually"), a:has-text("Enter address manually")').first();
if (await manual.count()) await manual.click();
await page.waitForTimeout(1000);

const fillPh = async (ph, value) => {
  const el = page.getByPlaceholder(ph).first();
  if (await el.count()) { await el.fill(value); return true; }
  return false;
};

// country -> Portugal (native select in the shipping block)
const country = page.locator('select').first();
if (await country.count()) {
  try { await country.selectOption({ label: 'Portugal' }); } catch {}
}
await page.waitForTimeout(1000);

await fillPh('Full name', 'Rui Costa');
await fillPh('Address line 1', 'Rua das Flores 123');
await fillPh('Address line 2', '2nd floor');
await fillPh('City', 'Porto');
await fillPh(/ZIP|Postal code/i, '4050-262');
await fillPh(/Phone|\(201\)/, '912345678');

// select "Card" payment method to reveal card fields
const cardRadio = page.getByRole('radio', { name: /^card$/i }).first();
if (await cardRadio.count()) {
  await cardRadio.click({ force: true });
} else {
  await page.locator('[class*="PaymentMethod"] >> text=Card').first().click({ force: true }).catch(() => {});
}
await page.waitForTimeout(1800);
await fillPh(/1234/, '4242424242424242');
await fillPh(/MM.*YY/i, '1234');
await fillPh('CVC', '123');
await fillPh(/name on card/i, 'Rui Costa');
// decline Link save to keep the flow one-step
const linkSave = page.locator('input[type="checkbox"]').last();
if (await linkSave.count() && await linkSave.isChecked()) await linkSave.uncheck();
await page.screenshot({ path: 'out/e2e-3-checkout.png', fullPage: true });
console.log('4. payment details filled');

await page.getByRole('button', { name: 'Pay', exact: true }).click();
console.log('5. payment submitted, waiting for redirect…');
try {
  await page.waitForURL(/success\.html/, { timeout: 45000 });
} catch {
  await page.screenshot({ path: 'out/e2e-3b-afterpay.png', fullPage: true });
  const body = await page.evaluate(() => document.body.innerText.slice(0, 2000));
  console.log('NO REDIRECT. url =', page.url());
  console.log('page text:', body);
  throw new Error('no redirect');
}
console.log('6. landed on success page');

// wait for prodigi confirmation pill
await page.waitForSelector('.status-pill', { timeout: 10000 });
let status = '';
for (let i = 0; i < 20; i++) {
  status = await page.textContent('.status-pill');
  if (/confirmed|snag|received/.test(status)) break;
  await page.waitForTimeout(2000);
}
await page.waitForTimeout(2500);
await page.screenshot({ path: 'out/e2e-4-success.png', fullPage: true });
console.log('7. final status:', status);
console.log('URL:', page.url());

await browser.close();
