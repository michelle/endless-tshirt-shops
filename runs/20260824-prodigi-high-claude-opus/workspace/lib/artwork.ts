/**
 * Print-asset geometry.
 *
 * Prodigi's front print area on both tees is 15.6 x 19.3 inches, which their US
 * lab wants at 300 dpi (4677 x 5881 px). We render at 150 dpi, which is well
 * inside DTG tolerance for flat vector-like text and keeps the PNG small enough
 * to rasterize inside a serverless function.
 *
 * The layout reproduces the original store's Scalable Press design spec:
 * artwork 8 inches wide, horizontally centered, 3 inches down from the top of
 * the print area.
 */

export const PRINT_AREA_INCHES = { width: 15.6, height: 19.3 } as const;
export const PRINT_DPI = 150;

export const PRINT_WIDTH = Math.round(PRINT_AREA_INCHES.width * PRINT_DPI); // 2340
export const PRINT_HEIGHT = Math.round(PRINT_AREA_INCHES.height * PRINT_DPI); // 2895

/** Design spec inherited from the original store. */
const DESIGN_WIDTH_INCHES = 8;
const DESIGN_TOP_OFFSET_INCHES = 3;

/**
 * Approximate advance width of a Chivo Bold digit, in ems. Chivo has tabular
 * figures, so every digit is the same width and this is exact enough to size
 * the text to a target physical width.
 */
const DIGIT_ADVANCE_EM = 0.6;
const LETTER_SPACING_EM = 0.04;

export type ArtworkLayout = {
  width: number;
  height: number;
  fontSize: number;
  letterSpacing: number;
  top: number;
};

/**
 * Lay out `text` so it occupies `DESIGN_WIDTH_INCHES` across a canvas rendered
 * at `scale` x the print resolution.
 */
export function layout(text: string, scale = 1): ArtworkLayout {
  const width = Math.round(PRINT_WIDTH * scale);
  const height = Math.round(PRINT_HEIGHT * scale);
  const targetTextWidth = DESIGN_WIDTH_INCHES * PRINT_DPI * scale;
  const perChar = DIGIT_ADVANCE_EM + LETTER_SPACING_EM;
  const fontSize = targetTextWidth / (Math.max(text.length, 1) * perChar);

  return {
    width,
    height,
    fontSize,
    letterSpacing: fontSize * LETTER_SPACING_EM,
    top: DESIGN_TOP_OFFSET_INCHES * PRINT_DPI * scale,
  };
}

/** Scale factors for the two sizes we serve. */
export const SCALES = {
  print: 1,
  /** Cheap, fast render used for the order confirmation page. */
  preview: 0.25,
} as const;

export type ArtworkFormat = keyof typeof SCALES;

export function isArtworkFormat(value: unknown): value is ArtworkFormat {
  return value === 'print' || value === 'preview';
}

/** The public, Prodigi-fetchable URL for a shirt's print asset. */
export function artworkUrl(origin: string, timestampMs: number): string {
  return `${origin.replace(/\/$/, '')}/api/artwork?t=${timestampMs}&format=print`;
}
