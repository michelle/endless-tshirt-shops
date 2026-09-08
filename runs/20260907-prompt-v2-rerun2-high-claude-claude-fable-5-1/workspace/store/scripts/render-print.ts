// Renders print-ready PNGs (300 DPI, transparent) and web SVGs for every design/ink combo.
// Run: npm run render
import { Resvg } from "@resvg/resvg-js";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PRODUCTS } from "../src/lib/catalog";
import { designSvg, printSvg, PRINT_W } from "../src/lib/designs";

const root = join(__dirname, "..");
const fonts = ["AlfaSlabOne-Regular.ttf", "SpaceMono-Bold.ttf", "SpaceMono-Regular.ttf"].map((f) =>
  join(root, "public/fonts", f),
);
const printDir = join(root, "public/print");
const svgDir = join(root, "public/designs");
mkdirSync(printDir, { recursive: true });
mkdirSync(svgDir, { recursive: true });

const only = process.argv[2];
const previewOnly = process.argv.includes("--preview");

for (const p of PRODUCTS) {
  if (only && !only.startsWith("--") && p.slug !== only) continue;
  for (const ink of ["light", "dark"] as const) {
    const svg = designSvg(p, { ink });
    writeFileSync(join(svgDir, `${p.slug}-${ink}.svg`), svg);

    // Small preview PNG for QA / social cards.
    const preview = new Resvg(designSvg(p, { ink, background: ink === "light" ? "#1c1c1e" : "#f5f4f0" }), {
      fitTo: { mode: "width", value: 600 },
      font: { fontFiles: fonts, loadSystemFonts: false },
    }).render();
    writeFileSync(join(svgDir, `${p.slug}-${ink}-preview.png`), preview.asPng());
    if (previewOnly) continue;

    const out = new Resvg(printSvg(p, ink), {
      fitTo: { mode: "width", value: PRINT_W },
      font: { fontFiles: fonts, loadSystemFonts: false },
      dpi: 300,
    }).render();
    const png = out.asPng();
    writeFileSync(join(printDir, `${p.slug}-${ink}.png`), png);
    console.log(`${p.slug}-${ink}: ${out.width}x${out.height} ${(png.length / 1e6).toFixed(2)} MB`);
  }
}
