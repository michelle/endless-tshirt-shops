// Generative design engine (isomorphic: runs in the browser for the live
// preview and on the server for the print-ready PNG).
//
// A design is a deterministic function of its parameters, so the same inputs
// always produce the same one-of-one artwork. Text is drawn through a
// TextRenderer so the browser can use web fonts and the server can convert
// glyphs to vector outlines (no font dependencies at print time).

import { getPalette, getStyle, PRINT_HEIGHT, PRINT_WIDTH } from './theme';

export type DesignParams = {
  name: string;
  word: string;
  palette: string;
  style: string;
  shirt: string;
};

export type TextSpec = {
  size: number;
  font: 'display' | 'sans';
  weight: number;
  tracking: number;
  fill: string;
  opacity: number;
};

export type TextRenderer = {
  render(text: string, spec: TextSpec, x: number, y: number): string;
};

/**
 * Deterministic width estimate used for auto-fitting text. Kept independent of
 * the renderer so the browser preview and the print file choose the same size.
 */
function estimateWidth(text: string, spec: TextSpec): number {
  const factor = spec.font === 'display' ? 0.6 : 0.68;
  const n = Array.from(text).length;
  return n * spec.size * factor + Math.max(0, n - 1) * spec.tracking;
}

/* ------------------------------------------------------------------ */
/* Deterministic noise helpers                                        */
/* ------------------------------------------------------------------ */

function hashStr(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Smooth, periodic 1-D wave built from seeded harmonics. */
function makeWave(seed: number, harmonics: number) {
  const rnd = mulberry32(seed);
  const terms: { m: number; amp: number; phase: number; radial: number }[] = [];
  for (let m = 1; m <= harmonics; m++) {
    terms.push({
      m,
      amp: 1 / Math.pow(m, 0.82),
      phase: rnd() * Math.PI * 2,
      radial: (rnd() - 0.5) * 2,
    });
  }
  return function wave(theta: number, r: number): number {
    let v = 0;
    for (const t of terms) {
      v += t.amp * Math.sin(t.m * theta + t.phase + r * 0.0026 * t.radial);
    }
    return v;
  };
}

function smoothClosedPath(pts: [number, number][]): string {
  const n = pts.length;
  if (n < 3) return '';
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d + ' Z';
}

function openPath(pts: [number, number][]): string {
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) d += ` L ${pts[i][0].toFixed(1)} ${pts[i][1].toFixed(1)}`;
  return d;
}

function xmlEscape(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c] as string));
}

/* ------------------------------------------------------------------ */
/* Geometry constants                                                 */
/* ------------------------------------------------------------------ */

const W = PRINT_WIDTH;
const H = PRINT_HEIGHT;
const CX = W / 2;
const CY = 2610;
const R = 1830; // medallion radius (~12.2in diameter)
const INNER = 0.44 * R; // clear zone for the name

/* ------------------------------------------------------------------ */
/* Art styles                                                         */
/* ------------------------------------------------------------------ */

function topoArt(seed: number, palette: ReturnType<typeof getPalette>): string {
  const wave = makeWave(seed, 9);
  const rnd = mulberry32(seed ^ 0x9e3779b9);
  const rings = 18;
  const steps = 130;
  const outer = R * 0.982;
  const parts: string[] = [];

  for (let i = 0; i < rings; i++) {
    const t = i / (rings - 1);
    const base = INNER + (outer - INNER) * Math.pow(t, 1.08) + (rnd() - 0.5) * 10;
    const amp = 22 + 84 * t;
    const pts: [number, number][] = [];
    for (let k = 0; k < steps; k++) {
      const theta = (k / steps) * Math.PI * 2;
      const rad = base + wave(theta, base) * amp;
      pts.push([CX + Math.cos(theta) * rad, CY + Math.sin(theta) * rad]);
    }
    const op = 0.24 + 0.5 * Math.abs(Math.sin(i * 1.7 + seed * 0.01)) + 0.12 * t;
    const sw = 5.5 + 2.5 * t;
    parts.push(`<path d="${smoothClosedPath(pts)}" fill="none" stroke="url(#ink)" stroke-width="${sw.toFixed(1)}" opacity="${Math.min(op, 0.95).toFixed(2)}" stroke-linecap="round"/>`);
  }

  // A handful of bright accent rings for depth.
  const accents = 3 + Math.floor(rnd() * 2);
  for (let a = 0; a < accents; a++) {
    const t = rnd();
    const base = INNER + (outer - INNER) * t;
    const amp = 22 + 84 * t;
    const pts: [number, number][] = [];
    for (let k = 0; k < steps; k++) {
      const theta = (k / steps) * Math.PI * 2;
      const rad = base + wave(theta, base) * amp;
      pts.push([CX + Math.cos(theta) * rad, CY + Math.sin(theta) * rad]);
    }
    const col = palette.colors[Math.floor(rnd() * palette.colors.length)];
    parts.push(`<path d="${smoothClosedPath(pts)}" fill="none" stroke="${col}" stroke-width="${(3 + rnd() * 3).toFixed(1)}" opacity="${(0.35 + rnd() * 0.4).toFixed(2)}"/>`);
  }

  // Scattered dust.
  parts.push(dust(seed ^ 0x1234, palette, 40));
  return parts.join('');
}

