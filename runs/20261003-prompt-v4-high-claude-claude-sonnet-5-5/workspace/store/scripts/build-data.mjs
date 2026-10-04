// Builds compact data files from raw sources:
//   d3-celestial (BSD-3) stars + constellation lines, GeoNames cities5000 (CC BY 4.0).
// Usage: node scripts/build-data.mjs <rawDir>
import fs from "node:fs";
import path from "node:path";

const raw = process.argv[2] || "/tmp/skydata";
const out = path.join(process.cwd(), "data");
fs.mkdirSync(out, { recursive: true });

const norm = (d) => ((d % 360) + 360) % 360;

// Stars: [raDeg, decDeg, mag], brightest first, mag <= 5.6
const stars = JSON.parse(fs.readFileSync(path.join(raw, "stars.6.json"), "utf8"))
  .features.filter((f) => f.properties.mag <= 5.6)
  .map((f) => [
    +norm(f.geometry.coordinates[0]).toFixed(3),
    +f.geometry.coordinates[1].toFixed(3),
    +f.properties.mag.toFixed(2),
  ])
  .sort((a, b) => a[2] - b[2]);
fs.writeFileSync(path.join(out, "stars.json"), JSON.stringify(stars));
console.log("stars", stars.length);

// Constellation lines: array of polylines, each [[ra,dec],...]
const lines = [];
for (const f of JSON.parse(fs.readFileSync(path.join(raw, "constellations.lines.json"), "utf8")).features) {
  for (const poly of f.geometry.coordinates) {
    lines.push(poly.map(([ra, dec]) => [+norm(ra).toFixed(3), +dec.toFixed(3)]));
  }
}
fs.writeFileSync(path.join(out, "constellation-lines.json"), JSON.stringify(lines));
console.log("constellation polylines", lines.length);

// Cities
const countries = {};
for (const l of fs.readFileSync(path.join(raw, "countryInfo2.txt"), "utf8").split("\n")) {
  if (!l || l.startsWith("#")) continue;
  const p = l.split("\t");
  countries[p[0]] = p[4];
}
const admin1 = {};
for (const l of fs.readFileSync(path.join(raw, "admin1.txt"), "utf8").split("\n")) {
  if (!l) continue;
  const p = l.split("\t");
  admin1[p[0]] = p[2] || p[1];
}
const tzs = [];
const tzIdx = new Map();
const cities = [];
for (const l of fs.readFileSync(path.join(raw, "cities5000.txt"), "utf8").split("\n")) {
  if (!l) continue;
  const p = l.split("\t");
  const [, name, ascii, , lat, lon, , , cc, , a1, , , , pop, , , tz] = p;
  if (!tzIdx.has(tz)) { tzIdx.set(tz, tzs.length); tzs.push(tz); }
  cities.push([
    name,
    ascii,
    cc,
    admin1[`${cc}.${a1}`] || "",
    +(+lat).toFixed(3),
    +(+lon).toFixed(3),
    tzIdx.get(tz),
    +pop,
  ]);
}
cities.sort((a, b) => b[7] - a[7]);
fs.writeFileSync(path.join(out, "cities.json"), JSON.stringify({ tzs, countries, cities }));
console.log("cities", cities.length, "timezones", tzs.length);
