// Dev utility: render sample designs to PNG for visual inspection.
// Usage: npx tsx scripts/render-sample.ts <out.png> [variant]
// Variants: dark (default), light, fullmoon, newmoon, noon
import { writeFileSync } from 'node:fs';
import { renderDesignForShirt } from '../lib/design';
import { rasterizePng } from '../lib/raster';
import type { DesignParams } from '../lib/types';

const variant = process.argv[3] ?? 'dark';

const base: DesignParams = {
  v: 1,
  name: 'Amelia',
  date: '1995-05-14',
  time: '21:30',
  place: 'London, United Kingdom',
  lat: 51.5072,
  lon: -0.1276,
  tz: 'Europe/London',
  utcOffset: null,
  msg: 'Under this sky, everything began.',
  style: 'gilded',
};

let design = base;
let color = 'black';
if (variant === 'light') {
  color = 'cream';
  design = { ...base, name: 'Theodore', style: 'starlight', msg: '' };
} else if (variant === 'fullmoon') {
  design = { ...base, date: '1990-02-10', time: '23:10', place: 'New York, USA', lat: 40.7128, lon: -74.006, tz: 'America/New_York', name: 'Luna' };
} else if (variant === 'newmoon') {
  design = { ...base, date: '1988-03-17', time: '22:05', place: 'Sydney, Australia', lat: -33.8688, lon: 151.2093, tz: 'Australia/Sydney', name: 'Oliver', style: 'starlight' };
} else if (variant === 'noon') {
  design = { ...base, date: '2001-07-22', time: '12:15', place: 'Reykjavík, Iceland', lat: 64.1466, lon: -21.9426, tz: 'Atlantic/Reykjavik', name: 'Sólveig', msg: 'Born at noon, under an invisible sky.' };
}

const svg = renderDesignForShirt(design, color);
const png = rasterizePng(svg);
const out = process.argv[2] ?? 'sample.png';
writeFileSync(out, png);
console.log(`wrote ${out} (${png.length} bytes, variant ${variant}, color ${color})`);
