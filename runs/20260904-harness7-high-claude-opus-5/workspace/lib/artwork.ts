/**
 * Geometry for the print-ready artwork.
 *
 * Prodigi's US apparel lab reports a 4665 x 5844 px front print area for the
 * Gildan Softstyle tees (~11.4in x 14.3in). We render a full-bleed transparent
 * PNG at that aspect ratio and hand it to Prodigi with `fillPrintArea`, which
 * makes the mapping from our canvas to the garment exact: whatever fraction of
 * our canvas the text occupies is the fraction of the print area it occupies.
 *
 * Rendering at the lab's native 4665px would be wasteful for a single line of
 * type, so we render at 2800px wide (~245 DPI across the print area), which is
 * comfortably past what DTG can resolve.
 */
export const ART_WIDTH = 2800;
export const ART_HEIGHT = 3508; // 2800 / (4665 / 5844)

/**
 * The original store printed the timestamp 8in wide, 3in down from the collar.
 * Expressed as fractions of the print area so the numbers survive a change of
 * canvas resolution.
 */
export const ART_TEXT_WIDTH_FRACTION = 8 / 11.4;
export const ART_TEXT_TOP_FRACTION = 3 / 14.3;

/**
 * A 13-digit epoch is 13 glyphs of tabular-ish Chivo. Chivo's digit advance is
 * ~0.6em, so 13 digits occupy ~7.8em; sizing the em so that lands on the
 * target width keeps the print 8in wide regardless of digit count.
 */
export function artFontSizeFor(text: string): number {
  const targetWidth = ART_WIDTH * ART_TEXT_WIDTH_FRACTION;
  const emsWide = Math.max(text.length, 1) * 0.6;
  return Math.round(targetWidth / emsWide);
}

/** Canonical, cacheable URL for a shirt's print asset. */
export function artworkPath(ts: number): string {
  return `/api/artwork/${ts}.png`;
}

/**
 * Canonical URL for the shop-facing mockup (black shirt, white type).
 * Style is in the path, not a query string, so the route can be cached
 * statically.
 */
export function previewPath(ts: number, style: string): string {
  return `/api/preview/${encodeURIComponent(style)}/${ts}.png`;
}