function raysArt(seed: number, palette: ReturnType<typeof getPalette>): string {
  const wave = makeWave(seed, 7);
  const rnd = mulberry32(seed ^ 0x51ed270b);
  const parts: string[] = [];
  const count = 115;
  const outer = R * 0.985;

  for (let i = 0; i < count; i++) {
    const theta = (i / count) * Math.PI * 2 + (rnd() - 0.5) * 0.02;
    const reach = 0.55 + 0.42 * (0.5 + 0.5 * wave(theta * 3.0, 900));
    const rOuter = outer * reach;
    const rInner = INNER + 30 + rnd() * 90;
    const bow = (rnd() - 0.5) * 120;
    const midR = (rInner + rOuter) / 2 + bow;
    const midTheta = theta + (rnd() - 0.5) * 0.06;
    const p0 = [CX + Math.cos(theta) * rInner, CY + Math.sin(theta) * rInner];
    const p1 = [CX + Math.cos(midTheta) * midR, CY + Math.sin(midTheta) * midR];
    const p2 = [CX + Math.cos(theta) * rOuter, CY + Math.sin(theta) * rOuter];
    const op = 0.18 + 0.62 * rnd();
    const sw = 2 + rnd() * 7;
    parts.push(`<path d="M ${p0[0].toFixed(1)} ${p0[1].toFixed(1)} Q ${p1[0].toFixed(1)} ${p1[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}" fill="none" stroke="url(#ink)" stroke-width="${sw.toFixed(1)}" opacity="${op.toFixed(2)}" stroke-linecap="round"/>`);
  }

  // Concentric rings.
  const ringCount = 5 + Math.floor(rnd() * 4);
  for (let i = 0; i < ringCount; i++) {
    const t = 0.2 + (i / ringCount) * 0.78;
    const rr = R * t * (0.98 + rnd() * 0.02);
    const op = 0.2 + rnd() * 0.4;
    parts.push(`<circle cx="${CX}" cy="${CY}" r="${rr.toFixed(1)}" fill="none" stroke="url(#ink)" stroke-width="${(2 + rnd() * 4).toFixed(1)}" opacity="${op.toFixed(2)}"/>`);
  }

  parts.push(dust(seed ^ 0x77aa11, palette, 45));
  return parts.join('');
}

