import { access } from "node:fs/promises";
import path from "node:path";
import { Resvg } from "@resvg/resvg-js";
import { STYLES, type StyleId } from "./catalog";

/**
 * Print artwork generation.
 *
 * The artwork is a PNG the exact size of the garment print area (300 dpi,
 * dimensions from Prodigi's product details) with the Unix-millisecond
 * timestamp in Chivo, white on a transparent background. It is placed the way
 * the original shop placed it: an 8 inch wide design, 3 inches down from the
 * top of the print area.
 *
 * Because the artwork is a pure function of (style, timestamp) we never need
 * to store it: Prodigi downloads it from /api/artwork/<timestamp>.png on demand
 * and the same route serves previews.
 */

export const DESIGN_WIDTH_IN = 8;
export const DESIGN_TOP_IN = 3;
export const DPI = 300;

const FONT_PATH = path.join(process.cwd(), "public/fonts/Chivo-Medium.ttf");

/** Chivo Medium digit advance is ~0.585em; we size text so 13 digits span DESIGN_WIDTH_IN. */
const DIGIT_ADVANCE_EM = 0.585;

export function artworkFontSizePx(text: string, widthPx: number): number {
  return widthPx / (text.length * DIGIT_ADVANCE_EM);
}

export interface ArtworkOptions {
  timestamp: number;
  style: StyleId;
  /** Scale factor: 1 = full print resolution. Previews use e.g. 0.15. */
  scale?: number;
  /** Solid background (previews); print files are transparent. */
  background?: string | null;
}

export function artworkSvg({ timestamp, style, scale = 1, background = null }: ArtworkOptions): string {
  const spec = STYLES[style];
  const text = String(timestamp);
  const width = Math.round(spec.printAreaPx.width * scale);
  const height = Math.round(spec.printAreaPx.height * scale);
  const pxPerIn = (spec.printAreaPx.width / spec.printAreaIn.width) * scale;
  const designWidth = DESIGN_WIDTH_IN * pxPerIn;
  const fontSize = artworkFontSizePx(text, designWidth);
  const top = DESIGN_TOP_IN * pxPerIn;
  // Chivo ascender is ~0.9em, so baseline sits at top + ~0.9 * fontSize.
  const baseline = top + fontSize * 0.9;
  const bg = background ? `<rect width="100%" height="100%" fill="${background}"/>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${bg}<text x="${width / 2}" y="${baseline}" text-anchor="middle" font-family="Chivo" font-weight="500" font-size="${fontSize}" fill="#ffffff" textLength="${designWidth}" lengthAdjust="spacingAndGlyphs">${text}</text></svg>`;
}

export async function renderArtworkPng(opts: ArtworkOptions): Promise<Buffer> {
  const svg = artworkSvg(opts);
  await access(FONT_PATH); // fail loudly if the font was not deployed alongside the function
  const resvg = new Resvg(svg, {
    font: {
      fontFiles: [FONT_PATH],
      loadSystemFonts: false,
      defaultFontFamily: "Chivo",
    },
  });
  return Buffer.from(resvg.render().asPng());
}

export function artworkUrl(origin: string, style: StyleId, timestamp: number): string {
  return `${origin}/api/artwork/${timestamp}.png?style=${style}`;
}
