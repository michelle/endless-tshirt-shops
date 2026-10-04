// Draws a front-view tee (Bella+Canvas 3001, size L: ~20.5" chest, 29" long) in the chosen colour with the real print file on it,
// scaled so the print area is true-to-size for an adult L (~20.5" chest).
import { GARMENTS, CANVAS, renderSVG } from './design.js';

const BODY =
  'M392 62 C430 122 570 122 608 62 L742 96 L905 262 L815 345 L742 290 C746 450 750 620 756 768 Q500 786 244 768 C250 620 254 450 258 290 L185 345 L95 262 L258 96 Z';

// Print area: 15.6" wide at ~23.6 units/inch, starting ~2" below the collar.
const PRINT = { x: 316, y: 168, w: 368 };
PRINT.h = (PRINT.w * CANVAS.h) / CANVAS.w;

let uid = 0;

export function nestDesign(design, garment, box, idPrefix) {
  const svg = renderSVG(design, garment, { idPrefix });
  return svg.replace(
    /^<svg[^>]*>/,
    `<svg x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" viewBox="0 0 ${CANVAS.w} ${CANVAS.h}">`,
  );
}

export function shirtSVG(design, garmentKey, { flat = false, zoom = false } = {}) {
  const g = GARMENTS[garmentKey];
  const id = `m${++uid}`;
  if (flat) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CANVAS.w} ${CANVAS.h}" class="flat" role="img" aria-label="Print file preview">
      <rect width="100%" height="100%" fill="${g.hex}"/>
      ${design ? nestDesign(design, garmentKey, { x: 0, y: 0, w: CANVAS.w, h: CANVAS.h }, id) : ''}
    </svg>`;
  }
  const heather = garmentKey === 'heather';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${zoom ? '250 122 500 432' : '60 40 880 760'}" role="img" aria-label="T-shirt preview">
    <defs>
      <linearGradient id="${id}-shade" x1="0" x2="1">
        <stop offset="0" stop-color="#000" stop-opacity=".22"/>
        <stop offset=".22" stop-color="#000" stop-opacity="0"/>
        <stop offset=".5" stop-color="#fff" stop-opacity=".05"/>
        <stop offset=".78" stop-color="#000" stop-opacity="0"/>
        <stop offset="1" stop-color="#000" stop-opacity=".22"/>
      </linearGradient>
      <linearGradient id="${id}-v" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#fff" stop-opacity=".06"/>
        <stop offset="1" stop-color="#000" stop-opacity=".10"/>
      </linearGradient>
      <clipPath id="${id}-clip"><path d="${BODY}"/></clipPath>
      ${heather ? `<filter id="${id}-noise"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="4"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .35 0"/></filter>` : ''}
    </defs>
    <path d="${BODY}" fill="${g.hex}"/>
    <g clip-path="url(#${id}-clip)">
      ${heather ? `<rect x="60" y="40" width="880" height="760" filter="url(#${id}-noise)" opacity=".5"/>` : ''}
      ${design ? nestDesign(design, garmentKey, PRINT, id) : ''}
      <rect x="60" y="40" width="880" height="760" fill="url(#${id}-shade)"/>
      <rect x="60" y="40" width="880" height="760" fill="url(#${id}-v)"/>
      <path d="M258 96 Q240 190 258 290 M742 96 Q760 190 742 290" fill="none" stroke="#000" stroke-opacity=".14" stroke-width="3"/>
      <path d="M185 345 L95 262 M815 345 L905 262" stroke="#000" stroke-opacity=".12" stroke-width="10"/>
    </g>
    <path d="M392 62 C440 80 560 80 608 62 C570 122 430 122 392 62Z" fill="#000" fill-opacity="${g.dark ? '.45' : '.18'}"/>
    <path d="M392 62 C430 122 570 122 608 62" fill="none" stroke="${g.hex}" stroke-width="16"/>
    <path d="M392 62 C430 122 570 122 608 62" fill="none" stroke="#000" stroke-opacity=".16" stroke-width="16"/>
    <path d="${BODY}" fill="none" stroke="#000" stroke-opacity=".18" stroke-width="2"/>
  </svg>`;
}
