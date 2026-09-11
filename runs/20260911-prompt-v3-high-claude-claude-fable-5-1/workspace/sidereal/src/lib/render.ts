import fs from "node:fs";
import path from "node:path";
import { Resvg } from "@resvg/resvg-js";
import { buildSkyMapSvg } from "./skymap";
import type { Design } from "./design";

// Print-area resolution for GLOBAL-TEE-BC-3001 (front) as reported by Prodigi.
export const PRINT_WIDTH = 4680;
export const PRINT_HEIGHT = 5790;

let fontCache: string[] | null = null;
/** Absolute paths of the bundled fonts (see outputFileTracingIncludes in next.config.ts). */
function fontFiles(): string[] {
  if (fontCache) return fontCache;
  const dir = path.join(process.cwd(), "assets", "fonts");
  fontCache = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".ttf"))
    .map((f) => path.join(dir, f));
  return fontCache;
}

/** Rasterise a design to PNG at the given pixel width. Transparent by default (print). */
export function renderPng(design: Design, width = PRINT_WIDTH, opts: { transparent?: boolean } = {}): Buffer {
  // The output size is set on the SVG root rather than via `fitTo`.
  const svg = buildSkyMapSvg(design, { caption: true, transparent: opts.transparent ?? true, width });
  const resvg = new Resvg(svg, {
    fitTo: { mode: "original" },
    font: {
      loadSystemFonts: false,
      fontFiles: fontFiles(),
      serifFamily: "Cormorant Garamond",
      monospaceFamily: "Space Mono",
      defaultFontFamily: "Space Mono",
    },
    shapeRendering: 2,
    textRendering: 2,
  });
  return resvg.render().asPng();
}
