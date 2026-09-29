// Renders the artwork onto a t-shirt silhouette SVG for store previews.

export interface ShirtColor {
  /** Prodigi color attribute value */
  prodigi: string;
  /** display name */
  label: string;
  hex: string;
  /** true = light ink artwork suits this shirt (i.e. shirt is dark) */
  dark: boolean;
}

export const SHIRT_COLORS: ShirtColor[] = [
  { prodigi: "black", label: "Black", hex: "#181a1e", dark: true },
  { prodigi: "navy blue", label: "Navy", hex: "#232f4b", dark: true },
  { prodigi: "white", label: "White", hex: "#f5f5f2", dark: false },
  { prodigi: "athletic grey heather", label: "Grey Heather", hex: "#8f949b", dark: true },
  { prodigi: "burgundy", label: "Burgundy", hex: "#5e2130", dark: true },
  { prodigi: "military green", label: "Military Green", hex: "#4c5344", dark: true },
  { prodigi: "cream", label: "Cream", hex: "#eadFCa".toLowerCase(), dark: false },
  { prodigi: "baby blue", label: "Baby Blue", hex: "#a9c8e8", dark: false },
  { prodigi: "pink", label: "Pink", hex: "#efc4d0", dark: false },
];

export const SIZES = ["xs", "s", "m", "l", "xl", "2xl", "3xl", "4xl"] as const;

/** Tee silhouette (1000 x 1100 viewBox) with chest print area for the artwork. */
export function buildShirtSvg(artworkPngBase64: string, colorHex: string): string {
  const W = 1000, H = 1100;
  // chest print rect (matches where DTG prints on the real garment)
  const px = 285, py = 265, pw = 430;
  const ph = Math.round((pw * 3474) / 2808); // keep artwork aspect (0.808)
  const pyC = py + Math.round(ph / 2);

  const darker = shade(colorHex, -0.28);
  const lighter = shade(colorHex, 0.18);

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
  <linearGradient id="cloth" x1="0" y1="0" x2="0.25" y2="1">
    <stop offset="0%" stop-color="${lighter}"/>
    <stop offset="55%" stop-color="${colorHex}"/>
    <stop offset="100%" stop-color="${darker}"/>
  </linearGradient>
  <linearGradient id="shadel" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%" stop-color="#000000" stop-opacity="0.16"/>
    <stop offset="18%" stop-color="#000000" stop-opacity="0"/>
  </linearGradient>
  <linearGradient id="shader" x1="1" y1="0" x2="0" y2="0">
    <stop offset="0%" stop-color="#000000" stop-opacity="0.16"/>
    <stop offset="18%" stop-color="#000000" stop-opacity="0"/>
  </linearGradient>
  <linearGradient id="fold" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#ffffff" stop-opacity="0.10"/>
    <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
  </linearGradient>
</defs>

<!-- tee body -->
<path d="M 356 168
         C 300 178 235 205 176 240
         L 118 276
         C 108 282 104 294 108 305
         L 152 428
         C 157 442 172 448 186 442
         L 292 396
         C 300 560 296 726 286 886
         L 282 968
         C 281 990 296 1006 318 1007
         L 682 1007
         C 704 1006 719 990 718 968
         L 714 886
         C 704 726 700 560 708 396
         L 814 442
         C 828 448 843 442 848 428
         L 892 305
         C 896 294 892 282 882 276
         L 824 240
         C 765 205 700 178 644 168
         C 596 214 404 214 356 168 Z"
      fill="url(#cloth)" stroke="${darker}" stroke-width="3"/>

<!-- collar rib -->
<path d="M 362 172 C 402 236 598 236 638 172 C 596 206 404 206 362 172 Z" fill="${darker}"/>
<path d="M 362 172 C 404 214 596 214 638 172" fill="none" stroke="${darker}" stroke-width="7" stroke-linecap="round"/>

<!-- fabric shading -->
<path d="M 356 168 C 300 178 235 205 176 240 L 118 276 C 108 282 104 294 108 305 L 152 428 C 157 442 172 448 186 442 L 292 396 C 300 560 296 726 286 886 L 282 968 C 281 990 296 1006 318 1007 L 682 1007 C 704 1006 719 990 718 968 L 714 886 C 704 726 700 560 708 396 L 814 442 C 828 448 843 442 848 428 L 892 305 C 896 294 892 282 882 276 L 824 240 C 765 205 700 178 644 168 C 596 214 404 214 356 168 Z" fill="url(#shadel)"/>
<path d="M 356 168 C 300 178 235 205 176 240 L 118 276 C 108 282 104 294 108 305 L 152 428 C 157 442 172 448 186 442 L 292 396 C 300 560 296 726 286 886 L 282 968 C 281 990 296 1006 318 1007 L 682 1007 C 704 1006 719 990 718 968 L 714 886 C 704 726 700 560 708 396 L 814 442 C 828 448 843 442 848 428 L 892 305 C 896 294 892 282 882 276 L 824 240 C 765 205 700 178 644 168 C 596 214 404 214 356 168 Z" fill="url(#shader)"/>
<rect x="330" y="240" width="340" height="60" rx="30" fill="url(#fold)"/>

<!-- hem + cuff stitch lines -->
<path d="M 288 940 L 712 940" stroke="${darker}" stroke-width="2.5" stroke-dasharray="7 6" fill="none" opacity="0.7"/>
<path d="M 128 330 L 176 318" stroke="${darker}" stroke-width="2.5" stroke-dasharray="7 6" fill="none" opacity="0.7"/>
<path d="M 872 330 L 824 318" stroke="${darker}" stroke-width="2.5" stroke-dasharray="7 6" fill="none" opacity="0.7"/>

<!-- artwork -->
<image x="${px}" y="${pyC - ph / 2}" width="${pw}" height="${ph}" xlink:href="data:image/png;base64,${artworkPngBase64}" preserveAspectRatio="xMidYMid meet"/>
</svg>`;
}

function shade(hex: string, amt: number): string {
  const n = hex.replace("#", "");
  const num = parseInt(n.length === 3 ? n.split("").map((c) => c + c).join("") : n, 16);
  let r = (num >> 16) & 0xff, g = (num >> 8) & 0xff, b = num & 0xff;
  if (amt >= 0) {
    r += (255 - r) * amt; g += (255 - g) * amt; b += (255 - b) * amt;
  } else {
    r *= 1 + amt; g *= 1 + amt; b *= 1 + amt;
  }
  const c = (v: number) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}
