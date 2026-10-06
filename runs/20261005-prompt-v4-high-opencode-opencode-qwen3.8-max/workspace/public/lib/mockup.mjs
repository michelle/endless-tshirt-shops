// Heliogram — t-shirt mockup. A clean crew-neck tee silhouette with the live
// design nested in the chest print area, plus soft fabric shading so the
// preview reads as a garment, not a flat rectangle.
// Shared by browser and (optionally) server. viewBox 0 0 700 840.

import { buildDesignInner, SHIRTS } from './design.mjs';

export const MOCK_W = 700;
export const MOCK_H = 840;

// print area inside the mockup (chest). Real DTG print area on a BC3001 is
// 30.5 × 37.8 cm; the mockup body (~50 cm chest) is 348 units wide, so the
// print rect is ~212 × 263 units.
const PX = 244, PY = 258, PW = 212, PH = 263; // keeps 4677:5787 aspect

export function buildMockupSVG(p) {
  const shirt = SHIRTS[p.shirt] || SHIRTS.black;
  const dark = shirt.hex.startsWith('#1') || shirt.hex.startsWith('#3') || shirt.hex.startsWith('#4');
  const collarRing = dark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${MOCK_W} ${MOCK_H}">
<defs>
<linearGradient id="fabric" x1="0" y1="0" x2="1" y2="0">
<stop offset="0%" stop-color="rgba(0,0,0,0.20)"/>
<stop offset="14%" stop-color="rgba(0,0,0,0.05)"/>
<stop offset="50%" stop-color="rgba(255,255,255,0.06)"/>
<stop offset="86%" stop-color="rgba(0,0,0,0.05)"/>
<stop offset="100%" stop-color="rgba(0,0,0,0.22)"/>
</linearGradient>
<linearGradient id="fabricV" x1="0" y1="0" x2="0" y2="1">
<stop offset="0%" stop-color="rgba(255,255,255,0.07)"/>
<stop offset="30%" stop-color="rgba(0,0,0,0)"/>
<stop offset="100%" stop-color="rgba(0,0,0,0.16)"/>
</linearGradient>
<clipPath id="tee"><path d="${TEE_PATH}"/></clipPath>
</defs>
<path d="${TEE_PATH}" fill="${shirt.hex}"/>
<!-- chest design (under the cloth shading so ink sits in the fabric) -->
<g clip-path="url(#tee)">
  <svg x="${PX}" y="${PY}" width="${PW}" height="${PH}" viewBox="0 0 4677 5787">${buildDesignInner(p)}</svg>
  <path d="${TEE_PATH}" fill="url(#fabric)"/>
  <path d="${TEE_PATH}" fill="url(#fabricV)"/>
  <path d="M150 120 C 210 210, 214 420, 208 800" stroke="${dark ? 'rgba(255,255,255,0.045)' : 'rgba(0,0,0,0.05)'}" stroke-width="10" fill="none" stroke-linecap="round"/>
  <path d="M550 120 C 490 210, 486 430, 492 800" stroke="${dark ? 'rgba(255,255,255,0.045)' : 'rgba(0,0,0,0.05)'}" stroke-width="10" fill="none" stroke-linecap="round"/>
  <path d="M120 300 C 160 320, 170 380, 162 470" stroke="${dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.045)'}" stroke-width="7" fill="none" stroke-linecap="round"/>
  <path d="M580 300 C 540 320, 530 380, 538 470" stroke="${dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.045)'}" stroke-width="7" fill="none" stroke-linecap="round"/>
</g>
<!-- collar -->
<path d="M264 94 C 290 72, 410 72, 436 94 C 420 122, 372 138, 350 138 C 328 138, 280 122, 264 94 Z" fill="${collarRing}"/>
<path d="M272 98 C 296 80, 404 80, 428 98 C 414 120, 372 132, 350 132 C 328 132, 286 120, 272 98 Z" fill="${dark ? '#0A0D14' : '#D8D4CB'}"/>
<path d="M272 98 C 296 80, 404 80, 428 98" fill="none" stroke="${dark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.18)'}" stroke-width="4"/>
<!-- sleeve + hem seams -->
<path d="M96 258 C 120 276, 152 290, 186 296" stroke="${collarRing}" stroke-width="4" fill="none"/>
<path d="M604 258 C 580 276, 548 290, 514 296" stroke="${collarRing}" stroke-width="4" fill="none"/>
<path d="M212 786 C 300 800, 400 800, 488 786" stroke="${collarRing}" stroke-width="4" fill="none"/>
</svg>`;
}

const TEE_PATH = 'M262 96 C 288 70, 320 62, 350 62 C 380 62, 412 70, 438 96 C 500 112, 560 140, 606 178 L 664 262 C 668 268, 666 274, 660 278 L 566 330 C 560 334, 552 332, 548 326 L 512 268 L 520 560 L 524 790 C 524 800, 518 806, 508 808 C 400 822, 300 822, 192 808 C 182 806, 176 800, 176 790 L 180 560 L 188 268 L 152 326 C 148 332, 140 334, 134 330 L 40 278 C 34 274, 32 268, 36 262 L 94 178 C 140 140, 200 112, 262 96 Z';
