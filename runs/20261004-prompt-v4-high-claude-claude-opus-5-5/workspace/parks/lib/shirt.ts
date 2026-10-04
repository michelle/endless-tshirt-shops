// Shirt silhouette in a 1000×1100 box; the printable area maps to x 300–700 from y 210.
// Kept dependency-free so the client bundle can import it.
export const SHIRT_PATH =
  "M384 118C428 160 572 160 616 118L770 170Q842 200 912 300L828 392L772 344L778 1012Q500 1046 222 1012L228 344L172 392L88 300Q158 200 230 170Z";
export const COLLAR_PATH = "M384 118C428 160 572 160 616 118";
export const PRINT_BOX = { x: 300, y: 210, w: 400 };
// Where the tight badge crop (renderBadgeSvg) lands inside the print box.
export const BADGE_ON_SHIRT = { cx: 500, cy: 210 + (1232 / 3600) * 400, size: (2912 / 3600) * 400 };

export function isDark(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return 0.299 * r + 0.587 * g + 0.114 * b < 140;
}
