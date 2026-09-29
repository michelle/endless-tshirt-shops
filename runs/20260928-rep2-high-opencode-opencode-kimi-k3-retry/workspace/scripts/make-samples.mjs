// Pre-generates landing-page sample artwork into public/samples/.
// Run: node scripts/make-samples.mjs
import { generateArt } from "../lib/art.js";
import sharp from "sharp";
import { mkdirSync, writeFileSync } from "fs";

const SAMPLES = [
  ["stardust", "ultraviolet", "#1c1c1e"],
  ["marina", "glacier", "#1f2a44"],
  ["ember days", "ember", "#232323"],
  ["wildwood", "moss", "#232323"],
  ["golden hour", "sunset", "#1c1c1e"],
  ["mono", "signal", "#232323"],
  ["fieldnotes", "paper", "#f6f6f2"],
  ["supernova", "ultraviolet", "#232323"],
];

mkdirSync("public/samples", { recursive: true });
const manifest = [];
for (const [word, paletteId, bg] of SAMPLES) {
  const { svg, edition, style, palette } = generateArt(word, paletteId);
  const buf = await sharp(Buffer.from(svg), { density: 96 })
    .flatten({ background: bg })
    .resize(760, 940, { fit: "fill" })
    .webp({ quality: 82 })
    .toBuffer();
  const file = `public/samples/${word.replace(/\W+/g, "-")}-${paletteId}.webp`;
  writeFileSync(file, buf);
  manifest.push({ word, palette: paletteId, name: palette.name, edition, style, file: file.replace("public", "") });
  console.log(`${file} ${(buf.length / 1024).toFixed(0)}KB (${style})`);
}
writeFileSync("public/samples/manifest.json", JSON.stringify(manifest, null, 2));
console.log("done");
