import { generateArt } from "../lib/art.js";
import sharp from "sharp";
import { writeFileSync } from "fs";

const words = process.argv.slice(2);
const samples = words.length
  ? words.map((w) => (w.includes(":") ? w.split(":") : [w, "ember"]))
  : [
      ["michelle", "ember"],
      ["michelle", "glacier"],
      ["tokyo", "ultraviolet"],
      ["grandma", "sunset"],
      ["echo", "moss"],
      ["river", "signal"],
      ["oliver", "paper"],
      ["luna", "glacier"],
    ];

for (const [w, p] of samples) {
  const { svg, edition, style } = generateArt(w, p);
  console.log(`${w}/${p}: style=${style} edition=${edition} svg=${(svg.length / 1024).toFixed(0)}KB`);
  const bg = p === "paper" ? "#f6f6f2" : "#1c1c1e";
  const png = await sharp(Buffer.from(svg), { density: 96 })
    .flatten({ background: bg })
    .resize(480)
    .png()
    .toBuffer();
  writeFileSync(`/private/var/folders/mq/v8s9bp2x5gg6gvywwjfszb8r0000gn/T/opencode/art-${w}-${p}.png`, png);
}

// Determinism check
const a = generateArt("michelle", "ember").svg;
const b = generateArt("michelle", "ember").svg;
console.log("deterministic:", a === b);

// Full print-size render perf test
const t0 = Date.now();
const { svg } = generateArt("perf-test", "ember");
const printPng = await sharp(Buffer.from(svg), { density: 96 })
  .resize(3120, 3860)
  .png()
  .toBuffer();
console.log(`print render: ${Date.now() - t0}ms, ${(printPng.length / 1024 / 1024).toFixed(1)}MB png`);
