import "server-only";
import fs from "node:fs";
import path from "node:path";
import { Resvg } from "@resvg/resvg-js";
import { designSvg, type Design } from "./design";
import { PRINT_WIDTH_PX } from "./catalog";

const fontDir = path.join(process.cwd(), "src", "fonts");
const fontFiles = ["SpaceMono-Regular.ttf", "SpaceMono-Bold.ttf"].map((f) => path.join(fontDir, f));

/** Rasterise a design to PNG. `width` in px; the full print file is 4677 px wide. Transparent unless `background` given. */
export function renderPng(design: Design, width = PRINT_WIDTH_PX, background?: string): Buffer {
  for (const f of fontFiles) if (!fs.existsSync(f)) throw new Error(`Missing font: ${f}`);
  const svg = designSvg(design, { fixedSize: true });
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: Math.max(64, Math.min(PRINT_WIDTH_PX, Math.floor(width))) },
    font: { fontFiles, loadSystemFonts: false, defaultFontFamily: "Space Mono" },
    background: background ?? "rgba(0,0,0,0)",
  });
  return Buffer.from(resvg.render().asPng());
}
