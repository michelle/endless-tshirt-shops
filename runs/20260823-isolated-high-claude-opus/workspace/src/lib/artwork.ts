'use client';

import { PRINT_WIDTH_PX } from './catalog';

/**
 * Renders the Unix millisecond timestamp that goes on the shirt.
 *
 * Two things are worth knowing here:
 *
 * 1. Digits are laid out on a fixed advance, not with the font's natural
 *    metrics. Chivo's `1` is much narrower than its `0`, so a naturally-spaced
 *    counter visibly jitters and reflows every millisecond. A monospace grid
 *    makes it tick like a clock instead of squirming.
 *
 * 2. The print render is a genuinely print-resolution PNG — 2400px wide, which
 *    is 8 inches at 300dpi — cropped tight to the glyphs. The original store
 *    sent a 37px-tall screen canvas to the printer; that would be badly
 *    pixelated across an 8-inch chest print.
 */

const DIGITS = '0123456789';
/** Fraction of the fixed advance to inset each glyph by, to open the tracking up slightly. */
const TRACKING = 0.06;

export type TimestampGlyphs = {
  /** Fixed horizontal advance per character. */
  advance: number;
  ascent: number;
  descent: number;
};

function measure(ctx: CanvasRenderingContext2D, font: string, size: number): TimestampGlyphs {
  ctx.font = `${size}px ${font}`;
  let advance = 0;
  let ascent = 0;
  let descent = 0;
  for (const d of DIGITS) {
    const m = ctx.measureText(d);
    advance = Math.max(advance, m.width);
    ascent = Math.max(ascent, m.actualBoundingBoxAscent);
    descent = Math.max(descent, m.actualBoundingBoxDescent);
  }
  return { advance: advance * (1 + TRACKING), ascent, descent };
}

/** Draws `text` on a fixed digit grid, left-aligned at (x, baselineY). */
export function drawFixedAdvance(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  baselineY: number,
  advance: number,
) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  for (let i = 0; i < text.length; i++) {
    ctx.fillText(text[i], x + advance * (i + 0.5), baselineY);
  }
}

/** The font size at which `charCount` characters exactly fill `width`. */
function fitFontSize(
  ctx: CanvasRenderingContext2D,
  font: string,
  charCount: number,
  width: number,
): number {
  const probe = 100;
  const { advance } = measure(ctx, font, probe);
  if (advance <= 0) return probe;
  return (width / (charCount * advance)) * probe;
}

/**
 * The high-resolution PNG we hand to Scalable Press. White ink on transparent,
 * cropped tight to the glyphs so the print lands exactly where the design's
 * top-offset says it should.
 */
export function renderPrintArtwork(timestamp: number, font: string): string {
  const text = String(timestamp);
  const probe = document.createElement('canvas').getContext('2d');
  if (!probe) throw new Error('Canvas is unavailable in this browser.');

  const fontSize = fitFontSize(probe, font, text.length, PRINT_WIDTH_PX);
  const { advance, ascent, descent } = measure(probe, font, fontSize);
  const padding = Math.round(fontSize * 0.06);
  const height = Math.ceil(ascent + descent + padding * 2);

  const canvas = document.createElement('canvas');
  canvas.width = PRINT_WIDTH_PX;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is unavailable in this browser.');

  ctx.font = `${fontSize}px ${font}`;
  ctx.fillStyle = '#ffffff';
  drawFixedAdvance(ctx, text, 0, padding + ascent, advance);

  return canvas.toDataURL('image/png');
}

/**
 * Draws the on-screen preview into an existing canvas, sized in CSS pixels and
 * scaled for the device pixel ratio so it stays crisp on retina displays.
 */
export function drawPreview(
  canvas: HTMLCanvasElement,
  timestamp: number,
  font: string,
  cssWidth: number,
) {
  const text = String(timestamp);
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const probeSize = 100;
  const probe = measure(ctx, font, probeSize);
  const fontSize = (cssWidth / (text.length * probe.advance)) * probeSize;
  const { advance, ascent, descent } = measure(ctx, font, fontSize);
  const cssHeight = Math.ceil(ascent + descent);

  const wantW = Math.round(cssWidth * dpr);
  const wantH = Math.round(cssHeight * dpr);
  if (canvas.width !== wantW || canvas.height !== wantH) {
    canvas.width = wantW;
    canvas.height = wantH;
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;
  }

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssWidth, cssHeight);
  ctx.font = `${fontSize}px ${font}`;
  ctx.fillStyle = '#ffffff';
  drawFixedAdvance(ctx, text, 0, ascent, advance);
}

/** Resolves once the webfont is actually available, so canvas metrics are real. */
export async function waitForFont(font: string): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return;
  try {
    await document.fonts.load(`400 100px ${font}`);
    await document.fonts.ready;
  } catch {
    // Fall back to whatever the browser gives us rather than blocking checkout.
  }
}
