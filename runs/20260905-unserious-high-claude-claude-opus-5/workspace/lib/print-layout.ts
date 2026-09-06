/**
 * Where the timestamp sits inside the print area.
 *
 * Deliberately free of Node-only imports: the browser preview and the
 * server-side PNG generator both import this, which is what makes the shirt on
 * screen a true preview of the shirt in the box.
 */

import { DIGIT_H, textSize } from './glyphs';

/**
 * The Gildan 64000 front print area is 13.98in x 17.91in. Our canvas matches
 * that aspect ratio exactly, so Prodigi's `fillPrintArea` neither crops nor
 * letterboxes the artwork.
 */
export const PRINT_AREA_INCHES = { width: 13.98, height: 17.91 } as const;
export const CANVAS_W = 3300;
export const CANVAS_H = Math.round(CANVAS_W * (PRINT_AREA_INCHES.height / PRINT_AREA_INCHES.width));

/** Effective resolution once the canvas is scaled up to fill the print area. */
export const PRINT_DPI = Math.round(CANVAS_W / PRINT_AREA_INCHES.width);

/**
 * The design is an 8in-wide chest print sitting ~3in below the top of the
 * print area, which is the placement the original store used. Both ratios are
 * expressed against the print area so the preview and the PNG agree.
 */
export const PRINT_WIDTH_INCHES = 8;
export const TEXT_WIDTH_RATIO = PRINT_WIDTH_INCHES / PRINT_AREA_INCHES.width;
/** Vertical centre of the timestamp, as a fraction of print-area height. */
export const TEXT_TOP_RATIO = 0.19;

export type Placement = { scale: number; offsetX: number; offsetY: number };

/** Positions `length` digits inside an arbitrary print-area rectangle. */
export function placeText(
  length: number,
  areaX: number,
  areaY: number,
  areaW: number,
  areaH: number,
): Placement {
  const { width: designW } = textSize(length);
  const scale = designW > 0 ? (areaW * TEXT_WIDTH_RATIO) / designW : 0;
  return {
    scale,
    offsetX: areaX + (areaW - designW * scale) / 2,
    offsetY: areaY + areaH * TEXT_TOP_RATIO - (DIGIT_H * scale) / 2,
  };
}
