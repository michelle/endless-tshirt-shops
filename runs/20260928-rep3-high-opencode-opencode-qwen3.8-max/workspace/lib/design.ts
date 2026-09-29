// Renders a personalised star chart as an SVG document at print resolution
// (2480 x 3507 px — the resolution Prodigi wants for the BC3001 front print
// area). The same markup powers the live browser preview (scaled with CSS)
// and the print raster (via resvg on the server).

import { birthMoment, formatCoords } from './time';
import {
  blendHex,
  computeSky,
  project,
  starNaturalColor,
  starRadius,
} from './skymap';
import { paletteFor, type DesignParams, type InkPalette } from './types';

export const PRINT_W = 2480;
export const PRINT_H = 3507;
const CX = PRINT_W / 2;
const CY = 1560;
const R = 980;

const CINZEL = "'Cinzel', 'Times New Roman', serif";
const CORMORANT = "'Cormorant Garamond', 'Times New Roman', serif";

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Illuminated-limb path for a moon disc. */
export function moonGlyphPath(cx: number, cy: number, r: number, k: number, waxing: boolean): string {
  const kk = Math.max(0.0001, Math.min(0.9999, k));
  const rx = Math.max(0.5, r * Math.abs(1 - 2 * kk));
  const outerSweep = waxing ? 1 : 0;
  const termSweep = kk >= 0.5 ? outerSweep : waxing ? 0 : 1;
  return [
    `M ${cx} ${cy - r}`,
    `A ${r} ${r} 0 0 ${outerSweep} ${cx} ${cy + r}`,
    `A ${rx} ${r} 0 0 ${termSweep} ${cx} ${cy - r}`,
    'Z',
  ].join(' ');
}

function text(
  x: number,
  y: number,
  content: string,
  opts: {
    size: number;
    family?: string;
    weight?: number;
    fill: string;
    opacity?: number;
    ls?: number;
    anchor?: 'start' | 'middle' | 'end';
    italic?: boolean;
  }
): string {
  const {
    size,
    family = CINZEL,
    weight = 400,
    fill,
    opacity = 1,
    ls = 0,
    anchor = 'middle',
    italic = false,
  } = opts;
  return `<text x="${x}" y="${y}" font-family="${family}" font-size="${size}" font-weight="${weight}" font-style="${italic ? 'italic' : 'normal'}" fill="${fill}" fill-opacity="${opacity}" letter-spacing="${ls}" text-anchor="${anchor}">${esc(content)}</text>`;
}

interface RenderOpts {
  /** drop the chart furniture that only matters at print scale */
  paletteOverride?: InkPalette;
}

