import { chromium } from 'playwright';
const SITE = 'https://benchmark-20260910-prompt-v3-high-c-zeta.vercel.app';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
await p.goto(SITE, { waitUntil: 'networkidle' });
await p.screenshot({ path: '/tmp/fp/r-home.png' });
await p.goto(`${SITE}/design?d=${process.env.TOK}`, { waitUntil: 'networkidle' });
await p.waitForTimeout(1200);
await p.screenshot({ path: '/tmp/fp/r-design.png' });
// mobile
const m = await b.newPage({ viewport: { width: 390, height: 844 } });
await m.goto(`${SITE}/design`, { waitUntil: 'networkidle' });
await m.waitForTimeout(800);
await m.screenshot({ path: '/tmp/fp/r-mobile.png', fullPage: false });
await b.close();
