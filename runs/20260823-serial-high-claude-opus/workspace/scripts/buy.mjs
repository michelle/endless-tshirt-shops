/**
 * Dev-only: drives a real purchase through the browser with a Stripe test card.
 *   node scripts/buy.mjs <base-url> [style] [size]
 *
 * This is the check that matters — it exercises Elements, the deferred-intent
 * confirm, the redirect to /order, and the fulfilment trigger, in that order,
 * the way a customer would.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';

const base = (process.argv[2] ?? 'http://localhost:3111').replace(/\/$/, '');
const style = process.argv[3] ?? 'fitted';
const size = process.argv[4] ?? 'M';

fs.mkdirSync('tmp-artifacts', { recursive: true });
// The bundled headless shell won't start in this sandbox; installed Chrome does.
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1280, height: 1100 }, deviceScaleFactor: 2 });

const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));

// Our own API calls, with bodies — the only reliable window into why a submit
// stalled, since Stripe's failures surface inside a cross-origin iframe.
const api = [];
page.on('response', async (res) => {
  const url = new URL(res.url());
  if (url.origin !== new URL(base).origin || !url.pathname.startsWith('/api/')) return;
  const body = await res.text().catch(() => '(unreadable)');
  api.push(`${res.status()} ${res.request().method()} ${url.pathname} -> ${body.slice(0, 400)}`);
});

const step = (msg) => console.log(`  ${msg}`);

/**
 * Fill a field and prove the text landed in it.
 *
 * Necessary because Playwright's `fill` focuses the target and then injects the
 * text as input events. Stripe's Elements move focus around while they mount,
 * so a fill issued too early lands in whatever was focused before — silently,
 * and the failure only shows up much later as a validation message.
 */
async function fillField(locator, value, label) {
  // Stripe reformats as you type ("4242 4242 …"), so compare without spaces.
  const bare = (s) => s.replace(/\s+/g, '');
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await locator.waitFor({ state: 'visible', timeout: 30_000 });
    await locator.click();
    await locator.fill(value);
    if (bare(await locator.inputValue()) === bare(value)) return;
    step(`retrying ${label} (attempt ${attempt} landed elsewhere)`);
    await page.waitForTimeout(500);
  }
  throw new Error(`could not fill ${label}`);
}

await page.goto(`${base}/`, { waitUntil: 'load', timeout: 60_000 }).catch((e) => step(`goto: ${e.message}`));
step('store loaded');

/**
 * Pick a product option. The radios themselves are visually hidden behind their
 * styled labels, so click the label — `check()` on the input fails as "not
 * visible" for anything that isn't already the default.
 */
async function choose(name) {
  const radio = page.getByRole('radio', { name });
  if (await radio.isChecked()) return;
  await radio.locator('xpath=ancestor::label[1]').click();
  await radio.waitFor({ state: 'attached' });
}

await choose(new RegExp(style, 'i'));
await choose(new RegExp(`^${size}$`));
step(`selected ${style} / ${size}`);

const printed = await page.locator('.tnum').first().innerText();
step(`preview showing ${printed}`);

// Scope to each Element's own iframe by `src`, not by `title`: Stripe puts
// several frames under the title "Secure payment input frame" (the card fields,
// an accessory target, an ACH bank-search popover), and which of them exist
// depends on how far initialisation has got, so the title is ambiguous.
//
// Within a frame, target the input `name` attributes: the visible labels vary
// by locale and by which country is selected, the names don't.
const address = page.frameLocator('iframe[src*="elements-inner-address"]');
const card = page.frameLocator('iframe[src*="elements-inner-payment"]');

// Wait for the last field of each Element before touching the first one.
await address.locator('input[name="postalCode"]').waitFor({ timeout: 60_000 });
await card.locator('input[name="cvc"]').waitFor({ timeout: 60_000 });
step('elements mounted');

// Email is ours; everything below it is a cross-origin Stripe iframe.
await fillField(page.locator('input#email'), 'browser-e2e@example.com', 'email');
step('email filled');

