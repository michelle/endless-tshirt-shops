// Renders a few sample days to ./out so the design can be eyeballed. Usage: node scripts/render-test.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { fetchDay, geocode } from '../lib/weather.js';
import { renderSVG, SHIRTS } from '../public/lib/dayprint.js';
import { svgToPng } from '../lib/render.js';

mkdirSync('out', { recursive: true });
const samples = [
  { q: 'Portland', date: '1991-06-14', shirt: 'black', caption: 'The day you were born', unit: 'F' },
  { q: 'London', date: '1987-10-16', shirt: 'natural', caption: 'The Great Storm', unit: 'C' },
  { q: 'Reykjavik', date: '2015-01-10', shirt: 'navy blue', caption: '', unit: 'C' },
];
for (const s of samples) {
  const [place] = await geocode(s.q, 1);
  const day = await fetchDay({ lat: place.lat, lon: place.lon, date: s.date, unit: s.unit, place });
  const svg = renderSVG(day, { shirt: s.shirt, caption: s.caption, preview: 'solid' });
  const t0 = Date.now();
  const png = await svgToPng(svg, 1170); // quarter-size for a quick look
  const name = `${s.q.toLowerCase()}-${s.date}-${s.shirt.replace(/ /g, '_')}`;
  writeFileSync(`out/${name}.svg`, svg);
  writeFileSync(`out/${name}.png`, png);
  console.log(name, `${png.length} bytes`, `${Date.now() - t0}ms`, day.daily, day.moon.name);
}
const full = Date.now();
const [place] = await geocode('Portland', 1);
const day = await fetchDay({ lat: place.lat, lon: place.lon, date: '1991-06-14', unit: 'F', place });
const png = await svgToPng(renderSVG(day, { shirt: 'black', caption: 'The day you were born' }));
writeFileSync('out/full-print.png', png);
console.log('full print', png.length, 'bytes', `${Date.now() - full}ms`);
