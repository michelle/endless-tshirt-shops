import path from 'node:path';
import { createCanvas, GlobalFonts, type SKRSContext2D } from '@napi-rs/canvas';

/**
 * Prodigi's print area for both tees, in inches. We always render artwork at
 * this exact aspect ratio and submit it with `sizing: fitPrintArea`, which
 * makes placement on the garment fully deterministic: the transparent canvas
 * *is* the print area, so wherever we draw is where it prints.
 */
export const PRINT_AREA_WIDTH_IN = 15.6;
export const PRINT_AREA_HEIGHT_IN = 19.3;

/** Layout, in inches, matching the original store's 8"-wide, 3"-from-top print. */
const TEXT_WIDTH_IN = 8;
const TEXT_TOP_IN = 3;

export const PRINT_DPI = 300;

const FONT_FAMILY = 'Chivo';
const FONT_PATH = path.join(process.cwd(), 'src', 'assets', 'fonts', 'Chivo.ttf');

let fontState: 'unloaded' | 'loaded' | 'failed' = 'unloaded';

/** Registers the bundled Chivo TTF once per warm lambda. */
export function ensureFont(): boolean {
  if (fontState === 'unloaded') {
    try {
      GlobalFonts.registerFromPath(FONT_PATH, FONT_FAMILY);
      fontState = GlobalFonts.has(FONT_FAMILY) ? 'loaded' : 'failed';
    } catch {
      fontState = 'failed';
    }
  }
  return fontState === 'loaded';
}

export function fontStatus(): string {
  ensureFont();
  return fontState;
}

function fontStack(): string {
  return ensureFont() ? `700 100px ${FONT_FAMILY}` : '700 100px sans-serif';
}

/** Chooses the pixel size that makes `text` exactly `targetWidth` px wide. */
function fitFontSize(ctx: SKRSContext2D, text: string, targetWidth: number): number {
  ctx.font = fontStack();
  const measured = ctx.measureText(text).width;
  if (!measured) return 100;
  return (targetWidth / measured) * 100;
}

export type ArtworkOptions = {
  /** Pixels per inch of print area. */
  dpi?: number;
  /** Fill behind the artwork; transparent by default (correct for DTG print). */
  background?: string | null;
};

/**
 * Renders the print-ready PNG for a timestamp. The artwork is a pure function
 * of the captured epoch milliseconds, which is why no artwork ever needs to be
 * stored: any order can be re-rendered byte-for-byte from its timestamp.
 */
export async function renderArtworkPng(
  capturedAt: number,
  options: ArtworkOptions = {},
): Promise<Buffer> {
  const dpi = options.dpi ?? PRINT_DPI;
  const width = Math.round(PRINT_AREA_WIDTH_IN * dpi);
  const height = Math.round(PRINT_AREA_HEIGHT_IN * dpi);
  const text = String(capturedAt);

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  if (options.background) {
    ctx.fillStyle = options.background;
    ctx.fillRect(0, 0, width, height);
  }

  const fontSize = fitFontSize(ctx, text, TEXT_WIDTH_IN * dpi);
  ctx.font = fontStack().replace('100px', `${fontSize}px`);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.letterSpacing = `${0.007 * fontSize}px`;
  ctx.fillText(text, width / 2, TEXT_TOP_IN * dpi);

  return canvas.encode('png');
}
