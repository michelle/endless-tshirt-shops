// Rasterizes each badge design (see lib/badge.mjs) into the PNG assets the
// site actually uses:
//   public/art/<slug>-preview.png  – on-site product art (transparent bg)
//   public/art/<slug>-print.png    – high-res print file handed to Prodigi
//
// Run with: npm run generate:art

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { DESIGNS } from "../lib/designs";
import { buildBadgeSvg } from "../lib/badge.mjs";

const OUT_DIR = path.join(process.cwd(), "public", "art");

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  for (const design of DESIGNS) {
    const svg = buildBadgeSvg(design);
    const svgBuffer = Buffer.from(svg);

    // Site preview: modest size, transparent background, sharp edges.
    const preview = await sharp(svgBuffer, { density: 220 })
      .resize(1200, 1200)
      .png()
      .toBuffer();
    await writeFile(path.join(OUT_DIR, `${design.slug}-preview.png`), preview);

    // Print asset for Prodigi (GLOBAL-TEE-GIL-64000 front print area is
    // 4665x5844px for US-fulfilled orders; we ship a square logo and let
    // Prodigi's "fitPrintArea" sizing center it on the chest).
    const print = await sharp(svgBuffer, { density: 400 })
      .resize(3600, 3600)
      .png()
      .toBuffer();
    await writeFile(path.join(OUT_DIR, `${design.slug}-print.png`), print);

    console.log(`generated art for ${design.slug}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
