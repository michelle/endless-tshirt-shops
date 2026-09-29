// Builds src/data/sky.json from the d3-celestial catalog (BSD-3, (c) Olaf Frohn).
// Usage: node scripts/build-sky-data.mjs /path/to/d3-celestial/data
import fs from "node:fs";
import path from "node:path";

const dir = process.argv[2] || "/tmp/cel/package/data";
const read = (f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
const r2 = (n) => Math.round(n * 100) / 100;

const stars = read("stars.6.json")
  .features.filter((f) => f.properties.mag <= 6.0)
  .sort((a, b) => a.properties.mag - b.properties.mag)
  .flatMap((f) => [r2(f.geometry.coordinates[0]), r2(f.geometry.coordinates[1]), r2(f.properties.mag)]);

const lines = read("constellations.lines.json").features.map((f) => ({
  id: f.id,
  rank: Number(f.properties.rank),
  lines: f.geometry.coordinates.map((l) => l.flatMap(([ra, dec]) => [r2(ra), r2(dec)])),
}));

const names = read("constellations.json").features.map((f) => ({
  id: f.id,
  name: f.properties.name,
  rank: Number(f.properties.rank),
  at: f.geometry.coordinates.map(r2),
}));

fs.mkdirSync("src/data", { recursive: true });
fs.writeFileSync("src/data/sky.json", JSON.stringify({ stars, lines, names }));
console.log("stars", stars.length / 3, "constellations", lines.length, "bytes", fs.statSync("src/data/sky.json").size);