function orbitArt(seed: number, palette: ReturnType<typeof getPalette>): string {
  const rnd = mulberry32(seed ^ 0x2545f491);
  const parts: string[] = [];
  const orbits = 6 + Math.floor(rnd() * 4);

  for (let i = 0; i < orbits; i++) {
    const rr = INNER * 0.7 + (R * 0.95 - INNER * 0.7) * ((i + 0.6) / orbits);
    const rx = rr * (0.86 + rnd() * 0.28);
    const ry = rr * (0.5 + rnd() * 0.4);
    const rot = rnd() * 180;
    const op = 0.2 + rnd() * 0.45;
    const col = palette.colors[Math.floor(rnd() * palette.colors.length)];
    parts.push(`<ellipse cx="${CX}" cy="${CY}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" transform="rotate(${rot.toFixed(1)} ${CX} ${CY})" fill="none" stroke="${col}" stroke-width="${(2 + rnd() * 4).toFixed(1)}" opacity="${op.toFixed(2)}"/>`);

    // Dust travelling along the orbit.
    const n = 10 + Math.floor(rnd() * 16);
    for (let k = 0; k < n; k++) {
      const a = rnd() * Math.PI * 2;
      const px = Math.cos(a) * rx;
      const py = Math.sin(a) * ry;
      const rad = Math.PI * (rot / 180);
      const x = CX + px * Math.cos(rad) - py * Math.sin(rad);
      const y = CY + px * Math.sin(rad) + py * Math.cos(rad);
      parts.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(2 + rnd() * 8).toFixed(1)}" fill="${palette.colors[Math.floor(rnd() * palette.colors.length)]}" opacity="${(0.25 + rnd() * 0.55).toFixed(2)}"/>`);
    }
  }

  // Central core.
  parts.push(`<circle cx="${CX}" cy="${CY}" r="${(INNER * 0.62).toFixed(1)}" fill="none" stroke="url(#ink)" stroke-width="6" opacity="0.5"/>`);
  parts.push(dust(seed ^ 0x0badf00d, palette, 50));
  return parts.join('');
}

function dust(seed: number, palette: ReturnType<typeof getPalette>, count: number): string {
  const rnd = mulberry32(seed);
  const parts: string[] = [];
  for (let i = 0; i < count; i++) {
    const a = rnd() * Math.PI * 2;
    const rr = INNER * 0.5 + rnd() * (R * 0.94 - INNER * 0.5);
    const x = CX + Math.cos(a) * rr;
    const y = CY + Math.sin(a) * rr;
    const r = 2 + rnd() * 9;
    const col = palette.colors[Math.floor(rnd() * palette.colors.length)];
    parts.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${col}" opacity="${(0.18 + rnd() * 0.55).toFixed(2)}"/>`);
  }
  return parts.join('');
}

/* ------------------------------------------------------------------ */
/* Main SVG builder                                                   */
/* ------------------------------------------------------------------ */

export function normalizeName(raw: string): string {
  return (raw || '').replace(/\s+/g, ' ').trim().slice(0, 26);
}

export function normalizeWord(raw: string): string {
  return (raw || '').replace(/\s+/g, ' ').trim().slice(0, 22);
}

