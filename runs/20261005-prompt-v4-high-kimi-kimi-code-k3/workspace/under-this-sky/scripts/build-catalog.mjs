// Builds public/catalog.json from d3-celestial GeoJSON data.
// d3-celestial stores equatorial coords as [lon, lat] degrees with lon = -RA.
// We output true RA degrees. Stars filtered by magnitude.
import { readFileSync, writeFileSync } from 'node:fs';

const MAG_LIMIT = 5.0;
const r3 = (n) => Math.round(n * 1000) / 1000;
const toRa = (lon) => ((360 - (lon % 360)) % 360 + 360) % 360;

const starsRaw = JSON.parse(readFileSync(new URL('../data/stars.6.json', import.meta.url)));
const linesRaw = JSON.parse(readFileSync(new URL('../data/constellations.lines.json', import.meta.url)));
const namesRaw = JSON.parse(readFileSync(new URL('../data/constellations.json', import.meta.url)));

const stars = [];
for (const f of starsRaw.features) {
  const mag = f.properties.mag;
  if (mag > MAG_LIMIT) continue;
  const [lon, lat] = f.geometry.coordinates;
  const bv = parseFloat(f.properties.bv ?? '0');
  stars.push([r3(toRa(lon)), r3(lat), mag, r3(Number.isFinite(bv) ? bv : 0)]);
}

const lines = [];
for (const f of linesRaw.features) {
  for (const seg of f.geometry.coordinates) {
    lines.push(seg.map(([lon, lat]) => [r3(toRa(lon)), r3(lat)]));
  }
}

// constellation center points for optional labels
const centers = {};
for (const f of namesRaw.features) {
  const [lon, lat] = f.geometry.coordinates;
  centers[f.properties.name] = [r3(toRa(lon)), r3(lat)];
}

const out = { stars, lines, centers };
writeFileSync(new URL('../public/catalog.json', import.meta.url), JSON.stringify(out));
console.log(`stars: ${stars.length}, line segments: ${lines.length}, constellations: ${Object.keys(centers).length}`);
console.log(`catalog.json: ${JSON.stringify(out).length} bytes`);
