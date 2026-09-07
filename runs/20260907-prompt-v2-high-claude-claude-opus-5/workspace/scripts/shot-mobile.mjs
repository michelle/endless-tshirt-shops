import { chromium } from 'playwright-core';
const EXEC = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const b = await chromium.launch({ executablePath: EXEC });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const U = process.argv[2];
await p.goto(`${U}/shirt/human-computer`, { waitUntil: 'networkidle' });
await p.screenshot({ path: '/tmp/m-pdp.png', fullPage: true });
await b.close(); console.log('ok');
