#!/usr/bin/env node
// Builds data/stars.json from the HYG stellar database (v40).
// Source: https://github.com/astronexus/HYG-Database (CC-BY-SA 4.0)
// Usage: node scripts/build-catalog.mjs [path-to-hygdata.csv.gz]
// If no path is given, the file is downloaded to a temp location first.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const SOURCE_URL =
  'https://raw.githubusercontent.com/astronexus/HYG-Database/main/hyg/CURRENT/hygdata_v40.csv.gz';

let gzPath = process.argv[2];
if (!gzPath || !existsSync(gzPath)) {
  gzPath = join(os.tmpdir(), 'hygdata_v40.csv.gz');
  if (!existsSync(gzPath)) {
    console.log(`downloading ${SOURCE_URL} -> ${gzPath}`);
    execFileSync('curl', ['-sSL', '-o', gzPath, SOURCE_URL], { stdio: 'inherit' });
  }
}
console.log(`reading ${gzPath}`);
const csv = execFileSync('gunzip', ['-c', gzPath], { maxBuffer: 1024 * 1024 * 512 })
  .toString('utf8');

const lines = csv.split('\n');
const header = parseCsvLine(lines[0]);
const col = Object.fromEntries(header.map((h, i) => [h, i]));

function parseCsvLine(line) {
  const out = [];
  let cur = '', inQ = false;
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

// Keep stars bright enough to matter on a shirt: mag <= 5.0, plus any
// traditionally-named star up to mag 6.0 (faint named stars get labelled).
const stars = [];
let count = 0;
for (let li = 1; li < lines.length; li++) {
  const line = lines[li];
  if (!line) continue;
  count++;
  const f = parseCsvLine(line);
  const id = parseInt(f[col.id], 10);
  if (id === 0) continue; // Sol
  const mag = parseFloat(f[col.mag]);
  const ra = parseFloat(f[col.ra]); // hours
  const dec = parseFloat(f[col.dec]); // degrees
  if (!isFinite(mag) || !isFinite(ra) || !isFinite(dec)) continue;
  const proper = (f[col.proper] || '').trim();
  if (mag > 5.5 && !(proper && mag <= 6.5)) continue;
  const ciRaw = f[col.ci];
  const ci = ciRaw === '' || ciRaw === undefined ? null : parseFloat(ciRaw);
  stars.push([
    parseInt(f[col.hip], 10) || 0,          // 0 hip
    (f[col.bf] || '').trim(),               // 1 bayer/flamsteed
    proper,                                 // 2 proper name
    round(ra, 5),                           // 3 RA (hours, J2000)
    round(dec, 4),                          // 4 Dec (deg, J2000)
    round(mag, 2),                          // 5 magnitude
    isFinite(ci) ? round(ci, 3) : null,     // 6 colour index B-V
    (f[col.con] || '').trim(),              // 7 constellation
  ]);
}
stars.sort((a, b) => a[5] - b[5]);

function round(x, p) { const m = Math.pow(10, p); return Math.round(x * m) / m; }

mkdirSync(join(root, 'data'), { recursive: true });
const out = join(root, 'data', 'stars.json');
writeFileSync(out, JSON.stringify({ source: 'HYG v4.0 (CC-BY-SA 4.0)', stars }));
console.log(`parsed ${count} rows, kept ${stars.length} stars -> ${out}`);

// Resolve constellation line endpoints (bf designations) to HIP ids and
// write data/constellation-lines.json, so the app never has to parse bf.
const conFile = join(root, 'data', 'constellations.json');
if (existsSync(conFile)) {
  const cons = JSON.parse(readFileSync(conFile, 'utf8'));
  // Normalise "58Alp Ori" / "32Mu  Ser" / "Alp1Cen" -> "AlpOri" / "MuSer" / "Alp1Cen"
  const norm = (bf) => bf.replace(/^\d+/, '').replace(/\s+/g, '');
  const byKey = new Map();
  for (const s of stars) {
    if (!s[1]) continue;
    const key = norm(s[1]);
    // Prefer the base component ("AlpCen" over "Alp2Cen") and brighter star.
    const prev = byKey.get(key);
    if (!prev || s[5] < prev[5]) byKey.set(key, s);
    // Also index without the component number so "Alp Cen" finds "Alp1Cen".
    const base = key.replace(/(\d)(?=[A-Z][a-z]{2}$)/, '');
    if (base !== key) {
      const prevB = byKey.get(base);
      if (!prevB || s[5] < prevB[5]) byKey.set(base, s);
    }
  }
  const outCons = [];
  let missing = 0;
  for (const c of cons.constellations) {
    const lines = [];
    for (const [a, b] of c.lines) {
      const sa = byKey.get(norm(a)), sb = byKey.get(norm(b));
      if (!sa || !sb) {
        console.log(`MISSING ${!sa ? a : ''}${!sa && !sb ? ' + ' : ''}${!sb ? b : ''} (${c.name})`);
        missing++;
        continue;
      }
      lines.push([sa[0], sb[0]]);
    }
    if (lines.length) outCons.push({ name: c.name, lines });
  }
  writeFileSync(
    join(root, 'data', 'constellation-lines.json'),
    JSON.stringify({ constellations: outCons })
  );
  console.log(
    missing === 0
      ? `constellation lines: all resolved (${outCons.length} constellations)`
      : `${missing} unresolved endpoints (${outCons.length} constellations kept)`
  );
}
