import path from 'node:path';
import { createCanvas, GlobalFonts, type SKRSContext2D } from '@napi-rs/canvas';

import { PRINT } from './catalog';

/**
 * The printed artwork is rendered here on the server rather than being uploaded
 * by the browser. Two reasons:
 *
 *  1. Trust — the artwork is what we pay a printer to put on a garment, so it
 *     should be derived from the timestamp we recorded, not from a PNG a client
 *     handed us.
 *  2. Quality — we can render at 300dpi with a font we control, instead of
 *     whatever a `<canvas>` happened to have available.
 *
 * The browser preview uses the same font file (served from /fonts), so what you
 * see is what gets printed.
 */

const FONT_FAMILY = 'Chivo Print';
let fontsRegistered = false;

function ensureFonts(): void {
  if (fontsRegistered) return;

  // A single statically-analysable path: the bundler can trace it, and
  // `outputFileTracingIncludes` in next.config.ts guarantees it ships to Vercel.
  const file = path.join(process.cwd(), 'public', 'fonts', 'Chivo-Bold.ttf');
  if (!GlobalFonts.registerFromPath(file, FONT_FAMILY)) {
    throw new Error(`Could not register the print font from ${file}`);
  }
  fontsRegistered = true;
}

/** The exact string we print. A unix millisecond timestamp, same as the original. */
export function artworkText(timestampMs: number): string {
  return String(Math.trunc(timestampMs));
}

export type RenderedArtwork = {
  png: Buffer;
  widthPx: number;
  heightPx: number;
  text: string;
};

/**
 * White text on transparency, sized so that `PRINT.widthInches` of garment is
 * covered at `PRINT.dpi`.
 */
export function renderArtworkPng(timestampMs: number): RenderedArtwork {
  ensureFonts();

  const text = artworkText(timestampMs);
  const targetWidth = PRINT.widthInches * PRINT.dpi;

  // Measure at a reference size, then scale the font so the text fills the
  // print width exactly.
  const probe = createCanvas(10, 10).getContext('2d');
  const referenceSize = 200;
  probe.font = `${referenceSize}px "${FONT_FAMILY}"`;
  const referenceWidth = probe.measureText(text).width;
  if (!referenceWidth) throw new Error('Failed to measure artwork text');
  const fontSize = (targetWidth / referenceWidth) * referenceSize;

  const height = Math.ceil(fontSize * 1.25);
  const canvas = createCanvas(Math.ceil(targetWidth), height);
  const ctx: SKRSContext2D = canvas.getContext('2d');

  ctx.font = `${fontSize}px "${FONT_FAMILY}"`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // Chivo's digits are lining figures, so the visual centre sits slightly above
  // the em box centre; nudge down a touch for an optically centred print.
  ctx.fillText(text, canvas.width / 2, height / 2 + fontSize * 0.02);

  return {
    png: canvas.toBuffer('image/png'),
    widthPx: canvas.width,
    heightPx: canvas.height,
    text,
  };
}
