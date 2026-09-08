// Server-only: rasterise the SVG artwork into a print-ready PNG.
import path from "node:path";
import { Resvg } from "@resvg/resvg-js";
import { Design } from "./design";
import { PRINT_W, starMapSvg } from "./starmap";

const FONT_DIR = path.join(process.cwd(), "public", "fonts");
const FONT_FILES = ["Marcellus-Regular.ttf", "Lato-Light.ttf", "Lato-Regular.ttf", "Lato-Bold.ttf"].map((f) =>
  path.join(FONT_DIR, f),
);

export function renderPrintPng(design: Design): Buffer {
  const svg = starMapSvg(design, { fullCanvas: true });
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: PRINT_W },
    background: "rgba(0,0,0,0)",
    font: { fontFiles: FONT_FILES, loadSystemFonts: false, defaultFontFamily: "Lato" },
    dpi: 300,
  });
  return Buffer.from(resvg.render().asPng());
}
