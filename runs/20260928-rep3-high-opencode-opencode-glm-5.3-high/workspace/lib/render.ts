// 4000 Fridays — print-file rendering (server only).
//
// Rasterises the exact same SVG the customer previewed at print resolution
// (4680x5790 = 15.6"x19.3" @ 300 DPI) with bundled OFL fonts so output is
// byte-identical across platforms and time.

import { Resvg } from "@resvg/resvg-js";
import * as fs from "node:fs";
import * as path from "node:path";
import { PRINT_HEIGHT_PX, PRINT_WIDTH_PX } from "./config";
import { DesignParams, renderDesignSVG } from "./design";

const FONT_FILES = [
  "fonts/ArchivoBlack-Regular.ttf",
  "fonts/SpaceMono-Regular.ttf",
  "fonts/SpaceMono-Bold.ttf",
];

function fontPaths(): string[] {
  const base = process.cwd();
  return FONT_FILES.map((f) => path.join(base, f));
}

export function renderPrintPNG(design: DesignParams): Buffer {
  const svg = renderDesignSVG(design);
  const resvg = new Resvg(svg, {
    fitTo: { mode: "original" },
    background: "rgba(0,0,0,0)", // transparent: DTG prints only the artwork
    font: {
      fontFiles: fontPaths(),
      loadSystemFonts: false,
      defaultFontFamily: "Space Mono",
      sansSerifFamily: "Archivo Black",
      serifFamily: "Space Mono",
    },
  });
  const png = resvg.render().asPng();
  if (resvg.width !== PRINT_WIDTH_PX || resvg.height !== PRINT_HEIGHT_PX) {
    // The SVG always carries explicit px dimensions, so this is a guard only.
    throw new Error(
      `unexpected render size ${resvg.width}x${resvg.height}, wanted ${PRINT_WIDTH_PX}x${PRINT_HEIGHT_PX}`
    );
  }
  return Buffer.from(png);
}
