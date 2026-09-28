import "server-only";
import path from "node:path";
import { Resvg } from "@resvg/resvg-js";
import { Design } from "./design";
import { PRINT_W, plateSvg } from "./specimen";
import { mockupSvg } from "./mockup";

const FONT_DIR = path.join(process.cwd(), "public", "fonts");
const FONT_FILES = ["EBGaramond.ttf", "EBGaramond-Italic.ttf", "IBMPlexMono-Regular.ttf", "IBMPlexMono-Medium.ttf"].map((f) =>
  path.join(FONT_DIR, f),
);

function rasterize(svg: string, width: number, background?: string): Buffer {
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: width },
    background,
    font: { fontFiles: FONT_FILES, loadSystemFonts: false, defaultFontFamily: "EB Garamond" },
    shapeRendering: 2,
    textRendering: 2,
  });
  return resvg.render().asPng();
}

/** Print-ready, transparent PNG at the full Prodigi front print area (4680 x 5790). */
export function renderPrintPng(design: Design): Buffer {
  return rasterize(plateSvg(design, { uid: "p" }), PRINT_W);
}

/** Shirt mockup PNG for Stripe Checkout / order pages. */
export function renderMockupPng(design: Design, width = 800): Buffer {
  return rasterize(mockupSvg(design, { uid: "m" }), width, "#f3efe6");
}
