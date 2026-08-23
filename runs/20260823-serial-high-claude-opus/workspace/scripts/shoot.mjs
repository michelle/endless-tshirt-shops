/**
 * Dev-only: screenshot a page at desktop + mobile widths.
 *   node scripts/shoot.mjs <url> <name> [--wait ms]
 */
import { chromium } from 'playwright';
import fs from 'node:fs';

const url = process.argv[2] ?? 'http://localhost:3111/';
const name = process.argv[3] ?? 'page';
const waitIndex = process.argv.indexOf('--wait');
const wait = waitIndex > -1 ? Number(process.argv[waitIndex + 1]) : 2500;

fs.mkdirSync('tmp-artifacts', { recursive: true });
// The bundled headless shell won't start in this sandbox; installed Chrome does.
const browser = await chromium.launch({ channel: 'chrome' });

for (const [label, viewport] of [
  ['desktop', { width: 1280, height: 1000 }],
  ['mobile', { width: 390, height: 900 }],
]) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 2 });
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));

  // Not `networkidle`: Stripe Elements keeps a connection open, so it never idles.
  await page.goto(url, { waitUntil: 'load', timeout: 60_000 }).catch((e) => {
    console.log(`[${label}] goto: ${e.message}`);
  });
  await page.waitForTimeout(wait);
  await page.screenshot({ path: `tmp-artifacts/${name}-${label}.png`, fullPage: true });
  console.log(`[${label}] saved. console errors: ${errors.length ? JSON.stringify(errors, null, 1) : 'none'}`);
  await page.close();
}

await browser.close();
