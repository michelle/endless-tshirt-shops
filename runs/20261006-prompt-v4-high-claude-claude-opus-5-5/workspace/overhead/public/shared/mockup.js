// Flat-lay t-shirt mockup used for previews. Units: 1000×1000; ~24 units per inch on a size L.
import { CROP } from './render.js';

const BODY = 'M410 66C440 104 560 104 590 66L752 110C802 126 842 160 872 210L914 300L828 384L750 322L750 960C600 976 400 976 250 960L250 322L172 384L86 300L128 210C158 160 198 126 248 110Z';
export const ART = { x: 347, y: 152, w: 306, h: Math.round((306 * CROP.h) / CROP.w) };

export function shirtSVG(hex, artSvg, tone, id = 'm') {
  const shade = tone === 'dark' ? '#000' : '#5a4a3a';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="40 30 920 960" role="img" aria-label="T-shirt preview">
<defs>
  <clipPath id="${id}-body"><path d="${BODY}"/></clipPath>
  <linearGradient id="${id}-side" x1="0" x2="1"><stop offset="0" stop-color="${shade}" stop-opacity=".22"/><stop offset=".18" stop-color="${shade}" stop-opacity="0"/><stop offset=".82" stop-color="${shade}" stop-opacity="0"/><stop offset="1" stop-color="${shade}" stop-opacity=".22"/></linearGradient>
  <radialGradient id="${id}-light" cx=".45" cy=".25" r=".8"><stop offset="0" stop-color="#fff" stop-opacity="${tone === 'dark' ? '.07' : '.25'}"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
</defs>
<path d="${BODY}" fill="${hex}" stroke="${tone === 'dark' ? '#00000066' : '#00000026'}" stroke-width="2"/>
<g clip-path="url(#${id}-body)">${artSvg}
  <rect x="0" y="0" width="1000" height="1000" fill="url(#${id}-side)"/>
  <rect x="0" y="0" width="1000" height="1000" fill="url(#${id}-light)"/>
  <path d="M250 322C320 360 300 700 330 960M750 322C690 400 720 700 680 960" fill="none" stroke="${shade}" stroke-opacity=".07" stroke-width="18"/>
</g>
<path d="M410 66C440 112 560 112 590 66" fill="none" stroke="${shade}" stroke-opacity=".35" stroke-width="12"/>
<path d="M172 384L250 322M828 384L750 322" stroke="${shade}" stroke-opacity=".18" stroke-width="3"/>
</svg>`;
}
