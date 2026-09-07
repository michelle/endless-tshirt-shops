import { chromium } from 'playwright-core';
import { mkdir, writeFile } from 'node:fs/promises';
import { DESIGNS, PALETTES, badgeSVG } from '../src/data/designs.mjs';

const EXEC = process.env.CHROME_BIN ||
  `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;

// Prodigi GLOBAL-TEE-GIL-64000 front print area (US lab): 4665 x 5844 px @ 300dpi
const PRINT_W = 4665, PRINT_H = 5844;
const ART_W = 3600, ART_H = 3990;           // 12in x 13.3in chest print
const ART_X = Math.round((PRINT_W - ART_W) / 2), ART_Y = 500;

const WEB_W = 900, WEB_H = 998;

const page = (inner, w, h) => `<!doctype html><html><head><meta charset="utf-8">
<style>html,body{margin:0;padding:0;background:transparent}
 body{width:${w}px;height:${h}px;overflow:hidden}
 svg{display:block}</style></head><body>${inner}</body></html>`;

const only = process.argv.slice(2);

const browser = await chromium.launch({ executablePath: EXEC });
await mkdir('public/prints', { recursive: true });
await mkdir('public/art', { recursive: true });

for (const d of DESIGNS) {
  if (only.length && !only.includes(d.slug)) continue;
  for (const key of ['light', 'dark']) {
    const svg = badgeSVG(d, PALETTES[key]);

    // --- web art
    const p1 = await browser.newPage({ viewport: { width: WEB_W, height: WEB_H }, deviceScaleFactor: 1 });
    await p1.setContent(page(svg.replace(/width="1200" height="1330"/, `width="${WEB_W}" height="${WEB_H}"`), WEB_W, WEB_H));
    await p1.waitForTimeout(120);
    await p1.screenshot({ path: `public/art/${d.slug}-${key}.png`, omitBackground: true });
    await p1.close();

    // --- print file
    const wrapped = `<div style="position:absolute;left:${ART_X}px;top:${ART_Y}px;width:${ART_W}px;height:${ART_H}px">
      ${svg.replace(/width="1200" height="1330"/, `width="${ART_W}" height="${ART_H}"`)}</div>`;
    const p2 = await browser.newPage({ viewport: { width: PRINT_W, height: PRINT_H }, deviceScaleFactor: 1 });
    await p2.setContent(page(wrapped, PRINT_W, PRINT_H));
    await p2.waitForTimeout(150);
    await p2.screenshot({ path: `public/prints/${d.slug}-${key}.png`, omitBackground: true });
    await p2.close();

    console.log('rendered', d.slug, key);
  }
}
await browser.close();
