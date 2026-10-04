// Usage: node scripts/shot.mjs <url> <out.png> [width] [height] [fullPage]
import puppeteer from 'puppeteer-core';
const [url, out, w = 1440, h = 1000, full = '1'] = process.argv.slice(2);
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--no-first-run'] });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.setViewport({ width: +w, height: +h });
await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
await new Promise((r) => setTimeout(r, 800));
await page.screenshot({ path: out, fullPage: full === '1' });
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
