import { chromium } from 'playwright-core';
const EXEC = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const b = await chromium.launch({ executablePath: EXEC });
const p = await b.newPage({ viewport: { width: 390, height: 500 }, deviceScaleFactor: 2, isMobile: true });
await p.goto(process.argv[2], { waitUntil: 'networkidle' });
await p.screenshot({ path: '/tmp/m-head.png' });
await b.close(); console.log('ok');
