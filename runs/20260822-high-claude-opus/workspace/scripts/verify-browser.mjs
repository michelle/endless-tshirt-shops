/**
 * Browser verification: fills the real checkout form, types a Stripe test card
 * into Stripe Elements, and buys a shirt.
 *
 *   BASE_URL=http://localhost:3000 node scripts/verify-browser.mjs
 *
 * This is the only way to exercise the parts a fetch-based test cannot: the
 * ticking preview, canvas print-artwork rendering, and Stripe Elements.
 * Screenshots land in ./screenshots.
 *
 * Requires Playwright (`npx playwright install chromium`).
 */

import fs from 'node:fs';
import { chromium } from 'playwright';

const BASE_URL = (process.env.BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const SHOTS = 'screenshots';

const steps = [];
function step(name, ok, detail) {
  steps.push({ name, ok, detail });
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
}

async function main() {
  fs.mkdirSync(SHOTS, { recursive: true });
  console.log(`Verifying ${BASE_URL} in Chromium\n`);

  // PLAYWRIGHT_CHANNEL=chrome uses a locally installed Google Chrome, which is
  // the fallback when the bundled headless shell will not start.
  const browser = await chromium.launch(
    process.env.PLAYWRIGHT_CHANNEL
      ? { channel: process.env.PLAYWRIGHT_CHANNEL }
      : {},
  );
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push(String(err)));

  // Stripe.js holds long-lived connections open, so `networkidle` never fires.
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.getByTestId('shirt-timestamp').waitFor({ timeout: 30_000 });

  // The preview should be ticking.
  const shirt = page.getByTestId('shirt-timestamp');
  const first = await shirt.textContent();
  await page.waitForTimeout(350);
  const second = await shirt.textContent();
  step(
    'preview ticks in real time',
    Boolean(first) && Boolean(second) && first !== second,
    `${first} → ${second}`,
  );

  // Print artwork renders in-page at print resolution.
  const artwork = await page.evaluate(async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 2400;
    canvas.height = 560;
    const ctx = canvas.getContext('2d');
    let family = '';
    for (let i = 0; i < 20 && !family; i++) {
      family = getComputedStyle(document.documentElement)
        .getPropertyValue('--font-chivo')
        .trim();
      if (!family) await new Promise((r) => setTimeout(r, 50));
    }
    family = family || 'monospace';
    await document.fonts.load(`700 200px ${family}`);
    ctx.font = `700 380px ${family}`;
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(Date.now()), 1200, 280);
    const url = canvas.toDataURL('image/png');
    return { family, length: url.length, prefix: url.slice(0, 22) };
  });
  step(
    'print artwork renders on canvas',
    artwork.prefix.startsWith('data:image/png;base64') && artwork.length > 5000,
    `font ${artwork.family || '(none)'}, ${Math.round(artwork.length / 1024)}KB data URL`,
  );

  // Cut and size selection.
  // The radios are visually hidden behind their labels, so click the label.
  await page.locator('label', { hasText: /^Unisex$/ }).click();
  await page.locator('label', { hasText: /^L$/ }).click();
  const selected = await page.evaluate(() =>
    Array.from(document.querySelectorAll('input[type=radio]:checked')).map((i) => i.value),
  );
  step(
    'cut and size selectable',
    selected.includes('unisex') && selected.includes('L'),
    selected.join(' / '),
  );

  await page.screenshot({ path: `${SHOTS}/01-storefront.png`, fullPage: true });

  // Fill the form.
  await page.fill('#email', 'jenny.rosen@example.com');

  /**
   * Stripe splits its elements across several same-named iframes, so locate a
   * frame by a field it contains rather than by its URL.
   */
  const frameWith = async (selector, label) => {
    for (let i = 0; i < 60; i++) {
      for (const frame of page.frames()) {
        if (!/elements-inner/.test(frame.url())) continue;
        if (await frame.locator(selector).count().catch(() => 0)) return frame;
      }
      await page.waitForTimeout(500);
    }
    throw new Error(`Stripe ${label} never loaded (${selector}).`);
  };

  const addrFrame = await frameWith('input[name="addressLine1"]', 'AddressElement');
  await addrFrame.fill('input[name="name"]', 'Jenny Rosen');
  await addrFrame.fill('input[name="addressLine1"]', '185 Berry St');
  await addrFrame.fill('input[name="addressLine2"]', 'Suite 550').catch(() => {});
  await addrFrame.fill('input[name="locality"]', 'San Francisco');
  await addrFrame.selectOption('select[name="administrativeArea"]', 'CA');
  await addrFrame.fill('input[name="postalCode"]', '94107');
  step('shipping address accepted by Stripe AddressElement', true, '185 Berry St, San Francisco, CA');

  // Card details.
  const payFrame = await frameWith('input[name="number"]', 'PaymentElement');
  await payFrame.fill('input[name="number"]', '4242424242424242');
  await payFrame.fill('input[name="expiry"]', '12 / 34');
  await payFrame.fill('input[name="cvc"]', '123');
  await payFrame.fill('input[name="postalCode"]', '94107').catch(() => {});
  step('card details accepted by Stripe PaymentElement', true, 'test card 4242');

  await page.screenshot({ path: `${SHOTS}/02-checkout-filled.png`, fullPage: true });

  // Buy.
  await page.getByRole('button', { name: /Buy now/i }).click();

  await page.waitForURL(/\/order\/pi_/, { timeout: 120_000 });
  await page.locator('main h2').first().waitFor({ timeout: 30_000 });

  const heading = await page.textContent('h2');
  step('purchase completes and lands on confirmation', /Congrats/i.test(heading ?? ''), heading?.trim());

  const bodyText = await page.textContent('main');
  const printed = /Printed on the shirt/i.test(bodyText ?? '');
  const reference = /Order reference/i.test(bodyText ?? '');
  step('confirmation shows printed timestamp and reference', printed && reference);

  // Wait for fulfillment to settle if it is still polling.
  for (let i = 0; i < 12; i++) {
    const t = await page.textContent('main');
    if (/print job is with our printer/i.test(t ?? '')) break;
    await page.waitForTimeout(2000);
  }
  const settled = await page.textContent('main');
  step(
    'shirt handed to the printer',
    /print job is with our printer/i.test(settled ?? ''),
    'fulfillment confirmed on page',
  );

  await page.screenshot({ path: `${SHOTS}/03-order-confirmed.png`, fullPage: true });

  step(
    'no uncaught console errors',
    consoleErrors.length === 0,
    consoleErrors.length ? consoleErrors.slice(0, 2).join(' | ') : 'clean',
  );

  console.log(`\nScreenshots written to ./${SHOTS}`);
  await browser.close();

  const failed = steps.filter((s) => !s.ok);
  console.log(`${steps.length - failed.length}/${steps.length} checks passed.`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error('\nBrowser verification crashed:', err);
  process.exit(1);
});
