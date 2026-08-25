/**
 * Geometry shared by the on-screen preview and the print-ready PNG, so what a
 * customer watches tick is literally what gets printed.
 *
 * The design is one fixed-pitch row of 13 digits: the epoch millisecond the
 * order was locked in.
 */

/** Front print area we design against, in inches. */
export const PRINT_WIDTH_IN = 12;
export const PRINT_HEIGHT_IN = 16;
export const PRINT_DPI = 300;

/** How wide the row of digits should be on the garment, in inches. */
export const ART_WIDTH_IN = 8;
/** Distance from the top of the print area to the top of the digits. */
export const ART_TOP_IN = 3;

export const DIGITS = 13;

export const PRINT_PX_W = PRINT_WIDTH_IN * PRINT_DPI; // 3600
export const PRINT_PX_H = PRINT_HEIGHT_IN * PRINT_DPI; // 4800
/** Per-digit advance, so digits never reflow as the clock ticks. */
export const PRINT_ADVANCE_PX = Math.round((ART_WIDTH_IN * PRINT_DPI) / DIGITS);
export const PRINT_FONT_PX = Math.round(PRINT_ADVANCE_PX / 0.62);
export const PRINT_TOP_PX = ART_TOP_IN * PRINT_DPI;

/** Two years back covers reprints and support; an hour forward covers skew. */
const OLDEST_MS = 2 * 365 * 24 * 60 * 60 * 1000;
const NEWEST_MS = 60 * 60 * 1000;

/**
 * Epoch milliseconds is 13 digits until November 2286, but rendering a
 * 3600x4800 PNG is expensive enough that the range also has to be bounded —
 * otherwise the endpoint is a free CPU faucet with 10^13 distinct cache keys.
 */
export function isRenderableTimestamp(epochMs: number, now = Date.now()): boolean {
  return (
    Number.isInteger(epochMs) &&
    epochMs > 0 &&
    String(epochMs).length === DIGITS &&
    epochMs > now - OLDEST_MS &&
    epochMs < now + NEWEST_MS
  );
}

export function artworkPath(epochMs: number): string {
  return `/api/artwork/${epochMs}.png`;
}

export function artworkUrl(origin: string, epochMs: number): string {
  return `${origin.replace(/\/$/, '')}${artworkPath(epochMs)}`;
}

/**
 * The same design expressed in the preview SVG's coordinate space
 * (viewBox 0 0 100 125), derived from the print geometry above so the mock-up
 * and the separation cannot drift apart.
 *
 * Scale: the drawn garment is about 28in long and spans 91 viewBox units.
 */
const UNITS_PER_INCH = 91 / 28;

export const PREVIEW = {
  /** Top-left of the front print area. */
  printX: 50 - (PRINT_WIDTH_IN * UNITS_PER_INCH) / 2,
  printY: 22,
  printW: PRINT_WIDTH_IN * UNITS_PER_INCH,
  printH: PRINT_HEIGHT_IN * UNITS_PER_INCH,
  /** Per-digit advance and font size, matching ART_WIDTH_IN across 13 digits. */
  advance: (ART_WIDTH_IN * UNITS_PER_INCH) / DIGITS,
  fontSize: (ART_WIDTH_IN * UNITS_PER_INCH) / DIGITS / 0.62,
  /** Baseline: 3in below the top of the print area, plus one cap height. */
  baseline: 22 + ART_TOP_IN * UNITS_PER_INCH + ((ART_WIDTH_IN * UNITS_PER_INCH) / DIGITS / 0.62) * 0.72,
} as const;
