// Renders sample print files to ./out for visual QA: node scripts/render-local.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { renderPNG } from '../lib/render.js';
import { DEFAULT_DESIGN, validateDesign } from '../public/catalog.js';

mkdirSync('out', { recursive: true });
const eight = {
  ...DEFAULT_DESIGN, letter: '7', name: 'Grandpa Walt’s Express Line', color: 'yellow', tagline: 'Eighty years of local service',
  stops: [
    { name: 'Kraków', note: '1944' }, { name: 'Ellis Island', note: 'Arrived · 1951' },
    { name: 'Hoboken Shipyards', note: '1958–1979', transfer: { letter: 'R', color: 'red' } },
    { name: 'St. Mary’s Church', note: 'Married Rose · 1962' }, { name: 'Bayonne', note: '4 kids · 1963–71' },
    { name: 'Retirement', note: '2004' }, { name: 'Great-grandpa', note: '2019', transfer: { letter: 'B', color: 'blue' } },
    { name: 'The Back Porch', note: 'Still here' },
  ],
  next: 'The 100 Club',
};
const two = { letter: 'M', name: 'Mia & Leo', tagline: '', color: 'pink', stops: [{ name: 'First date', note: 'June 2019' }, { name: 'I do', note: '10.05.2026' }], next: '' };
for (const [name, d, dark, bg] of [
  ['default-white', DEFAULT_DESIGN, false, '#F8F8F6'],
  ['default-black', DEFAULT_DESIGN, true, '#1B1B1D'],
  ['eight-navy', eight, true, '#202B45'],
  ['eight-natural', eight, false, '#EFE7D6'],
  ['two-heather', two, false, '#C3C3C5'],
]) {
  const v = validateDesign(d);
  if (!v.ok) console.log(name, v.errors);
  const t = Date.now();
  writeFileSync(`out/${name}.png`, await renderPNG(v.design, { dark, background: bg, width: 1170 }));
  const full = await renderPNG(v.design, { dark });
  writeFileSync(`out/${name}-print.png`, full);
  console.log(name, `${full.length} bytes`, `${Date.now() - t}ms`);
}