export function buildDesignSvg(params: DesignParams, renderText: TextRenderer): string {
  const palette = getPalette(params.palette);
  const style = getStyle(params.style);
  const name = normalizeName(params.name) || 'Your Name';
  const word = normalizeWord(params.word);
  const seed = hashStr(`${name.toLowerCase()}|${params.palette}|${style}`);

  const art = style === 'rays' ? raysArt(seed, palette) : style === 'orbit' ? orbitArt(seed, palette) : topoArt(seed, palette);

  // Gradient direction varies per seed.
  const rnd = mulberry32(seed ^ 0xabcdef);
  const angle = rnd() * Math.PI * 2;
  const gx1 = (0.5 - Math.cos(angle) * 0.5).toFixed(3);
  const gy1 = (0.5 - Math.sin(angle) * 0.5).toFixed(3);
  const gx2 = (0.5 + Math.cos(angle) * 0.5).toFixed(3);
  const gy2 = (0.5 + Math.sin(angle) * 0.5).toFixed(3);
  const stops = palette.colors
    .map((c, i) => `<stop offset="${(i / (palette.colors.length - 1)).toFixed(3)}" stop-color="${c}"/>`)
    .join('');

  // Auto-fit the name inside the clear zone.
  const nameMaxWidth = INNER * 1.72;
  let nameSize = 372;
  const measured = estimateWidth(name, { size: nameSize, font: 'display', weight: 700, tracking: 0, fill: '#fff', opacity: 1 });
  if (measured > nameMaxWidth) nameSize = Math.floor((nameSize * nameMaxWidth) / measured);

  const nameBaseline = CY + nameSize * 0.33;
  const nameEl = renderText.render(name, { size: nameSize, font: 'display', weight: 700, tracking: 0, fill: '#F8FAFC', opacity: 1 }, CX, nameBaseline);

  const wordSize = 104;
  const wordTracking = wordSize * 0.34;
  const wordEl = word
    ? renderText.render(
        word.toUpperCase(),
        { size: wordSize, font: 'sans', weight: 600, tracking: wordTracking, fill: palette.accent, opacity: 0.95 },
        CX,
        nameBaseline + nameSize * 0.52 + wordSize * 1.15,
      )
    : '';

  // Small sparkle above the name.
  const sparkleY = CY - nameSize * 0.78;
  const sparkle = `<path d="M ${CX} ${sparkleY - 46} L ${CX + 12} ${sparkleY - 12} L ${CX + 46} ${sparkleY} L ${CX + 12} ${sparkleY + 12} L ${CX} ${sparkleY + 46} L ${CX - 12} ${sparkleY + 12} L ${CX - 46} ${sparkleY} L ${CX - 12} ${sparkleY - 12} Z" fill="${palette.accent}" opacity="0.95"/>`;

  // Perimeter ticks.
  const ticks: string[] = [];
  const tickCount = 72;
  for (let i = 0; i < tickCount; i++) {
    const a = (i / tickCount) * Math.PI * 2;
    const long = i % 6 === 0;
    const r1 = R - (long ? 58 : 34);
    const r2 = R - 12;
    ticks.push(
      `<line x1="${(CX + Math.cos(a) * r1).toFixed(1)}" y1="${(CY + Math.sin(a) * r1).toFixed(1)}" x2="${(CX + Math.cos(a) * r2).toFixed(1)}" y2="${(CY + Math.sin(a) * r2).toFixed(1)}" stroke="#F8FAFC" stroke-width="${long ? 5 : 3}" opacity="${long ? 0.7 : 0.35}"/>`,
    );
  }

  // Footer mark under the medallion.
  const footerY = CY + R + 250;
  const footerEl = renderText.render('ONE OF ONE', { size: 86, font: 'sans', weight: 500, tracking: 86 * 0.45, fill: '#F8FAFC', opacity: 0.55 }, CX, footerY);
  const footerWidth = estimateWidth('ONE OF ONE', { size: 86, font: 'sans', weight: 500, tracking: 86 * 0.45, fill: '#fff', opacity: 1 });
  const ruleGap = footerWidth / 2 + 90;
  const rules = `<line x1="${(CX - ruleGap - 150).toFixed(1)}" y1="${(footerY - 28).toFixed(1)}" x2="${(CX - ruleGap).toFixed(1)}" y2="${(footerY - 28).toFixed(1)}" stroke="#F8FAFC" stroke-width="3" opacity="0.4"/><line x1="${(CX + ruleGap).toFixed(1)}" y1="${(footerY - 28).toFixed(1)}" x2="${(CX + ruleGap + 150).toFixed(1)}" y2="${(footerY - 28).toFixed(1)}" stroke="#F8FAFC" stroke-width="3" opacity="0.4"/>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="disc" cx="50%" cy="42%" r="68%">
      <stop offset="0%" stop-color="#18203a"/>
      <stop offset="52%" stop-color="#0b1120"/>
      <stop offset="100%" stop-color="#04060c"/>
    </radialGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${palette.accent}" stop-opacity="0.30"/>
      <stop offset="45%" stop-color="${palette.accent}" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="${palette.accent}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="ink" x1="${gx1}" y1="${gy1}" x2="${gx2}" y2="${gy2}">
      ${stops}
    </linearGradient>
    <clipPath id="discClip"><circle cx="${CX}" cy="${CY}" r="${R - 6}"/></clipPath>
  </defs>

  <!-- medallion -->
  <circle cx="${CX}" cy="${CY}" r="${R}" fill="url(#disc)"/>
  <circle cx="${CX}" cy="${CY}" r="${R}" fill="url(#glow)"/>
  <g clip-path="url(#discClip)">
    ${art}
  </g>

  <!-- rings -->
  <circle cx="${CX}" cy="${CY}" r="${R - 9}" fill="none" stroke="#F8FAFC" stroke-width="4" opacity="0.5"/>
  <circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="#F8FAFC" stroke-width="9" opacity="0.92"/>
  ${ticks.join('')}

  <!-- centre -->
  ${sparkle}
  ${nameEl}
  ${wordEl}

  <!-- footer -->
  ${rules}
  ${footerEl}
</svg>`;
}

export const DESIGN_CANVAS = { width: W, height: H };
