// Composites designs onto garment-coloured backgrounds for eyeballing.
import { mkdirSync, writeFileSync } from 'node:fs';
import { PRESETS, GARMENTS, normalizeDesign } from '../public/js/design.js';
import { renderPrintPNG } from '../lib/render.js';

mkdirSync('out', { recursive: true });
const [preset = 'life', ...garments] = process.argv.slice(2);
for (const g of garments.length ? garments : ['white', 'black']) {
  const png = await renderPrintPNG(normalizeDesign(PRESETS[preset]), g, { width: 900, background: GARMENTS[g].hex });
  writeFileSync(`out/qa-${preset}-${g}.png`, png);
}