export function renderDesign(design: DesignParams, opts: RenderOpts = {}): string {
  const moment = birthMoment(design);
  const sky = computeSky(moment.utcMs, design.lat, design.lon);
  const pal = opts.paletteOverride ?? paletteFor(designShirtColor(design), design.style);
  const { ink, accent } = pal;

  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${PRINT_W}" height="${PRINT_H}" viewBox="0 0 ${PRINT_W} ${PRINT_H}">`
  );
  parts.push(
    `<defs><clipPath id="sky"><circle cx="${CX}" cy="${CY}" r="${R}"/></clipPath></defs>`
  );

  // --- header -------------------------------------------------------------
  parts.push(text(CX, 350, 'STARRYBORN', { size: 56, weight: 600, fill: ink, opacity: 0.92, ls: 26 }));
  // ornament rule with a diamond
  parts.push(
    `<g stroke="${ink}" stroke-opacity="0.38" stroke-width="2">`,
    `<line x1="${CX - 460}" y1="452" x2="${CX - 40}" y2="452"/>`,
    `<line x1="${CX + 40}" y1="452" x2="${CX + 460}" y2="452"/>`,
    `</g>`,
    `<rect x="${CX - 11}" y="441" width="22" height="22" transform="rotate(45 ${CX} 452)" fill="${accent}" fill-opacity="0.85"/>`,
    `<circle cx="${CX - 480}" cy="452" r="5" fill="${ink}" fill-opacity="0.4"/>`,
    `<circle cx="${CX + 480}" cy="452" r="5" fill="${ink}" fill-opacity="0.4"/>`
  );

  // --- chart rings & ticks --------------------------------------------------
  parts.push(
    `<circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="${ink}" stroke-opacity="0.85" stroke-width="6"/>`,
    `<circle cx="${CX}" cy="${CY}" r="${R - 26}" fill="none" stroke="${ink}" stroke-opacity="0.5" stroke-width="2"/>`
  );
  const tickParts: string[] = [];
  for (let az = 0; az < 360; az += 5) {
    const major = az % 45 === 0;
    const mid = az % 15 === 0;
    const r1 = R - 26;
    const r2 = major ? R - 4 : mid ? R - 10 : R - 16;
    const a = (az * Math.PI) / 180;
    const x1 = CX - r1 * Math.sin(a), y1 = CY - r1 * Math.cos(a);
    const x2 = CX - r2 * Math.sin(a), y2 = CY - r2 * Math.cos(a);
    tickParts.push(
      `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${ink}" stroke-opacity="${major ? 0.7 : 0.35}" stroke-width="${major ? 4 : 2}"/>`
    );
  }
  parts.push(tickParts.join(''));
  // cardinals
  const cardinalR = R - 92;
  const cardinals: [string, number][] = [['N', 0], ['E', 90], ['S', 180], ['W', 270]];
  for (const [label, az] of cardinals) {
    const a = (az * Math.PI) / 180;
    const x = CX - cardinalR * Math.sin(a);
    const y = CY - cardinalR * Math.cos(a);
    parts.push(
      text(x, y + 22, label, { size: 62, weight: 600, fill: ink, opacity: label === 'N' ? 0.95 : 0.7, ls: 0 })
    );
  }
  // altitude circles (dashed)
  parts.push(
    `<circle cx="${CX}" cy="${CY}" r="${(R * 2) / 3}" fill="none" stroke="${ink}" stroke-opacity="0.16" stroke-width="2" stroke-dasharray="6 14"/>`,
    `<circle cx="${CX}" cy="${CY}" r="${R / 3}" fill="none" stroke="${ink}" stroke-opacity="0.16" stroke-width="2" stroke-dasharray="6 14"/>`
  );

  // --- sky contents (clipped to the horizon circle) --------------------------
  parts.push(`<g clip-path="url(#sky)">`);

  // constellation lines
  const lineParts: string[] = [];
  for (const c of sky.constellations) {
    for (const seg of c.segments) {
      const a = project(seg.a.alt, seg.a.az, CX, CY, R);
      const b = project(seg.b.alt, seg.b.az, CX, CY, R);
      lineParts.push(
        `<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" stroke="${ink}" stroke-opacity="0.34" stroke-width="4" stroke-linecap="round"/>`
      );
    }
  }
  parts.push(lineParts.join(''));

  // stars
  const starParts: string[] = [];
  for (const s of sky.stars) {
    const p = project(s.alt, s.az, CX, CY, R);
    const r = starRadius(s.mag);
    const col = blendHex(starNaturalColor(s.ci), accent, 1 - pal.starNatural);
    if (s.mag <= 1.0) {
      starParts.push(
        `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${(r * 2.7).toFixed(1)}" fill="${col}" fill-opacity="0.10"/>`,
        `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${(r * 1.7).toFixed(1)}" fill="${col}" fill-opacity="0.16"/>`
      );
    }
    starParts.push(
      `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${r.toFixed(2)}" fill="${col}" fill-opacity="${s.mag > 4.5 ? 0.85 : 1}"/>`
    );
  }
  parts.push(starParts.join(''));

  // sun (if above the horizon — the chart is honest about daylight births)
  if (sky.sun.alt > -0.8) {
    const p = project(sky.sun.alt, sky.sun.az, CX, CY, R);
    const rays: string[] = [];
    for (let i = 0; i < 12; i++) {
      const a = (i * 30 * Math.PI) / 180;
      rays.push(
        `<line x1="${(p.x + 58 * Math.sin(a)).toFixed(1)}" y1="${(p.y - 58 * Math.cos(a)).toFixed(1)}" x2="${(p.x + 86 * Math.sin(a)).toFixed(1)}" y2="${(p.y - 86 * Math.cos(a)).toFixed(1)}" stroke="${pal.sun}" stroke-width="6" stroke-linecap="round"/>`
      );
    }
    parts.push(
      `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="92" fill="${pal.sun}" fill-opacity="0.14"/>`,
      rays.join(''),
      `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="42" fill="${pal.sun}"/>`
    );
  }

  // moon in situ
  if (sky.moon.alt > -0.8) {
    const p = project(sky.moon.alt, sky.moon.az, CX, CY, R);
    const r = 64;
    parts.push(
      `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${r * 1.5}" fill="${accent}" fill-opacity="0.10"/>`,
      `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${r}" fill="${ink}" fill-opacity="0.10" stroke="${ink}" stroke-opacity="0.3" stroke-width="2"/>`,
      `<path d="${moonGlyphPath(p.x, p.y, r, sky.moonPhase.illumination, sky.moonPhase.waxing)}" fill="${accent}"/>`
    );
  }

  parts.push(`</g>`); // end clipped sky

  // --- star labels (outside the clip so they can breathe near the rim) -------
  const labelable = sky.stars
    .filter((s) => s.proper && s.mag <= 1.85 && s.alt > 10)
    .sort((a, b) => a.mag - b.mag)
    .slice(0, 14);
  for (const s of labelable) {
    const p = project(s.alt, s.az, CX, CY, R);
    const right = p.x < CX + R - 300;
    const x = p.x + (right ? starRadius(s.mag) + 18 : -(starRadius(s.mag) + 18));
    parts.push(
      text(x, p.y - starRadius(s.mag) - 12, s.proper.toUpperCase(), {
        size: 40,
        weight: 600,
        fill: ink,
        opacity: 0.8,
        ls: 4,
        anchor: right ? 'start' : 'end',
      })
    );
  }

  // --- moon phase badge -------------------------------------------------------
  {
    const gy = 2748;
    const r = 52;
    parts.push(
      `<circle cx="${CX}" cy="${gy}" r="${r}" fill="${ink}" fill-opacity="0.08" stroke="${ink}" stroke-opacity="0.3" stroke-width="2"/>`,
      `<path d="${moonGlyphPath(CX, gy, r, sky.moonPhase.illumination, sky.moonPhase.waxing)}" fill="${accent}"/>`
    );
    const illumPct = Math.round(sky.moonPhase.illumination * 100);
    parts.push(
      text(CX, 2888, `${sky.moonPhase.name.toUpperCase()} · ${illumPct}% ILLUMINATED`, {
        size: 42,
        fill: ink,
        opacity: 0.85,
        ls: 8,
      })
    );
  }

  // --- name, date, place, message ----------------------------------------------
  const name = design.name.trim();
  const nameSize = Math.max(96, Math.min(168, Math.round((168 * 17) / Math.max(17, name.length))));
  parts.push(
    text(CX, 3060, name, { size: nameSize, family: CORMORANT, weight: 600, fill: ink, ls: 3 })
  );

  parts.push(
    text(CX, 3178, moment.shirtDateLine.toUpperCase(), { size: 50, fill: ink, opacity: 0.9, ls: 10 })
  );

  const placeUp = design.place.trim().toUpperCase();
  const coords = formatCoords(design.lat, design.lon);
  if (placeUp.length > 36) {
    parts.push(text(CX, 3272, placeUp, { size: 44, fill: ink, opacity: 0.78, ls: 6 }));
    parts.push(text(CX, 3338, coords.toUpperCase(), { size: 40, fill: ink, opacity: 0.62, ls: 6 }));
  } else {
    parts.push(
      text(CX, 3286, `${placeUp} · ${coords.toUpperCase()}`, { size: 44, fill: ink, opacity: 0.75, ls: 6 })
    );
  }

  if (design.msg) {
    const msg = design.msg.trim();
    const msgSize = Math.max(40, Math.min(58, Math.round((58 * 52) / Math.max(52, msg.length))));
    parts.push(
      text(CX, 3430, msg, { size: msgSize, family: CORMORANT, weight: 500, italic: true, fill: ink, opacity: 0.88, ls: 1 })
    );
  }

  parts.push('</svg>');
  return parts.join('');
}

// The design params do not carry the shirt colour (that is a product option),
// but the renderer needs it for the ink palette. Callers pass it through the
// palette override, or we fall back to black. This helper keeps renderDesign
// pure when called with a combined object from the storefront.
function designShirtColor(design: DesignParams & { color?: string }): string {
  return design.color ?? 'black';
}

/** Convenience wrapper used by the storefront and API routes. */
export function renderDesignForShirt(
  design: DesignParams,
  shirtColorId: string,
): string {
  return renderDesign(design, { paletteOverride: paletteFor(shirtColorId, design.style) });
}
