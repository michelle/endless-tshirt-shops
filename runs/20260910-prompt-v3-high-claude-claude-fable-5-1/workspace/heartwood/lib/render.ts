import path from "node:path";
import { Resvg } from "@resvg/resvg-js";
import { Design, renderRings, VIEW } from "./rings";

/**
 * Server-side rasterisation with resvg. Fonts are bundled so output is identical on
 * every machine (Vercel functions have no system fonts).
 */

const FONT_DIR = path.join(process.cwd(), "assets", "fonts");
const FONT_FILES = [
  "LibreBaskerville-Regular.ttf",
  "LibreBaskerville-Bold.ttf",
  "LibreBaskerville-Italic.ttf",
  "IBMPlexSans-Regular.ttf",
  "IBMPlexSans-Medium.ttf",
  "IBMPlexSans-SemiBold.ttf",
].map((f) => path.join(FONT_DIR, f));

const fontOpts = {
  loadSystemFonts: false,
  fontFiles: FONT_FILES,
  defaultFontFamily: "IBM Plex Sans",
  serifFamily: "Libre Baskerville",
  sansSerifFamily: "IBM Plex Sans",
};

/**
 * Prodigi front print area for GLOBAL-TEE-GIL-64000 (US lab): 4665 x 5844 px @ 300 dpi
 * (15.55" x 19.48"). We place an 11" wide design 1.2" below the top of the print area,
 * i.e. a classic large chest print, on a transparent background so only ink is printed.
 */
export const PRINT = { w: 4665, h: 5844, designW: 3300, top: 360 };

export function printSvg(design: Design, onDark: boolean): string {
  const scale = PRINT.designW / VIEW.w;
  const designH = Math.round(VIEW.h * scale);
  const x = Math.round((PRINT.w - PRINT.designW) / 2);
  const inner = renderRings(design, { onDark, nested: { x, y: PRINT.top, width: PRINT.designW, height: designH }, id: "print" }).svg;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${PRINT.w}" height="${PRINT.h}" viewBox="0 0 ${PRINT.w} ${PRINT.h}">${inner}</svg>`;
}

export function renderPrintPng(design: Design, onDark: boolean): Buffer {
  const svg = printSvg(design, onDark);
  const r = new Resvg(svg, { font: fontOpts, fitTo: { mode: "original" }, shapeRendering: 2, textRendering: 2 });
  return Buffer.from(r.render().asPng());
}

/** Small square-ish preview on the shirt colour, used for Stripe Checkout line items and emails. */
export function renderPreviewPng(design: Design, shirtHex: string, onDark: boolean, width = 720): Buffer {
  const pad = 60;
  const inner = renderRings(design, { onDark, nested: { x: pad, y: pad, width: VIEW.w, height: VIEW.h }, id: "prev" }).svg;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${VIEW.w + pad * 2}" height="${VIEW.h + pad * 2}" viewBox="0 0 ${VIEW.w + pad * 2} ${VIEW.h + pad * 2}"><rect width="100%" height="100%" fill="${shirtHex}"/>${inner}</svg>`;
  const r = new Resvg(svg, { font: fontOpts, fitTo: { mode: "width", value: width } });
  return Buffer.from(r.render().asPng());
}
