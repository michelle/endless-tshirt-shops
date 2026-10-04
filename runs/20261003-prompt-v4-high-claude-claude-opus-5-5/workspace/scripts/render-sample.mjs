// Renders every preset on light + dark garments to out/ for visual QA.
import { mkdirSync, writeFileSync } from 'node:fs';
import { PRESETS, normalizeDesign } from '../public/js/design.js';
import { renderPrintPNG } from '../lib/render.js';

mkdirSync('out', { recursive: true });
const garments = process.argv.slice(2).length ? process.argv.slice(2) : ['white', 'black'];
for (const [name, preset] of Object.entries(PRESETS)) {
  for (const g of garments) {
    const t = Date.now();
    const png = await renderPrintPNG(normalizeDesign(preset), g);
    writeFileSync(`out/${name}-${g}.png`, png);
    console.log(`${name}-${g}.png ${(png.length / 1024).toFixed(0)}KB ${Date.now() - t}ms`);
  }
}
