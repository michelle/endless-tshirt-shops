// Garment mock-up. The plate is dropped into the chest panel at the same
// proportions Prodigi will print it, so the preview is an honest one.

import { plateSvgBody, CANVAS_W, CANVAS_H } from './plate';
import type { Specimen } from '../species';
import { n } from './geom';

// Drawn to the flat measurements of the garment we actually sell: a 20in chest
// on a 29in body, sleeve-to-sleeve about 1.6x the chest.
const SHIRT_BODY =
  'M245 44C224 48 208 55 196 66C160 92 118 134 88 178C84 186 88 194 96 196' +
  'L152 212C160 214 166 210 166 202L162 176L154 418C153 432 161 440 175 440' +
  'L425 440C439 440 447 432 446 418L438 176L434 202C434 210 440 214 448 212' +
  'L504 196C512 194 516 186 512 178C482 134 440 92 404 66' +
  'C392 55 376 48 355 44C347 84 326 100 300 100C274 100 253 84 245 44Z';

const COLLAR_INNER = 'M245 44C253 84 274 100 300 100C326 100 347 84 355 44';
const COLLAR_OUTER = 'M238 37C247 82 272 96 300 96C328 96 353 82 362 37';

// A 12in x 16in chest print on a 20in-wide garment: 60% of the chest, sitting
// a hand's width below the collar. Matches what Prodigi will actually press.
const PRINT = { x: 217, y: 126, w: 166, h: (166 * CANVAS_H) / CANVAS_W };

export function shirtSvg(sp: Specimen, garmentHex: string, dark: boolean): string {
  const scale = PRINT.w / CANVAS_W;
  const shade = dark ? 'rgba(0,0,0,0.42)' : 'rgba(58,50,36,0.24)';
  const lift = dark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.4)';
  // Ids must be unique when several shirts share a page.
  const uid = `t${sp.seed.toString(36)}${dark ? 'd' : 'l'}`;

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="72 30 456 424" role="img" ` +
    `aria-label="The ${sp.taxon.genus} ${sp.taxon.epithet} plate printed on a t-shirt">` +
      `<defs>` +
        `<clipPath id="${uid}c"><path d="${SHIRT_BODY}"/></clipPath>` +
        `<linearGradient id="${uid}f" x1="0" y1="0" x2="1" y2="0">` +
          `<stop offset="0" stop-color="${shade}"/>` +
          `<stop offset="0.15" stop-color="rgba(0,0,0,0)"/>` +
          `<stop offset="0.45" stop-color="${lift}"/>` +
          `<stop offset="0.66" stop-color="rgba(0,0,0,0)"/>` +
          `<stop offset="1" stop-color="${shade}"/>` +
        `</linearGradient>` +
        `<radialGradient id="${uid}n" cx="0.5" cy="0" r="0.75">` +
          `<stop offset="0" stop-color="${shade}"/>` +
          `<stop offset="1" stop-color="rgba(0,0,0,0)"/>` +
        `</radialGradient>` +
      `</defs>` +

      `<path d="${SHIRT_BODY}" fill="${garmentHex}"/>` +
      `<g clip-path="url(#${uid}c)">` +
        `<rect x="72" y="30" width="456" height="424" fill="url(#${uid}f)" opacity="0.5"/>` +
        `<rect x="150" y="26" width="300" height="180" fill="url(#${uid}n)" opacity="0.6"/>` +
        // The clip must sit on an ancestor of the scaled group: a clip path is
        // resolved in the referencing element's own (already transformed) space.
        `<g transform="translate(${n(PRINT.x)} ${n(PRINT.y)}) scale(${n(scale)})">` +
          plateSvgBody(sp, { dark }) +
        `</g>` +
      `</g>` +

      // Collar rib, cuff seams and hem, over the print so the shirt reads as cloth.
      `<path d="${COLLAR_INNER}" fill="none" stroke="${shade}" stroke-width="8" stroke-opacity="0.55"/>` +
      `<path d="${COLLAR_OUTER}" fill="none" stroke="${lift}" stroke-width="2.5" stroke-opacity="0.75"/>` +
      `<path d="M96 196L152 212" fill="none" stroke="${shade}" stroke-width="3" stroke-opacity="0.4"/>` +
      `<path d="M504 196L448 212" fill="none" stroke="${shade}" stroke-width="3" stroke-opacity="0.4"/>` +
      `<path d="M158 424L442 424" fill="none" stroke="${shade}" stroke-width="2.5" stroke-opacity="0.3"/>` +
      `<path d="${SHIRT_BODY}" fill="none" stroke="rgba(32,29,23,0.3)" stroke-width="1.4"/>` +
    `</svg>`
  );
}