await fillField(address.locator('input[name="name"]'), 'Ada Lovelace', 'name');
await fillField(address.locator('input[name="addressLine1"]'), '510 Townsend St', 'address1');
// Google's autocomplete dropdown overlays the fields below — dismiss it first.
await page.keyboard.press('Escape');
await fillField(address.locator('input[name="locality"]'), 'San Francisco', 'city');
await address.locator('select[name="administrativeArea"]').selectOption('CA');
await fillField(address.locator('input[name="postalCode"]'), '94103', 'zip');
step('shipping address filled');

await fillField(card.locator('input[name="number"]'), '4242424242424242', 'card number');
await fillField(card.locator('input[name="expiry"]'), '12 / 34', 'expiry');
await fillField(card.locator('input[name="cvc"]'), '123', 'cvc');
step('card filled (4242)');

// Belt and braces: if Stripe ever re-introduces the Link signup prompt, its
// mobile-number field becomes required and blocks submit. Opt out if it's there.
const saveInfo = card.locator('input[name="savePaymentMethod"]');
if (await saveInfo.isChecked().catch(() => false)) {
  await saveInfo.uncheck();
  step('opted out of Link signup');
}

// The address autocomplete dropdown is a floating iframe that can still be open
// over the form; it must not be between the cursor and the button.
await page.keyboard.press('Escape');
await page.screenshot({ path: 'tmp-artifacts/buy-1-filled.png' });

// Count real submit events. A click can be reported as delivered and still not
// produce one: mousedown and mouseup have to land on the same element, and this
// column resizes underneath them (the wallet block appears, the address
// autocomplete popover opens and closes). Retry until the form actually submits.
await page.evaluate(() => {
  window.__submits = 0;
  document.querySelector('form')?.addEventListener('submit', () => {
    window.__submits += 1;
  }, true);
});

const buyButton = page.getByRole('button', { name: /buy now/i });
for (let attempt = 1; attempt <= 4; attempt += 1) {
  await buyButton.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await buyButton.click({ trial: false });
  await page
    .waitForFunction(() => window.__submits > 0, null, { timeout: 3000 })
    .catch(() => step(`click ${attempt} did not submit the form`));
  if (await page.evaluate(() => window.__submits > 0)) break;
}
step('submitted');

await page.waitForURL(/\/order/, { timeout: 90_000 }).catch(async (e) => {
  await page.screenshot({ path: 'tmp-artifacts/buy-fail.png' });
  const alerts = await page.getByRole('alert').allInnerTexts();
  console.log(`\nSUBMIT DID NOT NAVIGATE\n  url: ${page.url()}`);
  console.log(`  alerts: ${alerts.length ? JSON.stringify(alerts, null, 1) : '(none)'}`);
  console.log(`  button: ${JSON.stringify(await page.getByRole('button', { name: /buy now|placing/i }).innerText().catch((err) => err.message))}`);
  console.log(`  submit events: ${await page.evaluate(() => window.__submits)}`);
  console.log(`  email value: ${JSON.stringify(await page.locator('input#email').inputValue())}`);
  console.log(`  form:\n${(await page.locator('form').innerText()).replace(/^/gm, '     ')}`);
  console.log(`  api: ${api.length ? '\n   ' + api.join('\n   ') : '(no calls)'}`);
  console.log(`  console: ${JSON.stringify(errors, null, 1)}`);
  throw e;
});
step(`landed on ${new URL(page.url()).pathname}`);

// The order page triggers fulfilment, then polls for the printer's order id.
await page
  .getByText(/with the printer|printer has|order (id|number)/i)
  .first()
  .waitFor({ timeout: 90_000 })
  .catch(() => step('(no printer confirmation text yet)'));
await page.waitForTimeout(3000);

await page.screenshot({ path: 'tmp-artifacts/buy-2-order.png', fullPage: true });

const body = await page.locator('main').innerText();
console.log('\n--- order page ---\n' + body.replace(/^/gm, '  '));
console.log(`\nconsole errors: ${errors.length ? JSON.stringify(errors, null, 1) : 'none'}`);

await browser.close();
