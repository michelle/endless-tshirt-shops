import { chromium } from 'playwright';

const BASE = process.env.BASE || 'https://benchmark-20260825-harness6-high-cl-orcin.vercel.app';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.setDefaultTimeout(30000);

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.click('.buy-button');
await page.waitForSelector('.checkout-mount iframe', { timeout: 45000 });
await page.waitForTimeout(8000);

for (const f of page.frames()) {
  const inputs = await f
    .$$eval('input, select, [role="radio"], button[type="submit"]', (els) =>
      els.slice(0, 25).map((e) => `${e.tagName}:${e.getAttribute('name') || e.getAttribute('id') || e.getAttribute('aria-label') || e.textContent?.slice(0, 30)}`)
    )
    .catch(() => []);
  console.log('FRAME', f.url().slice(0, 110));
  if (inputs.length) console.log('  ', inputs.join(' | '));
}
await browser.close();
