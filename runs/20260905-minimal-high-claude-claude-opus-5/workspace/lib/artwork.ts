/**
 * The artwork spec, shared by the browser preview and the server-side print
 * renderer so that what you see on the shirt is what gets printed.
 *
 * The print file is a transparent PNG covering the garment's whole front print
 * area. The timestamp is laid out inside it exactly as the original did on
 * Scalable Press: 8 inches wide, horizontally centred, 3 inches down from the
 * top of the print area.
 */

export const PRINT_DPI = 300;
export const PRINT_AREA_IN = { width: 12, height: 16 };
export const TEXT_WIDTH_IN = 8;
export const TEXT_TOP_IN = 3;

export const ARTWORK_PX = {
  width: PRINT_AREA_IN.width * PRINT_DPI, // 3600
  height: PRINT_AREA_IN.height * PRINT_DPI, // 4800
};

export const ARTWORK_ASPECT = PRINT_AREA_IN.width / PRINT_AREA_IN.height;

/** Widths the artwork endpoint will render. Keeps it from being a render farm. */
export const MIN_ARTWORK_WIDTH = 200;
export const MAX_ARTWORK_WIDTH = ARTWORK_PX.width;

/**
 * Timestamps must look like a plausible epoch-millisecond value: 13 digits,
 * from 2001-09-09 through the year 2286. This is what keeps the layout stable.
 */
export const MIN_TS = 1_000_000_000_000;
export const MAX_TS = 9_999_999_999_999;

export function isValidTimestamp(ts: unknown): ts is number {
  return (
    typeof ts === 'number' &&
    Number.isInteger(ts) &&
    ts >= MIN_TS &&
    ts <= MAX_TS
  );
}

/**
 * Draws the timestamp into a canvas of `width` x `width / ARTWORK_ASPECT`,
 * scaling the print geometry proportionally. Works against both the DOM
 * CanvasRenderingContext2D and @napi-rs/canvas's context.
 */
export function drawArtwork(
  ctx: {
    clearRect: (x: number, y: number, w: number, h: number) => void;
    measureText: (t: string) => { width: number };
    fillText: (t: string, x: number, y: number) => void;
    font: string;
    fillStyle: unknown;
    textAlign: unknown;
    textBaseline: unknown;
  },
  width: number,
  ts: number,
  fontFamily = 'Chivo',
) {
  const height = Math.round(width / ARTWORK_ASPECT);
  const dpi = width / PRINT_AREA_IN.width;
  const text = String(ts);

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  // Solve for the font size that makes the timestamp exactly TEXT_WIDTH_IN wide.
  const probe = 100;
  ctx.font = `500 ${probe}px ${fontFamily}`;
  const probeWidth = ctx.measureText(text).width || 1;
  const fontSize = (probe * TEXT_WIDTH_IN * dpi) / probeWidth;
  ctx.font = `500 ${fontSize}px ${fontFamily}`;

  ctx.fillText(text, width / 2, TEXT_TOP_IN * dpi);
}
