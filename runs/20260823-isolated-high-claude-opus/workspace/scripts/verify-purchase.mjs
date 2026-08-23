// Drives a real browser purchase against the deployed store: pick a fit/size,
// click buy, fill the Stripe Payment Element, and land on /thanks.
import { chromium } from 'playwright';

const BASE = process.env.BASE;
const page_errors = [];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 1400 } });
const page = await ctx.newPage();
page.on('pageerror', (e) => page_errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') page_errors.push('console: ' + m.text()); });

const log = (...a) => console.log(...a);

log('→ open', BASE);
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.screenshot({ path: '/tmp/shot-1-store.png', fullPage: true });

log('→ masthead:', JSON.stringify(await page.locator('h1').first().innerText()));
log('→ tagline:', JSON.stringify(await page.locator('.masthead p').first().innerText()));

// The live clock must actually tick.
const readClock = () =>
  page.evaluate(() => {
    const c = document.querySelector('canvas');
    return c ? c.toDataURL().length + ':' + (c.width + 'x' + c.height) : null;
  });
const a = await readClock();
await page.waitForTimeout(1200);
const b = await readClock();
log('→ shirt canvas ticking:', a !== b, '| canvas:', (b || '').split(':')[1]);

log('→ price shown:', (await page.locator('.shirt-price').first().innerText()).replace(/\n+/g, ' '));

log('→ select Unisex / XL');
await page.getByText('Unisex', { exact: true }).click();
await page.getByText('XL', { exact: true }).first().click();

// Reveal the manual form if the wallet row is showing instead.
const manual = page.getByText(/enter your details manually/i);
if (await manual.count()) {
  log('→ clicking "enter your details manually"');
  await manual.first().click();
}
await page.waitForTimeout(1500);
await page.screenshot({ path: '/tmp/shot-2-form.png', fullPage: true });

const fill = async (placeholder, value) => {
  const el = page.getByPlaceholder(placeholder, { exact: false }).first();
  await el.waitFor({ state: 'visible', timeout: 15000 });
  await el.fill(value);
};

log('→ fill shipping details');
const fields = await page.locator('input:visible').evaluateAll((els) =>
  els.map((e) => ({ name: e.name, placeholder: e.placeholder, type: e.type })),
);
log('   visible inputs:', JSON.stringify(fields));

for (const [ph, val] of [
  ['email', 'browser-buy@example.com'],
  ['name', 'Ada Lovelace'],
  ['address', '500 Terry Francois St'],
  ['city', 'San Francisco'],
  ['state', 'CA'],
  ['zip', '94158'],
]) {
  try { await fill(ph, val); } catch (e) { log('   could not fill', ph, '-', String(e).split('\n')[0]); }
}
await page.screenshot({ path: '/tmp/shot-3-filled.png', fullPage: true });

log('→ fill card in the Stripe iframe');
const cardFrame = page.frameLocator('iframe[title*="payment" i], iframe[name^="__privateStripeFrame"]').first();
const numberInput = cardFrame.locator('input[name="number"]');
await numberInput.waitFor({ state: 'visible', timeout: 30000 });
await numberInput.fill('4242424242424242');
await cardFrame.locator('input[name="expiry"]').fill('12/34');
await cardFrame.locator('input[name="cvc"]').fill('123');
const zipInIframe = cardFrame.locator('input[name="postalCode"]');
if (await zipInIframe.count()) await zipInIframe.fill('94158').catch(() => {});
await page.screenshot({ path: '/tmp/shot-4-card.png', fullPage: true });

log('→ submit');
const buy = page.locator('button[type="submit"]:visible').last();
log('   button text:', JSON.stringify(await buy.innerText()));
await buy.click();

log('→ waiting for /thanks');
try {
  await page.waitForURL(/\/thanks/, { timeout: 90000 });
} catch {
  log('   still on', page.url());
  const alert = page.locator('.alert, [role="alert"]');
  if (await alert.count()) log('   alert:', await alert.first().innerText());
  await page.screenshot({ path: '/tmp/shot-5-error.png', fullPage: true });
  throw new Error('did not reach /thanks');
}
log('   url:', page.url());

// Wait for the Scalable Press order id to appear on the page.
await page.waitForFunction(
  () => /[0-9a-f]{24}/.test(document.body.innerText),
  null,
  { timeout: 90000 },
).catch(() => log('   (no order id rendered in time)'));
await page.waitForTimeout(1000);
await page.screenshot({ path: '/tmp/shot-6-thanks.png', fullPage: true });

const text = (await page.locator('body').innerText()).replace(/\n{2,}/g, '\n');
log('\n--- /thanks page text ---\n' + text + '\n---');
const orderId = text.match(/[0-9a-f]{24}/)?.[0];
log('order id on page:', orderId ?? 'NONE');
log('page errors:', page_errors.length ? JSON.stringify(page_errors, null, 2) : 'none');

await browser.close();
if (!orderId) process.exit(1);
console.log('\nBROWSER_ORDER_ID=' + orderId);
