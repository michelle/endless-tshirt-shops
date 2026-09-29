import "server-only";
import path from "node:path";
import { Resvg } from "@resvg/resvg-js";

const FONT_DIR = path.join(process.cwd(), "public", "fonts");
const FONT_FILES = [
  "CormorantGaramond-SemiBold.ttf",
  "CormorantGaramond-MediumItalic.ttf",
  "Jost-Regular.ttf",
  "Jost-Medium.ttf",
].map((f) => path.join(FONT_DIR, f));

/** Rasterizes an SVG string to PNG at the given pixel width. */
export function svgToPng(svg: string, width: number): Buffer {
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: width },
    font: { fontFiles: FONT_FILES, loadSystemFonts: false, defaultFontFamily: "Jost" },
    shapeRendering: 2,
    textRendering: 1,
  });
  return resvg.render().asPng();
}
