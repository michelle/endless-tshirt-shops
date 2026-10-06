// Flat-lay tee mockup with the real print-file SVG placed in the true print area.
import { renderSVG, PRINT_W, PRINT_H } from './design.js';
import { shirtColor } from './catalog.js';

let uid = 0;

// Tee body ≈ 536 units across at the armpits ≈ 20" (Bella+Canvas 3001, size M),
// so the 15.6" print area is ~418 units wide and starts just below the collar.
const PA = { x: 291, y: 150, w: 418 };
PA.h = (PA.w * PRINT_H) / PRINT_W;

const BODY =
  'M385,70 Q500,178 615,70 L785,118 Q880,190 948,300 L850,392 L768,330 Q772,700 762,1050 ' +
  'Q500,1068 238,1050 Q228,700 232,330 L150,392 L52,300 Q120,190 215,118 Z';

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (s) => Math.max(0, Math.min(255, Math.round(((n >> s) & 255) * (1 + amt))));
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}

export function designInner(design, dark) {
  return renderSVG(design, { dark }).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
}

export function shirtMockup(design, shirtId, { showPrintArea = false } = {}) {
  const shirt = shirtColor(shirtId) ?? shirtColor('black');
  const id = `m${++uid}`;
  const s = PA.w / PRINT_W;
  return `
<svg viewBox="0 0 1000 1100" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="T-shirt preview">
  <defs>
    <linearGradient id="${id}h" x1="0" x2="1">
      <stop offset="0" stop-color="#000" stop-opacity=".16"/>
      <stop offset=".18" stop-color="#000" stop-opacity="0"/>
      <stop offset=".82" stop-color="#000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity=".16"/>
    </linearGradient>
    <radialGradient id="${id}r" cx=".5" cy=".38" r=".62">
      <stop offset="0" stop-color="#fff" stop-opacity="${shirt.dark ? 0.07 : 0.18}"/>
      <stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="${id}c"><path d="${BODY}"/></clipPath>
  </defs>
  <path d="${BODY}" fill="${shirt.hex}"/>
  <g clip-path="url(#${id}c)">
    <rect width="1000" height="1100" fill="url(#${id}r)"/>
    <rect width="1000" height="1100" fill="url(#${id}h)"/>
    <path d="M385,70 Q500,100 615,70 Q500,178 385,70Z" fill="${shade(shirt.hex, -0.28)}"/>
    <path d="M232,330 L150,392 M768,330 L850,392" stroke="#000" stroke-opacity=".12" stroke-width="3" fill="none"/>
    <path d="M241,1036 Q500,1052 759,1036" stroke="#000" stroke-opacity=".12" stroke-width="3" fill="none"/>
    <path d="M70,318 L162,398 M930,318 L838,398" stroke="#000" stroke-opacity=".10" stroke-width="3" fill="none"/>
  </g>
  <path d="M385,70 Q500,178 615,70" fill="none" stroke="${shade(shirt.hex, shirt.dark ? 0.25 : -0.1)}" stroke-width="16" stroke-linecap="round"/>
  ${showPrintArea ? `<rect x="${PA.x}" y="${PA.y}" width="${PA.w}" height="${PA.h.toFixed(1)}" fill="none" stroke="${shirt.dark ? '#fff' : '#000'}" stroke-opacity=".35" stroke-dasharray="6 6"/>` : ''}
  <g transform="translate(${PA.x} ${PA.y}) scale(${s.toFixed(6)})">${designInner(design, shirt.dark)}</g>
</svg>`;
}
