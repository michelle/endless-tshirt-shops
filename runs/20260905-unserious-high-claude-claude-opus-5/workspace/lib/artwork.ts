/**
 * Turns a Unix millisecond timestamp into the print-ready PNG that Prodigi
 * downloads when it fulfils the order.
 */

import { textPolygons, type Polygon } from './glyphs';
import { encodePng, rasterise } from './png';
import { CANVAS_H, CANVAS_W, PRINT_DPI, placeText } from './print-layout';

export { CANVAS_H, CANVAS_W, PRINT_DPI };

export type Ink = 'white' | 'black';

/** A timestamp is 13 digits until 2286, at which point this is someone else's problem. */
export function isValidTimestamp(raw: string): boolean {
  return /^\d{10,14}$/.test(raw);
}

export function isInk(v: unknown): v is Ink {
  return v === 'white' || v === 'black';
}

function layout(text: string): Polygon[] {
  const { scale, offsetX, offsetY } = placeText(text.length, 0, 0, CANVAS_W, CANVAS_H);
  return textPolygons(text).map((poly) =>
    poly.map(([x, y]) => [x * scale + offsetX, y * scale + offsetY] as const),
  );
}

/** Renders the print file. Deterministic: same timestamp and ink, same bytes. */
export function renderArtwork(timestamp: string, ink: Ink): Buffer {
  const alpha = rasterise(layout(timestamp), CANVAS_W, CANVAS_H);
  return encodePng(alpha, CANVAS_W, CANVAS_H, ink === 'white' ? 255 : 0, PRINT_DPI);
}
