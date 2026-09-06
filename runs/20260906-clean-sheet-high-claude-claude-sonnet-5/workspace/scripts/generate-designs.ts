// Generates print-ready design files and storefront mockups for every shirt.
// Run with: npm run generate:designs
//
// Outputs:
//   public/designs/<slug>.png  — full-bleed print file, matches Prodigi's
//                                required front print area resolution
//                                (4665x5844) for GLOBAL-TEE-GIL-64000.
//   public/mockups/<slug>.png  — design composited onto a tee silhouette,
//                                used as the product photo on the site.
import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { SHIRTS } from "../lib/shirts";
import { buildDesignSvg } from "../lib/design-svg";
import { buildGarmentSvg, GARMENT_W, GARMENT_H } from "../lib/mockup-svg";

const PRINT_W = 4665;
const PRINT_H = 5844;

const ROOT = path.join(__dirname, "..");
const DESIGNS_DIR = path.join(ROOT, "public", "designs");
const MOCKUPS_DIR = path.join(ROOT, "public", "mockups");

async function main() {
  await mkdir(DESIGNS_DIR, { recursive: true });
  await mkdir(MOCKUPS_DIR, { recursive: true });

  const garmentBuffer = await sharp(Buffer.from(buildGarmentSvg()))
    .resize(GARMENT_W, GARMENT_H)
    .png()
    .toBuffer();

  for (const shirt of SHIRTS) {
    const svg = buildDesignSvg(shirt);

    // Full-resolution print file for Prodigi.
    const printPath = path.join(DESIGNS_DIR, `${shirt.slug}.png`);
    await sharp(Buffer.from(svg)).resize(PRINT_W, PRINT_H).png().toFile(printPath);

    // Small design render used for compositing the storefront mockup.
    const chestWidth = 460;
    const chestHeight = Math.round((chestWidth * PRINT_H) / PRINT_W);
    const chestPng = await sharp(Buffer.from(svg))
      .resize(chestWidth, chestHeight)
      .png()
      .toBuffer();

    const left = Math.round((GARMENT_W - chestWidth) / 2);
    const top = 640;

    const mockupPath = path.join(MOCKUPS_DIR, `${shirt.slug}.png`);
    await sharp(garmentBuffer)
      .composite([{ input: chestPng, left, top }])
      .png()
      .toFile(mockupPath);

    console.log(`generated ${shirt.slug}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
