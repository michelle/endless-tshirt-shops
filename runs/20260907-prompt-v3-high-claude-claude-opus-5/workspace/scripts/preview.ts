/* Dev-only contact sheet: renders a grid of plates so the generator can be
   reviewed by eye. Run with: npx tsx scripts/preview.ts */
import fs from "node:fs";
import { normalizeSpec, TEMPERAMENT_IDS } from "../lib/spec";
import { generateCryptid } from "../lib/genome";
import { plateSvg } from "../lib/art/plate";
import { rasterize } from "../lib/render";

const samples = [
  { keeper: "Michael", place: "Brooklyn, NY", hour: 3, appetite: "unsent text messages", temperament: "mischievous" },
  { keeper: "Priya", place: "Bangalore", hour: 2, appetite: "browser tabs", temperament: "devoted" },
  { keeper: "Ana Sofia", place: "Lisbon", hour: 23, appetite: "the crust of the bread", temperament: "melancholic" },
  { keeper: "Wes", place: "Marfa, Texas", hour: 4, appetite: "cold pizza at 3am", temperament: "feral" },
  { keeper: "Nour", place: "Amman", hour: 1, appetite: "other people's playlists", temperament: "skittish" },
  { keeper: "Ingrid", place: "Reykjavik", hour: 5, appetite: "expired coupons", temperament: "vengeful" },
  { keeper: "Tomas", place: "Kraków", hour: 22, appetite: "single socks", temperament: "mischievous" },
  { keeper: "Dee", place: "New Orleans", hour: 0, appetite: "second-hand embarrassment", temperament: "devoted" },
  { keeper: "Yusuf", place: "Istanbul", hour: 3, appetite: "half-finished novels", temperament: "melancholic" },
];

const out = process.argv[2] ?? "/tmp/plates";
fs.mkdirSync(out, { recursive: true });

samples.forEach((s, i) => {
  const spec = normalizeSpec(s as never);
  const c = generateCryptid(spec);
  const ink = i % 3 === 2 ? "coal" : "bone";
  const bg = ink === "coal" ? "#EAE1CD" : "#1A1A1C";
  const svg = plateSvg(c, ink, `s${i}`);
  const doc = svg.replace(
    /(viewBox="[^"]*"[^>]*>)/,
    `$1<rect width="1200" height="1600" fill="${bg}"/>`
  );
  fs.writeFileSync(`${out}/plate-${i}.png`, rasterize(doc, 620));
  console.log(
    `${i}\t${c.genome.archetype}\t${c.genome.palette.name}\t${c.commonName} — ${c.binomial}`
  );
});
console.log("archetype coverage check:", TEMPERAMENT_IDS.join(","));
