import { chromium } from 'playwright-core';
import { DESIGNS, PALETTES, badgeSVG } from '../src/data/designs.mjs';
const EXEC = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;

const crest = (slug, size) =>
  badgeSVG(DESIGNS.find((d) => d.slug === slug), PALETTES.light)
    .replace(/width="1200" height="1330"/, `width="${size}" height="${size * 1.108}"`);

const html = `<!doctype html><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@600&display=swap" rel="stylesheet">
<style>
 html,body{margin:0;width:1200px;height:630px;background:#14181a;overflow:hidden;
   font-family:Inter,system-ui,sans-serif;color:#efe7d8}
 .l{position:absolute;left:64px;top:172px;width:560px}
 .k{font-size:13px;letter-spacing:.24em;text-transform:uppercase;color:#8d857a}
 h1{font-family:'Playfair Display',serif;font-size:64px;line-height:1.03;margin:16px 0 0;font-weight:700}
 h1 em{color:#dd7048}
 p{color:#c5bdae;font-size:19px;margin:20px 0 0}
 .r{position:absolute;right:-40px;top:-30px;width:660px;height:690px}
 .r>div{position:absolute}
</style>
<div class="l">
  <div class="k">Est. 2026 · Six extinct trades</div>
  <h1>Apparel for jobs that <em>no longer exist</em>.</h1>
  <p>Last Shift — union crests for the work that clocked out for good.</p>
</div>
<div class="r">
  <div style="left:250px;top:40px;opacity:.30">${crest('lamplighter', 300)}</div>
  <div style="left:40px;top:300px;opacity:.30">${crest('ice-cutter', 300)}</div>
  <div style="left:150px;top:130px">${crest('log-driver', 400)}</div>
</div>`;

const b = await chromium.launch({ executablePath: EXEC });
const p = await b.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await p.setContent(html, { waitUntil: 'networkidle' });
await p.waitForTimeout(1200);
await p.screenshot({ path: 'public/og.png' });
await b.close();
console.log('og written');
