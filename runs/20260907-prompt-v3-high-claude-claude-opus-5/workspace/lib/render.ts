import fs from "node:fs";
import path from "node:path";
import { Resvg } from "@resvg/resvg-js";
import type { Cryptid } from "./genome";
import type { Ink } from "./catalog";
import { PRINT_AREA } from "./catalog";
import { printSvg } from "./art/plate";

const FONT_FILES = [
  "OldStandard-Regular.ttf",
  "OldStandard-Italic.ttf",
  "OldStandard-Bold.ttf",
  "BebasNeue-Regular.ttf",
  "SpaceMono-Regular.ttf",
  "SpaceMono-Bold.ttf",
];

let cachedPaths: string[] | null = null;

/** resvg only takes file paths, so the fonts must be traced into the
 *  serverless bundle — see outputFileTracingIncludes in next.config.ts. */
function fontFiles(): string[] {
  if (cachedPaths) return cachedPaths;
  const dir = path.join(process.cwd(), "public", "fonts");
  const found = FONT_FILES.map((f) => path.join(dir, f)).filter((p) => fs.existsSync(p));
  if (found.length !== FONT_FILES.length) {
    console.error("[render] missing font files", {
      dir,
      expected: FONT_FILES.length,
      found: found.length,
    });
  }
  cachedPaths = found;
  return found;
}

export function rasterize(svg: string, width: number): Buffer {
  const resvg = new Resvg(svg, {
    background: "rgba(0,0,0,0)",
    fitTo: { mode: "width", value: width },
    font: {
      fontFiles: fontFiles(),
      loadSystemFonts: false,
      defaultFontFamily: "Old Standard TT",
      serifFamily: "Old Standard TT",
      monospaceFamily: "Space Mono",
      sansSerifFamily: "Bebas Neue",
    },
    shapeRendering: 2,
    textRendering: 2,
    imageRendering: 0,
  });
  return Buffer.from(resvg.render().asPng());
}

/** The file Prodigi downloads: full print area, transparent background. */
export function renderPrintPng(c: Cryptid, ink: Ink): Buffer {
  return rasterize(printSvg(c, ink), PRINT_AREA.width);
}
