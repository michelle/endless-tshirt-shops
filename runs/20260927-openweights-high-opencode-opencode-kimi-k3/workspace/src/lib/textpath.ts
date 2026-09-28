// Text -> vector paths via opentype.js, using the embedded Marcellus font.
// Rendering text as paths keeps the print pipeline (librsvg via sharp, where no
// usable system fonts exist) pixel-identical to the browser preview.
import opentype from 'opentype.js';
import { FONT_B64 } from '@/data/font';

export type Font = opentype.Font;

let cached: Font | null = null;

export function loadFont(): Font {
  if (!cached) {
    const bytes = Uint8Array.from(atob(FONT_B64), (c) => c.charCodeAt(0));
    cached = opentype.parse(bytes.buffer as ArrayBuffer);
  }
  return cached;
}

export interface LaidText {
  d: string; // combined SVG path data
  width: number; // advance width in px (excluding trailing tracking)
}

/**
 * Lay out text on a horizontal baseline, left edge at x. `tracking` is extra
 * letterspacing in em units. Unknown characters are skipped.
 */
export function layText(
  font: Font,
  text: string,
  x: number,
  baselineY: number,
  size: number,
  trackingEm = 0
): LaidText {
  const tracking = trackingEm * size;
  const parts: string[] = [];
  let cursor = x;
  let lastAdv = 0;
  for (const ch of text) {
    const glyph = font.charToGlyph(ch);
    const adv = (glyph.advanceWidth ?? font.unitsPerEm / 2) * (size / font.unitsPerEm);
    if (glyph.name !== '.notdef' || ch === ' ') {
      const p = glyph.getPath(cursor, baselineY, size);
      const d = p.toPathData(2);
      if (d && d.trim().length > 0) parts.push(d);
    }
    cursor += adv + tracking;
    lastAdv = adv;
  }
  return { d: parts.join(' '), width: Math.max(0, cursor - x - tracking + (lastAdv === 0 ? 0 : 0)) };
}

/** Width of text at a given size/tracking without emitting path data. */
export function measureText(
  font: Font,
  text: string,
  size: number,
  trackingEm = 0
): number {
  const tracking = trackingEm * size;
  let w = 0;
  let count = 0;
  for (const ch of text) {
    const glyph = font.charToGlyph(ch);
    w += (glyph.advanceWidth ?? font.unitsPerEm / 2) * (size / font.unitsPerEm);
    count++;
  }
  return w + Math.max(0, count - 1) * tracking;
}

/** Centered text: returns path data centered on cx. */
export function centerText(
  font: Font,
  text: string,
  cx: number,
  baselineY: number,
  size: number,
  trackingEm = 0
): LaidText {
  const w = measureText(font, text, size, trackingEm);
  const laid = layText(font, text, cx - w / 2, baselineY, size, trackingEm);
  return { d: laid.d, width: w };
}
