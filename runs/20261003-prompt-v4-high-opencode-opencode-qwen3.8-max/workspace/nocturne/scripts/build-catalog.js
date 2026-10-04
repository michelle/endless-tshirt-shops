// Builds lib/catalog.json from the HYG v4.1 star database.
// Keeps stars brighter than mag 5.0 with: ra (deg), dec (deg), mag, ci (B-V color index).
// Usage: node scripts/build-catalog.js /path/to/hygdata_v41.csv
const fs = require('fs');
const path = require('path');

const input = process.argv[2] || '/tmp/hyg.csv';
const out = path.join(__dirname, '..', 'lib', 'catalog.json');

const text = fs.readFileSync(input, 'utf8');
const lines = text.split('\n');
const header = parseLine(lines[0]);
const idx = {};
header.forEach((h, i) => (idx[h] = i));

function parseLine(line) {
  // simple CSV parser (fields may be quoted; no embedded newlines in HYG)
  const out = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; } else q = false;
      } else cur += c;
    } else if (c === '"') q = true;
    else if (c === ',') { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

const stars = [];
let skippedSol = 0;
for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  if (!line.trim()) continue;
  const f = parseLine(line);
  const proper = f[idx.proper];
  const mag = parseFloat(f[idx.mag]);
  if (proper === 'Sol') { skippedSol++; continue; } // never render the Sun from catalog coords
  if (!isFinite(mag) || mag > 6.2) continue;
  const ra = parseFloat(f[idx.ra]);
  const dec = parseFloat(f[idx.dec]);
  const ciRaw = f[idx.ci];
  const ci = ciRaw === '' ? null : parseFloat(ciRaw);
  if (!isFinite(ra) || !isFinite(dec)) continue;
  stars.push([
    +ra.toFixed(4),
    +dec.toFixed(3),
    +mag.toFixed(2),
    ci !== null && isFinite(ci) ? +ci.toFixed(3) : null,
  ]);
}

stars.sort((a, b) => a[2] - b[2]); // brightest first
fs.writeFileSync(out, JSON.stringify({ source: 'HYG v4.1 (astronexus/HYG-Database)', count: stars.length, stars }));
console.log(`wrote ${out}: ${stars.length} stars (skipped Sol x${skippedSol}), ${(fs.statSync(out).size / 1024).toFixed(0)} KB`);
