import "server-only";
import path from "node:path";
import { Resvg } from "@resvg/resvg-js";
import { PRINT_W, renderSvg } from "./chart";
import { SHIRTS, type Design } from "./design";

const FONT_DIR = path.join(process.cwd(), "public", "fonts");
const FONTS = [
  "CormorantGaramond-Medium.ttf",
  "CormorantGaramond-SemiBold.ttf",
  "CormorantGaramond-MediumItalic.ttf",
  "Jost-Regular.ttf",
  "Jost-Medium.ttf",
].map((f) => path.join(FONT_DIR, f));

/** Rasterises the design to a transparent PNG at print resolution (or a smaller width for previews). */
export function renderPng(design: Design, width = PRINT_W, onFabric = false): Buffer {
  const { svg } = renderSvg(design);
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: width },
    background: onFabric ? SHIRTS[design.shirt].fabric : undefined,
    font: { fontFiles: FONTS, loadSystemFonts: false, defaultFontFamily: "Jost" },
    shapeRendering: 2,
    textRendering: 1,
  });
  return resvg.render().asPng();
}
