import { chromium } from 'playwright';

const BASE = process.env.BASE || 'https://benchmark-20260825-harness6-high-cl-orcin.vercel.app';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.setDefaultTimeout(30000);
page.context().on('page', (p) => p.close().catch(() => {}));

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.click('.buy-button');
await page.waitForSelector('.checkout-mount iframe', { timeout: 45000 });
await page.waitForTimeout(8000);

const inner = page
  .frames()
  .find((f) => f.url().includes('embedded-checkout-inner'));

const html = await inner.$$eval(
  '[data-testid]',
  (els) => els.map((e) => `${e.tagName}[${e.getAttribute('data-testid')}]`).slice(0, 60)
);
console.log(html.join('\n'));
await browser.close();
