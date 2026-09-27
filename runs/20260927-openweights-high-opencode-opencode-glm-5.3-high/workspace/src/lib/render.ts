/**
 * Server-side rasterization of the artwork SVG to the 300-dpi print file,
 * with the bundled fonts (the same OFL fonts the site loads for previews).
 */

import { join } from "node:path";
import { existsSync } from "node:fs";
import { Resvg } from "@resvg/resvg-js";
import { buildArtworkSvg } from "./design";
import type { DesignSpec } from "./params";

const fontDir = join(process.cwd(), "public/fonts/static");
const fontFiles = [
  "CormorantGaramond-Light.ttf",
  "CormorantGaramond-Medium.ttf",
  "CormorantGaramond-SemiBold.ttf",
  "CormorantGaramond-RegularItalic.ttf",
  "CormorantGaramond-MediumItalic.ttf",
  "IBMPlexSans-Regular.ttf",
  "IBMPlexSans-Medium.ttf",
  "IBMPlexSans-SemiBold.ttf",
]
  .map((f) => join(fontDir, f))
  .filter((f) => existsSync(f));

/** Render the print PNG for a design spec (4677x5881, 300dpi, alpha). */
export function renderPrintPng(spec: DesignSpec): Buffer {
  const svg = buildArtworkSvg(spec);
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: 4677 },
    font: { fontFiles, loadSystemFonts: false },
  });
  return resvg.render().asPng();
}
