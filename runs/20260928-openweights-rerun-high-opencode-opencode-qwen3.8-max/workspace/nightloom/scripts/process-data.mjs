// Processes raw astronomy/city/font data into compact assets for the Nightloom app.
import fs from 'node:fs';

const DIR = process.env.RAW_DIR || '/private/var/folders/mq/v8s9bp2x5gg6gvywwjfszb8r0000gn/T/opencode';
const OUT = process.argv[2] || `${DIR}/out-data`;
fs.mkdirSync(OUT, { recursive: true });

// ---------- tiny CSV line parser (handles quoted fields) ----------
function parseLine(line) {
  const out = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; } else inQ = false;
      } else cur += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

// ---------- HYG star catalog ----------
const hyg = fs.readFileSync(`${DIR}/hyg.csv`, 'utf8');
const lines = hyg.split('\n');
const header = parseLine(lines[0]);
const idx = {};
header.forEach((h, i) => (idx[h] = i));
console.log('HYG columns:', header.join(','));

const MAG_LIMIT = 5.6;
const abbrs = [];
const abbrIx = {};
const stars = [];
const names = {}; // hip -> proper name (bright named stars only)
let total = 0;
for (let li = 1; li < lines.length; li++) {
  const line = lines[li];
  if (!line) continue;
  total++;
  const f = parseLine(line);
  const mag = parseFloat(f[idx.mag]);
  if (!isFinite(mag) || mag > MAG_LIMIT || mag < -10) continue; // mag< -10 drops the Sun
  const raHours = parseFloat(f[idx.ra]); // HYG v4.1 `ra` is in HOURS
  const ra = raHours * 15;               // -> degrees
  const dec = parseFloat(f[idx.dec]);    // degrees
  if (!isFinite(ra) || !isFinite(dec)) continue;
  let ci = parseFloat(f[idx.ci]);
  if (!isFinite(ci)) ci = 0;
  ci = Math.max(-0.6, Math.min(2.2, ci));
  const hipRaw = f[idx.hip];
  const hip = hipRaw ? parseInt(hipRaw, 10) : 0;
  const con = f[idx.con] || '';
  let conIx = -1;
  if (con) {
    if (!(con in abbrIx)) { abbrIx[con] = abbrs.length; abbrs.push(con); }
    conIx = abbrIx[con];
  }
  stars.push([
    Math.round(ra * 100),
    Math.round(dec * 100),
    Math.round(mag * 100),
    Math.round(ci * 100),
    hip || 0,
    conIx,
  ]);
  const proper = f[idx.proper] || '';
  if (proper && mag <= 3.9 && hip) names[hip] = proper;
}
console.log(`HYG rows=${total} kept(mag<=${MAG_LIMIT})=${stars.length} named=${Object.keys(names).length} abbrs=${abbrs.length}`);

// ---------- constellation lines ----------
const ship = fs.readFileSync(`${DIR}/constellationship.fab`, 'utf8');
const lineSegs = [];
const seen = new Set();
for (const l of ship.split('\n')) {
  const t = l.trim();
  if (!t || t.startsWith('#')) continue;
  const parts = t.split(/\s+/);
  const abbr = parts[0];
  const n = parseInt(parts[1], 10);
  if (!(abbr in abbrIx)) { abbrIx[abbr] = abbrs.length; abbrs.push(abbr); }
  const conIx = abbrIx[abbr];
  const hips = parts.slice(2, 2 + n * 2).map(Number);
  for (let i = 0; i + 1 < hips.length; i += 2) {
    const a = hips[i], b = hips[i + 1];
    if (!a || !b) continue;
    const key = a < b ? `${a}-${b}` : `${b}-${a}`;
    if (seen.has(key)) continue;
    seen.add(key);
    lineSegs.push([a, b, conIx]);
  }
}
console.log('constellation segments:', lineSegs.length);

// ---------- constellation names ----------
const cnamesRaw = fs.readFileSync(`${DIR}/constellation_names.eng.fab`, 'utf8');
const constellationNames = {};
for (const l of cnamesRaw.split('\n')) {
  const t = l.trim();
  if (!t || t.startsWith('#')) continue;
  const parts = t.split('\t');
  if (parts.length < 2) continue;
  const abbr = parts[0].trim();
  const m = parts[1].match(/"([^"]+)"/);
  if (m) constellationNames[abbr] = m[1];
}
console.log('constellation names:', Object.keys(constellationNames).length);

fs.writeFileSync(`${OUT}/stars.json`, JSON.stringify({ abbrs, stars, names }));
fs.writeFileSync(`${OUT}/constellations.json`, JSON.stringify({ names: constellationNames, segments: lineSegs }));

// ---------- cities ----------
const citiesRaw = fs.readFileSync(`${DIR}/cities15000.txt`, 'utf8');
const cities = [];
for (const l of citiesRaw.split('\n')) {
  const f = l.split('\t');
  if (f.length < 15) continue;
  const name = f[1];
  const lat = parseFloat(f[4]);
  const lon = parseFloat(f[5]);
  const cc = f[8];
  const pop = parseInt(f[14], 10);
  if (!name || !isFinite(lat) || !isFinite(lon) || !cc || !isFinite(pop)) continue;
  if (pop < 105000) continue;
  cities.push([name, cc, Math.round(lat * 1000), Math.round(lon * 1000), pop]);
}
cities.sort((a, b) => b[4] - a[4]);
const top = cities.slice(0, 2600);
console.log('cities kept:', top.length, 'smallest pop:', top[top.length - 1][4]);
fs.writeFileSync(`${OUT}/cities.json`, JSON.stringify(top));

// ---------- fonts ----------
const fonts = {
  cinzel400: fs.readFileSync(`${DIR}/cinzel400.ttf`),
  cinzel700: fs.readFileSync(`${DIR}/cinzel700.ttf`),
  plexMono: fs.readFileSync(`${DIR}/PlexMono.ttf`),
  plexMonoLight: fs.readFileSync(`${DIR}/PlexMono-Light.ttf`),
};
let fontsTs = '// Generated by scripts/process-data.mjs — OFL-licensed fonts (Cinzel, IBM Plex Mono) embedded for server-side SVG rendering.\n';
for (const [k, buf] of Object.entries(fonts)) {
  fontsTs += `export const ${k} = Buffer.from('${buf.toString('base64')}', 'base64');\n`;
}
fs.writeFileSync(`${OUT}/fonts.ts`, fontsTs);

// copy raw TTFs for the browser @font-face
fs.mkdirSync(`${OUT}/public-fonts`, { recursive: true });
fs.copyFileSync(`${DIR}/cinzel400.ttf`, `${OUT}/public-fonts/Cinzel-Regular.ttf`);
fs.copyFileSync(`${DIR}/cinzel700.ttf`, `${OUT}/public-fonts/Cinzel-Bold.ttf`);
fs.copyFileSync(`${DIR}/PlexMono.ttf`, `${OUT}/public-fonts/IBMPlexMono-Regular.ttf`);
fs.copyFileSync(`${DIR}/PlexMono-Light.ttf`, `${OUT}/public-fonts/IBMPlexMono-Light.ttf`);

for (const f of ['stars.json', 'constellations.json', 'cities.json', 'fonts.ts']) {
  const st = fs.statSync(`${OUT}/${f}`);
  console.log(f, (st.size / 1024).toFixed(1) + 'KB');
}
console.log('DONE ->', OUT);
