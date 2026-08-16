/**
 * Rasterizes the epoch-millisecond timestamp into the PNG that actually gets
 * printed.
 *
 * The on-screen preview is HTML text (crisp at any zoom); this is the print
 * master, rendered at 300 DPI across the full 8" print width so the DTG output
 * is sharp rather than an upscaled screenshot of the preview.
 */

import { PRINT } from './catalog';

/** White ink on a black garment, so the background stays transparent. */
const INK = '#ffffff';
/** Fraction of the print width the digits span, leaving a little air. */
const FILL_RATIO = 0.94;

export function formatStamp(timestamp: number): string {
  return String(timestamp);
}

/**
 * @param timestamp epoch milliseconds, exactly as shown to the customer
 * @param fontFamily CSS font-family string (next/font generates a hashed name)
 */
export async function renderPrintArtwork(timestamp: number, fontFamily: string): Promise<string> {
  const text = formatStamp(timestamp);
  const width = Math.round(PRINT.widthInches * PRINT.dpi);

  // Canvas silently falls back to a default face if the webfont has not loaded,
  // which would print the wrong typeface. Wait for it.
  await ensureFontLoaded(fontFamily);

  const measure = document.createElement('canvas').getContext('2d');
  if (!measure) throw new Error('Canvas 2D is unavailable in this browser.');

  // Binary-search-free fit: measure once at a reference size and scale linearly,
  // which is exact for horizontal text metrics.
  const REFERENCE = 200;
  measure.font = `700 ${REFERENCE}px ${fontFamily}`;
  const referenceWidth = measure.measureText(text).width;
  if (referenceWidth <= 0) throw new Error('Could not measure the artwork text.');

  const fontSize = Math.floor((REFERENCE * width * FILL_RATIO) / referenceWidth);
  const height = Math.round(fontSize * 1.35);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D is unavailable in this browser.');

  ctx.font = `700 ${fontSize}px ${fontFamily}`;
  ctx.fillStyle = INK;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, width / 2, height / 2);

  return canvas.toDataURL('image/png');
}

async function ensureFontLoaded(fontFamily: string): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return;
  try {
    await document.fonts.load(`700 200px ${fontFamily}`);
    await document.fonts.ready;
  } catch {
    // A font-loading hiccup should not block a sale; the fallback face still
    // renders legible digits.
  }
}
