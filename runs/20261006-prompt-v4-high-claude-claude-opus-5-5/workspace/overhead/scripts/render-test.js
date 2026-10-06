// Renders a sample print file locally: node scripts/render-test.js [out.png] [shirtHex]
import fs from 'node:fs';
import { svgToPng } from '../lib/raster.js';
import { renderSVG, validateDesign } from '../public/shared/render.js';
import { getFonts } from '../lib/fonts.js';

const fonts = getFonts();
const design = validateDesign({
  lat: 40.7128, lon: -74.006, t: Date.UTC(2019, 5, 22, 2, 30),
  headline: 'The night we met', place: 'New York City, USA', dateLine: '21 June 2019 · 10:30 PM',
  coords: '40.7128° N · 74.0060° W', ink: process.argv[4] || 'starlight', names: true, ecliptic: true,
}, fonts);
let t0 = Date.now();
const { svg, sky } = renderSVG(design, fonts, { background: process.argv[3] });
console.log('svg bytes', svg.length, 'stars', sky.stars.length, 'planets', sky.planets.map((p) => p[0]), 'moon', sky.moon, 'sunAlt', sky.sunAlt.toFixed(1), 'ms', Date.now() - t0);
t0 = Date.now();
const png = await svgToPng(svg);
fs.writeFileSync(process.argv[2] || '/tmp/overhead-test.png', png);
console.log('png bytes', png.length, 'ms', Date.now() - t0);
