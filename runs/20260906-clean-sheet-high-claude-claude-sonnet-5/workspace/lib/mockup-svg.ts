// Flat, stylized t-shirt silhouette used as the storefront product mockup.
// Every shirt in the store is printed on the same black Gildan 64000 tee, so
// this garment art is shared across all products; only the chest graphic
// (see design-svg.ts) changes per product.

export const GARMENT_W = 1200;
export const GARMENT_H = 1620;

const SHIRT_PATH =
  "M360,200 L480,80 Q600,176 720,80 L840,200 L1200,380 L1020,656 L900,560 L900,1580 L300,1580 L300,560 L180,656 L0,380 Z";

export function buildGarmentSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${GARMENT_W} ${GARMENT_H}" width="${GARMENT_W}" height="${GARMENT_H}">
  <defs>
    <linearGradient id="sheen" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3a3a3d" stop-opacity="0.55"/>
      <stop offset="45%" stop-color="#0b0b0c" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.35"/>
    </linearGradient>
    <clipPath id="shirtClip">
      <path d="${SHIRT_PATH}"/>
    </clipPath>
  </defs>
  <path d="${SHIRT_PATH}" fill="#0e0e10"/>
  <rect x="0" y="0" width="${GARMENT_W}" height="${GARMENT_H}" fill="url(#sheen)" clip-path="url(#shirtClip)"/>
  <path d="M480,80 Q600,176 720,80" fill="none" stroke="#3a3a3d" stroke-width="10" stroke-linecap="round"/>
</svg>`;
}
