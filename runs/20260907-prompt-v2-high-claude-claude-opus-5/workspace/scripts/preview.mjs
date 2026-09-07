import { chromium } from 'playwright-core';
import { DESIGNS, PALETTES, badgeSVG } from '../src/data/designs.mjs';
const EXEC = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const slugs = process.argv.slice(2);
const list = slugs.length ? DESIGNS.filter(d => slugs.includes(d.slug)) : DESIGNS;
const cells = list.map(d => `<div class="c"><div class="dk">${badgeSVG(d, PALETTES.light).replace(/width="1200" height="1330"/,'width="560" height="620"')}</div>
<div class="lt">${badgeSVG(d, PALETTES.dark).replace(/width="1200" height="1330"/,'width="560" height="620"')}</div></div>`).join('');
const html = `<!doctype html><meta charset=utf-8><style>body{margin:0;background:#555;font:12px sans-serif;display:flex;flex-wrap:wrap}
.c{display:flex}.dk{background:#14181A;padding:10px}.lt{background:#EFE9DE;padding:10px}</style>${cells}`;
const b = await chromium.launch({ executablePath: EXEC });
const p = await b.newPage({ viewport: { width: 1180, height: 660 * Math.ceil(list.length) } });
await p.setContent(html); await p.waitForTimeout(200);
await p.screenshot({ path: 'preview.png', fullPage: true });
await b.close(); console.log('ok');
