import { writeFile } from 'node:fs/promises';
import { DESIGNS } from '../src/data/designs.mjs';
const out = DESIGNS.map((d) => ({
  slug: d.slug, trade: d.trade, years: d.years, local: d.local,
  motto: d.mottoLines.join(' '), blurb: d.blurb, fact: d.fact,
}));
await writeFile('src/data/catalog.json', JSON.stringify(out, null, 2));
console.log('wrote', out.length);
