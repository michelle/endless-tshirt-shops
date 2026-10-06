// Renders the gallery samples to public/samples/*.png — flat print previews.
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { getTerrain } from '../lib/terrarium.mjs';
import { renderDesignSVG } from '../public/design.js';
import { renderSvgToPng } from '../lib/svgtopng.mjs';
import { shirtSVG } from '../public/shirt.js';

const OUT = path.resolve(process.cwd(), 'public/samples');
mkdirSync(OUT, { recursive: true });

const SAMPLES = [
  { file: 'matterhorn', title: 'The Matterhorn', place: 'Zermatt, Switzerland', lat: 45.9763, lng: 7.6586, extent: 'massif', colorKey: 'black', sizeKey: 'l' },
  { file: 'rainier', title: 'Mount Rainier', place: 'Washington, United States', lat: 46.8523, lng: -121.7603, extent: 'region', colorKey: 'white', sizeKey: 'l' },
  { file: 'dolomites', title: 'Tre Cime', place: 'Dolomiti, Italia', lat: 46.6183, lng: 12.3050, extent: 'valley', colorKey: 'cream', sizeKey: 'l' },
  { file: 'mauna-kea', title: 'Mauna Kea', place: 'Hawaiʻi, United States', lat: 19.8207, lng: -155.4681, extent: 'region', colorKey: 'military-green', sizeKey: 'l' },
];

for (const s of SAMPLES) {
  const km = { intimate: 2.5, valley: 6, massif: 15, region: 40 }[s.extent];
  const terrain = await getTerrain(s.lat, s.lng, km);
  const design = { ...s, extentKm: km };
  const { svg } = renderDesignSVG(design, terrain, { width: 1240 });
  const png = await renderSvgToPng(svg, { width: 1240 });
  writeFileSync(path.join(OUT, s.file + '.png'), png);
  console.log(s.file, '→', terrain.lines.length, 'lines · hi', terrain.hiElev, 'm · interval', terrain.interval);
}
console.log('samples written to', OUT);
