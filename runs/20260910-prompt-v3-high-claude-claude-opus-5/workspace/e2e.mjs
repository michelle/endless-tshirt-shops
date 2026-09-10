import { chromium } from 'playwright';

const SITE = process.env.SITE || 'https://benchmark-20260910-prompt-v3-high-c-zeta.vercel.app';
const OUT = '/tmp/fp';

const log = (...a) => console.log('[e2e]', ...a);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await ctx.newPage();
page.on('console', (m) => { if (m.type() === 'error') log('page-error:', m.text().slice(0, 200)); });
page.on('response', (r) => { if (r.status() >= 400) log('http', r.status(), r.url().slice(0, 120)); });

log('home…');
await page.goto(SITE, { waitUntil: 'networkidle' });
await page.screenshot({ path: `${OUT}/01-home.png`, fullPage: false });
await page.screenshot({ path: `${OUT}/01-home-full.png`, fullPage: true });

log('design…');
await page.goto(`${SITE}/design`, { waitUntil: 'networkidle' });
await page.fill('#f-name', 'Rosalind Ferrer');
await page.fill('#f-date', '1987-03-11');
await page.fill('#f-place', 'Valparaíso, Chile');
await page.waitForTimeout(700);
await page.screenshot({ path: `${OUT}/02-design.png` });

// Pick a dark garment to prove the ink set flips.
await page.click('button.swatch[aria-label="Maroon"]');
await page.click('button.chip[aria-pressed="false"]:has-text("L")');
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/03-dark.png` });

log('delivery…');
await page.click('button:has-text("Continue to delivery")');
await page.waitForTimeout(400);
await page.fill('#a-name', 'Rosalind Ferrer');
await page.fill('#a-email', 'rosalind@example.com');
await page.fill('#a-line1', '203 South Highland Avenue');
await page.fill('#a-city', 'Marfa');
await page.fill('#a-state', 'TX');
await page.fill('#a-zip', '79843');
await page.waitForSelector('.ship-option', { timeout: 25000 });
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/04-delivery.png`, fullPage: true });

const options = await page.$$eval('.ship-option', (els) => els.map((e) => e.innerText.replace(/\n/g, ' | ')));
log('shipping options:', JSON.stringify(options));

log('checkout…');
await page.click('button:has-text("Pay $")');
await page.waitForURL(/checkout\.stripe\.com/, { timeout: 45000 });
await page.waitForLoadState('networkidle');
await page.screenshot({ path: `${OUT}/05-stripe.png`, fullPage: true });
log('on stripe:', page.url().slice(0, 80));

// Fill Stripe's hosted form with the standard test card.
await page.waitForTimeout(2500);
// Stripe's adaptive layout shows a method picker; open the Card accordion.
const cardRadio = page.locator('#payment-method-accordion-item-title-card');
if (await cardRadio.count()) {
  await cardRadio.click({ force: true }).catch(() => {});
  await page.waitForTimeout(2500);
}
const fill = async (sel, val) => {
  const el = await page.waitForSelector(sel, { timeout: 20000 });
  await el.click();
  await el.fill(val);
};
await fill('#email', 'rosalind@example.com').catch(() => log('email prefilled'));
await fill('#cardNumber', '4242424242424242');
await fill('#cardExpiry', '12 / 34');
await fill('#cardCvc', '123');
await fill('#billingName', 'Rosalind Ferrer');
const zip = await page.$('#billingPostalCode');
if (zip) await zip.fill('79843');
await page.screenshot({ path: `${OUT}/06-stripe-filled.png`, fullPage: true });

// Skip Link enrolment; it demands a phone number.
const link = page.locator('#enableStripePass');
if (await link.count() && await link.isChecked().catch(() => false)) {
  await link.uncheck({ force: true }).catch(() => {});
  await page.waitForTimeout(800);
}
await page.getByTestId('hosted-payment-submit-button').click({ timeout: 15000 })
  .catch(async () => { await page.locator('button:has-text("Pay")').last().click(); });
log('submitted, waiting for return…');
await page.waitForTimeout(8000);
await page.screenshot({ path: `${OUT}/06b-after-submit.png`, fullPage: true });
await page.waitForURL(/\/order\?session_id=/, { timeout: 120000 });
log('returned to', page.url().slice(0, 120));

await page.waitForTimeout(6000);
await page.screenshot({ path: `${OUT}/07-order.png`, fullPage: true });
const body = await page.innerText('.order-card');
log('--- order page ---\n' + body);

// Poll a little longer to see the Prodigi id land.
for (let i = 0; i < 6; i++) {
  await page.waitForTimeout(4000);
  const t = await page.innerText('.order-card');
  if (/ord_/.test(t)) { log('prodigi order visible after', (i + 1) * 4, 's'); break; }
}
await page.screenshot({ path: `${OUT}/08-order-final.png`, fullPage: true });
log('--- final ---\n' + (await page.innerText('.order-card')));

await browser.close();
