import { chromium } from 'playwright';
const base = process.env.BASE || 'http://localhost:3210';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1300, height: 1000 }, deviceScaleFactor: 2 });
await p.goto(base, { waitUntil: 'networkidle' });
await p.waitForTimeout(1500);
await p.screenshot({ path: 'out/hero.png' });
// switch to a dark colourway to check the two-ink palette on cloth
await p.click('button[aria-label="Navy"]');
await p.waitForTimeout(900);
await p.evaluate(() => window.scrollTo(0, 500));
await p.waitForTimeout(300);
await p.screenshot({ path: 'out/dark.png' });
await b.close();
console.log('ok');
