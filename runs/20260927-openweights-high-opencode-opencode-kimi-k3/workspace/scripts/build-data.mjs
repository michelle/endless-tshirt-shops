// Builds compact embedded data modules from raw catalogs fetched at setup time:
//   - src/data/stars.ts          (Yale Bright Star Catalog subset, mag <= 5.0)
//   - src/data/constellations.ts (d3-celestial constellation line work)
//   - src/data/cities.ts         (GeoNames cities15000, pop >= 150k or capitals)
//   - src/data/countries.ts      (ISO code -> country name)
//   - src/data/font.ts           (Marcellus-Regular.ttf as base64)
// Raw sources live in ./data-raw (git-ignored except license notes).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const RAW = new URL('../data-raw/', import.meta.url).pathname;
const OUT = new URL('../src/data/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

// ---------- stars ----------
// bsc5-short.json fields: RA "00h 05m 09.9s", Dec "+45° 13′ 45″", V magnitude
const bsc = JSON.parse(readFileSync(RAW + 'bsc5-short.json', 'utf8'));
function parseRA(s) {
  const m = s.match(/(\d+)h\s*(\d+)m\s*([\d.]+)s/);
  if (!m) return null;
  return (+m[1] + +m[2] / 60 + +m[3] / 3600); // hours
}
function parseDec(s) {
  const m = s.match(/([+-])(\d+)°\s*(\d+)[′']\s*([\d.]+)[″"]/);
  if (!m) return null;
  const v = +m[2] + +m[3] / 60 + +m[4] / 3600;
  return m[1] === '-' ? -v : v;
}
const stars = [];
for (const row of bsc) {
  const mag = parseFloat(row.V);
  if (!Number.isFinite(mag) || mag > 5.5) continue;
  const ra = parseRA(row.RA);
  const dec = parseDec(row.Dec);
  if (ra === null || dec === null) continue;
  stars.push([+ra.toFixed(4), +dec.toFixed(3), Math.round(mag * 10)]);
}
writeFileSync(
  OUT + 'stars.ts',
  `// Generated from the Yale Bright Star Catalog (bsc5-short.json, github.com/brettonw/YaleBrightStarCatalog)\n` +
    `// Tuples: [rightAscensionHours, declinationDegrees, magnitudeTimes10]\n` +
    `export const STARS: [number, number, number][] = ${JSON.stringify(stars)};\n`
);
console.log('stars:', stars.length);

// ---------- constellation lines ----------
// d3-celestial constellations.lines.json: RA degrees in [-180,180], Dec degrees
const cons = JSON.parse(readFileSync(RAW + 'constellations.lines.json', 'utf8'));
const lines = [];
for (const f of cons.features) {
  for (const seg of f.geometry.coordinates) {
    const flat = [];
    for (const [raDeg, dec] of seg) {
      let ra = raDeg < 0 ? raDeg + 360 : raDeg;
      flat.push(+(ra / 15).toFixed(4), +dec.toFixed(3));
    }
    lines.push(flat);
  }
}
writeFileSync(
  OUT + 'constellations.ts',
  `// Generated from d3-celestial constellations.lines.json (github.com/ofrohn/d3-celestial, MIT)\n` +
    `// Each entry is one polyline: [raHours1, decDeg1, raHours2, decDeg2, ...]\n` +
    `export const CONSTELLATION_LINES: number[][] = ${JSON.stringify(lines)};\n`
);
console.log('constellation polylines:', lines.length);

// ---------- cities ----------
// geonames cities15000.txt, tab separated. Keep pop >= 150000 or PPLC (capital).
const countries = new Map();
for (const line of readFileSync(RAW + 'countryInfo.txt', 'utf8').split('\n')) {
  if (!line || line.startsWith('#')) continue;
  const c = line.split('\t');
  if (c.length > 4) countries.set(c[0], c[4]);
}
writeFileSync(
  OUT + 'countries.ts',
  `// ISO 3166-1 alpha-2 -> country name (GeoNames countryInfo.txt)\n` +
    `export const COUNTRIES: Record<string, string> = ${JSON.stringify(Object.fromEntries(countries))};\n`
);

const seen = new Set();
const cities = [];
for (const line of readFileSync(RAW + 'cities15000.txt', 'utf8').split('\n')) {
  if (!line) continue;
  const c = line.split('\t');
  const pop = +c[14];
  const code = c[7];
  if (!(pop >= 250000 || code === 'PPLC')) continue;
  const name = c[2]; // ascii name
  const cc = c[8];
  const key = name.toLowerCase() + '|' + cc + '|' + c[10];
  if (seen.has(key)) continue;
  seen.add(key);
  cities.push({
    n: name,
    c: cc,
    la: +(+c[4]).toFixed(4),
    lo: +(+c[5]).toFixed(4),
    tz: c[17],
    p: pop,
  });
}
cities.sort((a, b) => b.p - a.p);
writeFileSync(
  OUT + 'cities.ts',
  `// GeoNames cities15000 (creativecommons.org/licenses/by/4.0/): cities with population >= 150k, plus all capitals.\n` +
    `export interface City { n: string; c: string; la: number; lo: number; tz: string; p: number }\n` +
    `export const CITIES: City[] = ${JSON.stringify(cities)};\n`
);
console.log('cities:', cities.length, 'countries:', countries.size);

// ---------- font ----------
const font = readFileSync(RAW + 'Marcellus-Regular.ttf');
writeFileSync(
  OUT + 'font.ts',
  `// Marcellus Regular (SIL Open Font License 1.1, see data-raw/Marcellus-OFL.txt), base64-encoded TTF.\n` +
    `export const FONT_B64 =\n  '${font.toString('base64')}';\n`
);
console.log('font bytes:', font.length);
