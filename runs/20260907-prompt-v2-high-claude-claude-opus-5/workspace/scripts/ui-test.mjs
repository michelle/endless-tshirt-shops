import { chromium } from 'playwright-core';
const EXEC = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const SITE = process.argv[2];
const b = await chromium.launch({ executablePath: EXEC });
const p = await b.newPage({ viewport: { width: 1280, height: 950 } });
const errs = [];
p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text().slice(0,140)); });

await p.goto(`${SITE}/shirt/switchboard-operator`, { waitUntil: 'networkidle' });
await p.locator('.swatch').nth(1).click();          // Night Watch
await p.locator('.size', { hasText: 'XL' }).first().click();
await p.locator('.qty button').nth(1).click();       // qty 2
await p.getByRole('button', { name: /Add to cart/ }).click();
await p.waitForTimeout(600);
await p.screenshot({ path: '/tmp/ui-pdp.png' });

await p.goto(`${SITE}/shirt/lamplighter`, { waitUntil: 'networkidle' });
await p.locator('.swatch').nth(4).click();           // Sawdust
await p.locator('.size', { hasText: /^M$/ }).first().click();
await p.getByRole('button', { name: /Add to cart/ }).click();
await p.waitForTimeout(500);

await p.goto(`${SITE}/cart`, { waitUntil: 'networkidle' });
await p.waitForTimeout(900);
await p.screenshot({ path: '/tmp/ui-cart.png', fullPage: true });
console.log('cart header:', await p.locator('.cart-pill').innerText());
console.log('total:', await p.locator('.cart-sum-row.total').innerText());

// crest view on PDP
await p.goto(`${SITE}/shirt/log-driver`, { waitUntil: 'networkidle' });
await p.locator('.pdp-thumb').nth(2).click();
await p.waitForTimeout(700);
await p.screenshot({ path: '/tmp/ui-crest.png' });

await p.goto(`${SITE}/about`, { waitUntil: 'networkidle' });
await p.screenshot({ path: '/tmp/ui-about.png', fullPage: true });

await b.close();
console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'no console errors');
