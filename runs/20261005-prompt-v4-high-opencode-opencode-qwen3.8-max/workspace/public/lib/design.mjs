// Heliogram — the design engine. Builds the full print artwork as an SVG string
// from a place + personal markers. One source of truth for:
//   • the live browser preview (SVG dropped into the page)
//   • the 4677×5787 @300dpi PNG rendered server-side for Prodigi (via resvg)
//
// The dial: day-of-year around the circle (Jan 1 at top, clockwise),
// local solar time along the radius (0h inner → 24h outer, noon mid-radius).
// Nested bands show where the sun sits: night (stars), astronomical /
// nautical / civil twilight, daylight, strong light, high sun.

import {
  ALTITUDES, yearTable, doyOfMonthDay, monthStarts, MONTH_NAMES,
  formatHM, formatLat, formatLon, monthDayOfDoy, daysInYear,
} from './astro.mjs';

export const PRINT_W = 4677;
export const PRINT_H = 5787;

export const LAYOUT = {
  cx: 2338, cy: 2160,
  r0: 500,      // radius of solar midnight (0h / 24h)
  r24: 1500,    // radius of the outer frame (24h)
  monthTicksOut: 50,
  monthLabelR: 118,   // beyond r24
  markerGlyphR: 185,  // beyond r24
  markerLabelR: 250,
  markerDateR: 312,
  titleR: 1930,
  medallionR: 2030,
};

const CX = LAYOUT.cx, CY = LAYOUT.cy;
const R0 = LAYOUT.r0, R24 = LAYOUT.r24;
const NOON_R = (R0 + R24) / 2;

export const YEAR = 2026; // the "typical year" the dial computes (non-leap)

// Palette per variant. Dark variant: transparent ground — the garment IS the
// night. Light variant: everything sits on a deep-navy medallion.
// All colours pre-blended to be opaque (translucent gradients print muddy on DTG).
export const PALETTES = {
  dark: {
    ground: null,
    astro: '#26325C', naut: '#354478', civil: '#4C58A0',
    day: '#D9902F', gold: '#EDAF45', bright: '#F9C962',
    edge: '#FFE3AE', frame: '#EFE6D2', frameSoft: '#8B8471',
    starWarm: '#FFF4DC', starCool: '#C9D8FF',
    title: '#EFE6D2', accent: '#F9C962',
    markerStar: '#F9C962', markerLabel: '#EFE6D2', markerLine: '#8B8471',
    city: '#F5EEDD', meta: '#CFC6B2', dedication: '#EFC271', brand: '#9A927E',
    medallionEdge: null, sunCore: '#FDE7A9', sunRay: '#EFC271',
  },
  light: {
    ground: 'medallion',
    astro: '#2E3D6E', naut: '#41548F', civil: '#5E68B8',
    day: '#E39B33', gold: '#F2B64C', bright: '#FBCF68',
    edge: '#FFE3AE', frame: '#F2E9D6', frameSoft: '#93A0C4',
    starWarm: '#FFF4DC', starCool: '#C9D8FF',
    title: '#F2E9D6', accent: '#F9C962',
    markerStar: '#F9C962', markerLabel: '#F2E9D6', markerLine: '#93A0C4',
    city: '#14243F', meta: '#3A4A68', dedication: '#A85A1E', brand: '#3A4A68',
    medallionEdge: '#C9A25A', sunCore: '#FDE7A9', sunRay: '#EFC271',
  },
};

// Garments offered; `variant` selects the artwork treatment.
export const SHIRTS = {
  black:               { label: 'Black',              hex: '#141414', variant: 'dark' },
  navy:                { label: 'Navy Blue',          hex: '#1D2A44', variant: 'dark' },
  asphalt:             { label: 'Asphalt',            hex: '#3A3A3C', variant: 'dark' },
  darkheather:         { label: 'Dark Heather Grey',  hex: '#4A4C50', variant: 'dark' },
  white:               { label: 'White',              hex: '#F4F2EC', variant: 'light' },
  cream:               { label: 'Cream',              hex: '#EFE6D2', variant: 'light' },
  heather:             { label: 'Athletic Grey',      hex: '#B9BCC2', variant: 'light' },
};

// Prodigi attribute values (lowercase, validated against the sandbox API).
export const PRODIGI_COLOR = {
  black: 'black', navy: 'navy blue', asphalt: 'asphalt', darkheather: 'dark heather grey',
  white: 'white', cream: 'cream', heather: 'athletic grey heather',
};
export const SIZES = ['xs', 's', 'm', 'l', 'xl', '2xl', '3xl'];
export const SKU = 'GLOBAL-TEE-BC-3001'; // Bella+Canvas 3001, DTG front print

// ---------- small helpers ----------

const esc = (s) => String(s ?? '')
  .replace(/[\u0000-\u001f\u007f]/g, '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/** FNV-1a 32-bit hash. */
export function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** radius for a solar-time hour */
const rOf = (t) => R0 + (t / 24) * (R24 - R0);

/** point on the dial; angle in degrees clockwise from 12 o'clock */
const pt = (angleDeg, r) => {
  const a = (angleDeg - 90) * Math.PI / 180; // svg 0° = +x axis
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
};

const angleOfDoy = (doyFrac, n) => ((doyFrac - 0.5) / n) * 360;

/**
 * Text along an arc, one <text> per glyph (no textPath — renders identically
 * in resvg and every browser). Angles clockwise from top.
 * On the lower part of the dial glyphs flip 180° so nothing reads upside down;
 * the run direction reverses and the baseline shifts outward to keep the ring.
 */
function arcText(cx, cy, r, centerAngle, text, opts) {
  const { size, family, fill, tracking = 0.16, widthFactor = 0.72, opacity = 1 } = opts;
  const norm = ((centerAngle % 360) + 360) % 360;
  const flip = norm > 100 && norm < 260;
  const chars = [...text];
  const adv = chars.map((c) => size * (charFactor(c, widthFactor) + tracking));
  const total = adv.reduce((a, b) => a + b, 0);
  const step = (a) => (a / r) * 180 / Math.PI;
  const totalAngle = step(total);
  // non-flip: baseline at r, glyphs extend outward → shift inward to centre the ring
  // flip: glyphs extend inward → shift outward to centre the ring, and the base
  // point must start at the bottom of the dial: rotate(mid−180) then carries it
  // to `mid` with an upright reading.
  const baseR = flip ? r + size * 0.5 : r - size * 0.22;
  // On the lower arc, increasing dial angle runs viewer-LEFTWARD, so the glyph
  // sequence is reversed to keep left-to-right reading order once upright.
  const seq = flip ? [...chars].reverse() : chars;
  const advSeq = flip ? [...adv].reverse() : adv;
  let a = centerAngle - totalAngle / 2;
  const out = [];
  for (let i = 0; i < seq.length; i++) {
    const half = step(advSeq[i]) / 2;
    const mid = a + half;
    const rot = flip ? mid - 180 : mid;
    out.push(`<text x="${cx}" y="${(cy + (flip ? baseR : -baseR)).toFixed(1)}" font-family="${family}" font-size="${size}" fill="${fill}" text-anchor="middle" opacity="${opacity}" transform="rotate(${rot.toFixed(3)} ${cx} ${cy})">${esc(seq[i])}</text>`);
    a += step(advSeq[i]);
  }
  return out.join('');
}

function charFactor(c, base) {
  if (c === ' ') return 0.42;
  if (c === '·' || c === '•') return 0.5;
  if (c === '✦' || c === '—') return 1.0;
  if ('IJ.,:;\'|!'.includes(c)) return 0.44;
  if ('MW'.includes(c)) return 0.98;
  if ('0123456789'.includes(c)) return base * 0.94;
  return base;
}

/** Closed band path over one contiguous day-range. */
function bandPath(range, curveIn, curveOut, n) {
  const outer = [], inner = [];
  for (let doyFrac = range[0]; doyFrac <= range[1] + 1e-9; doyFrac += 0.5) {
    const ang = angleOfDoy(Math.min(doyFrac, n + 0.5), n);
    const tO = curveOut(doyFrac), tI = curveIn(doyFrac);
    outer.push(pt(ang, rOf(tO)));
    inner.push(pt(ang, rOf(tI)));
  }
  return `M ${outer.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L ')} L ${inner.reverse().map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L ')} Z`;
}

/** Contiguous day ranges where a band exists (≥1 day long). */
function bandRanges(curve, n) {
  const ranges = [];
  let cur = null;
  for (let doyFrac = 0.5; doyFrac <= n + 0.5 + 1e-9; doyFrac += 0.5) {
    const ok = curve(doyFrac) != null;
    if (ok) {
      if (!cur) cur = [doyFrac, doyFrac];
      else cur[1] = doyFrac;
    } else if (cur) { ranges.push(cur); cur = null; }
  }
  if (cur) ranges.push(cur);
  return ranges.filter(([a, b]) => b - a >= 1);
}

// ---------- main ----------

/**
 * @param {object} p
 *  lat, lon         — coordinates
 *  place            — display name { city, admin1?, country? }
 *  markers          — up to 3 [{ md: 'MM-DD', label }]
 *  dedication       — short line under the city name (≤ 28 chars)
 *  variant          — 'dark' | 'light'
 */
export function buildDesignInner(p) {
  const lat = Number(p.lat), lon = Number(p.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    throw new Error('invalid coordinates');
  }
  const variant = p.variant === 'light' ? 'light' : 'dark';
  const C = PALETTES[variant];
  const year = YEAR;
  const n = daysInYear(year);
  const table = yearTable(year, lat, lon);
  const bands = (doyFrac) => {
    const d = Math.min(Math.max(doyFrac, 1), n);
    const i0 = Math.floor(d);
    const i1 = Math.min(i0 + 1, n);
    const f = d - i0;
    const A = table.days[i0 - 1], B = table.days[i1 - 1];
    const mix = (k) => {
      const a = A[k], b = B[k];
      if (!a && !b) return null;
      const av = a || [12, 12], bv = b || [12, 12];
      // interpolate window edges; null windows shrink to the noon point
      return [av[0] + (bv[0] - av[0]) * f, av[1] + (bv[1] - av[1]) * f];
    };
    return {
      astro: mix('astro'), naut: mix('naut'), civil: mix('civil'),
      day: mix('day'), gold: mix('gold'), bright: mix('bright'),
    };
  };

  const parts = [];
  const seedStr = `${lat.toFixed(4)}|${lon.toFixed(4)}|${year}|${variant}`;
  const plate = plateNumber(seedStr);

  // ---- medallion (light variant only) ----
  if (C.ground === 'medallion') {
    const R = LAYOUT.medallionR;
    parts.push(`<defs>
<radialGradient id="med" cx="50%" cy="46%" r="62%">
<stop offset="0%" stop-color="#1C2E58"/><stop offset="68%" stop-color="#132244"/><stop offset="100%" stop-color="#0B1530"/>
</radialGradient></defs>`);
    parts.push(`<circle cx="${CX}" cy="${CY}" r="${R}" fill="url(#med)"/>`);
    if (C.medallionEdge) {
      parts.push(`<circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="${C.medallionEdge}" stroke-width="5"/>`);
      parts.push(`<circle cx="${CX}" cy="${CY}" r="${R - 26}" fill="none" stroke="${C.medallionEdge}" stroke-width="1.5" opacity="0.55"/>`);
    }
  }

  // ---- twilight + daylight bands (widest first) ----
  const layers = [
    ['astro', C.astro], ['naut', C.naut], ['civil', C.civil],
    ['day', C.day], ['gold', C.gold], ['bright', C.bright],
  ];
  for (const [key, color] of layers) {
    const curveIn = (x) => { const b = bands(x)[key]; return b ? b[0] : null; };
    const curveOut = (x) => { const b = bands(x)[key]; return b ? b[1] : null; };
    const allDay = table.days.every((dd) => dd[key] && dd[key][0] <= 0.001 && dd[key][1] >= 23.999);
    if (allDay) { parts.push(`<circle cx="${CX}" cy="${CY}" r="${R24}" fill="${color}"/>`); continue; }
    for (const range of bandRanges(curveIn, n)) {
      parts.push(`<path d="${bandPath(range, curveIn, curveOut, n)}" fill="${color}"/>`);
    }
  }

  // ---- sunrise/sunset edge stroke (the river banks) ----
  const edgeOuter = curvePath((x) => { const b = bands(x).day; return b ? b[1] : null; }, n);
  const edgeInner = curvePath((x) => { const b = bands(x).day; return b ? b[0] : null; }, n);
  if (edgeOuter) parts.push(`<path d="${edgeOuter}" fill="none" stroke="${C.edge}" stroke-width="4"/>`);
  if (edgeInner) parts.push(`<path d="${edgeInner}" fill="none" stroke="${C.edge}" stroke-width="4"/>`);

  // ---- stars in the night regions ----
  parts.push(starField(seedStr, bands, n, C));

  // ---- instrument furniture ----
  // frames
  parts.push(`<circle cx="${CX}" cy="${CY}" r="${R24}" fill="none" stroke="${C.frame}" stroke-width="5"/>`);
  parts.push(`<circle cx="${CX}" cy="${CY}" r="${R24 + 16}" fill="none" stroke="${C.frame}" stroke-width="1.6" opacity="0.7"/>`);
  parts.push(`<circle cx="${CX}" cy="${CY}" r="${R0}" fill="none" stroke="${C.frame}" stroke-width="3.4"/>`);
  // hour circles: 6, 12 (noon), 18
  for (const [h, w, op] of [[6, 1.6, 0.5], [12, 2.2, 0.8], [18, 1.6, 0.5]]) {
    const r = rOf(h);
    parts.push(`<circle cx="${CX}" cy="${CY}" r="${r.toFixed(1)}" fill="none" stroke="${C.frame}" stroke-width="${w}" stroke-dasharray="${h === 12 ? '2 26' : '2 34'}" opacity="${op}"/>`);
  }
  // month ticks + labels
  const ms = monthStarts(year);
  for (let m = 0; m < 12; m++) {
    const ang = (ms.starts[m] / n) * 360;
    const [x1, y1] = pt(ang, R24 + 6);
    const [x2, y2] = pt(ang, R24 + LAYOUT.monthTicksOut);
    parts.push(`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${C.frame}" stroke-width="5"/>`);
    // minor ticks at month midpoints
    const angMid = ((ms.starts[m] + ms.lengths[m] / 2) / n) * 360;
    const [x3, y3] = pt(angMid, R24 + 6);
    const [x4, y4] = pt(angMid, R24 + 30);
    parts.push(`<line x1="${x3.toFixed(1)}" y1="${y3.toFixed(1)}" x2="${x4.toFixed(1)}" y2="${y4.toFixed(1)}" stroke="${C.frame}" stroke-width="2.4" opacity="0.75"/>`);
    const labelAng = ((ms.starts[m] + ms.lengths[m] / 2) / n) * 360;
    parts.push(arcText(CX, CY, R24 + LAYOUT.monthLabelR, labelAng, MONTH_NAMES[m],
      { size: 76, family: 'Cinzel', fill: C.frame, tracking: 0.14 }));
  }
  // solstice sun dots
  for (const doy of [table.marks.junSolstice, table.marks.decSolstice]) {
    const ang = ((doy - 0.5) / n) * 360;
    const [x, y] = pt(ang, R24 + LAYOUT.monthTicksOut + 30);
    parts.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="13" fill="${C.accent}"/>`);
  }
  // bottom spoke + hour labels on instrument capsules (kept legible over any band)
  {
    const [x1, y1] = pt(180, R0);
    const [x2, y2] = pt(180, R24);
    parts.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${C.frame}" stroke-width="1.4" opacity="0.4"/>`);
    parts.push(capsule(CX, CY + rOf(6), '06', C, 50, 0));
    parts.push(capsule(CX, CY + rOf(18), '18', C, 50, 0));
    parts.push(capsule(CX, CY + NOON_R + 88, 'SOLAR NOON', C, 48, 14));
    parts.push(capsule(CX, CY + R0 - 58, '0 · 24 MIDNIGHT', C, 48, 10));
  }

  // ---- centre sun emblem ----
  {
    parts.push(`<circle cx="${CX}" cy="${CY}" r="150" fill="none" stroke="${C.sunRay}" stroke-width="3"/>`);
    parts.push(`<circle cx="${CX}" cy="${CY}" r="96" fill="${C.sunCore}"/>`);
    for (let i = 0; i < 12; i++) {
      const ang = i * 30;
      const [x1, y1] = pt(ang, 168);
      const [x2, y2] = pt(ang, i % 3 === 0 ? 226 : 200);
      parts.push(`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${C.sunRay}" stroke-width="${i % 3 === 0 ? 7 : 4}" stroke-linecap="round"/>`);
    }
  }

  // ---- title arc (stars drawn as paths; no exotic glyphs in the fonts) ----
  parts.push(arcText(CX, CY, LAYOUT.titleR, 0, 'THE YEAR OF LIGHT',
    { size: 96, family: 'Cinzel Bold', fill: C.title, tracking: 0.2, widthFactor: 0.74 }));
  {
    const halfAngle = (17 * 96 * 0.94 / 2 / LAYOUT.titleR) * 180 / Math.PI + 6;
    for (const a of [-halfAngle, halfAngle]) {
      const [sx, sy] = pt(a, LAYOUT.titleR - 30);
      parts.push(fourPointStar(sx, sy, 40, C.accent));
    }
  }

  // ---- personal date markers ----
  const markers = (p.markers || []).slice(0, 3);
  for (const mk of markers) {
    if (!mk || !/^\d{2}-\d{2}$/.test(mk.md || '')) continue;
    const doy = doyOfMonthDay(mk.md, year);
    const ang = ((doy - 0.5) / n) * 360;
    const [x1, y1] = pt(ang, R24 + 20);
    const [x2, y2] = pt(ang, R24 + LAYOUT.markerGlyphR - 40);
    parts.push(`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${C.markerLine}" stroke-width="3"/>`);
    const [sx, sy] = pt(ang, R24 + LAYOUT.markerGlyphR);
    parts.push(fourPointStar(sx, sy, 34, C.markerStar));
    const label = String(mk.label || '').replace(/[^\p{L}\p{N} '·—-]/gu, '').slice(0, 14).toUpperCase();
    const dateLabel = monthDayOfDoy(doy, year);
    parts.push(arcText(CX, CY, R24 + LAYOUT.markerLabelR, ang, label ? `${label}` : dateLabel,
      { size: 62, family: 'Cinzel', fill: C.markerLabel, tracking: 0.14 }));
    parts.push(arcText(CX, CY, R24 + LAYOUT.markerDateR, ang, dateLabel,
      { size: 44, family: 'IBM Plex Mono', fill: C.markerLabel, tracking: 0.1, opacity: 0.75 }));
  }

  // ---- caption block ----
  const city = String(p.place?.city || 'THIS PLACE').replace(/[^\p{L}\p{N} .'’·&-]/gu, '').slice(0, 30).toUpperCase();
  const admin = String(p.place?.admin1 || '').replace(/[^\p{L}\p{N} .'’·&-]/gu, '').slice(0, 34).toUpperCase();
  const country = String(p.place?.country || '').replace(/[^\p{L}\p{N} .'’·&-]/gu, '').slice(0, 30).toUpperCase();
  const dedication = String(p.dedication || '').replace(/[^\p{L}\p{N} .'’·,&!?-]/gu, '').slice(0, 28);

  const citySize = Math.min(210, Math.floor(3700 / Math.max(4, city.length * 0.8)));
  let y = 4600;
  if (dedication) {
    parts.push(`<text x="${CX}" y="${y - citySize * 0.75 - 46}" font-family="Spectral Medium Italic" font-size="92" fill="${C.dedication}" text-anchor="middle">${esc(dedication)}</text>`);
  }
  parts.push(`<text x="${CX}" y="${y}" font-family="Cinzel Bold" font-size="${citySize}" letter-spacing="${Math.max(6, Math.round(citySize * 0.06))}" fill="${C.city}" text-anchor="middle">${esc(city)}</text>`);
  y += 150;
  const regionLine = [admin, country].filter(Boolean).join(' · ');
  if (regionLine) {
    parts.push(`<text x="${CX}" y="${y}" font-family="IBM Plex Mono Medium" font-size="74" letter-spacing="10" fill="${C.meta}" text-anchor="middle">${esc(regionLine)}</text>`);
    y += 130;
  }
  parts.push(`<text x="${CX}" y="${y}" font-family="IBM Plex Mono" font-size="68" letter-spacing="6" fill="${C.meta}" text-anchor="middle">${esc(`${formatLat(lat)} · ${formatLon(lon)} · LOCAL SOLAR TIME`)}</text>`);
  y += 160;
  const stats = statsLines(table, year);
  parts.push(`<text x="${CX}" y="${y}" font-family="IBM Plex Mono Medium" font-size="70" letter-spacing="6" fill="${C.city}" text-anchor="middle">${esc(stats[0])}</text>`);
  y += 112;
  parts.push(`<text x="${CX}" y="${y}" font-family="IBM Plex Mono Medium" font-size="70" letter-spacing="6" fill="${C.city}" text-anchor="middle">${esc(stats[1])}</text>`);
  y += 190;
  // rule + brand
  parts.push(`<line x1="${CX - 1500}" y1="${y - 90}" x2="${CX - 260}" y2="${y - 90}" stroke="${C.brand}" stroke-width="2" opacity="0.6"/>`);
  parts.push(`<line x1="${CX + 260}" y1="${y - 90}" x2="${CX + 1500}" y2="${y - 90}" stroke="${C.brand}" stroke-width="2" opacity="0.6"/>`);
  parts.push(fourPointStar(CX, y - 90, 16, C.accent));
  parts.push(`<text x="${CX}" y="${y}" font-family="IBM Plex Mono" font-size="54" letter-spacing="12" fill="${C.brand}" text-anchor="middle">${esc(`HELIOGRAM · PLATE ${plate}`)}</text>`);

  return parts.join('');
}

/** Complete standalone SVG document at print resolution. */
export function buildDesignSVG(p) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${PRINT_W}" height="${PRINT_H}" viewBox="0 0 ${PRINT_W} ${PRINT_H}">${buildDesignInner(p)}</svg>`;
}

function curvePath(curve, n) {
  const steps = Math.ceil(n * 2);
  const pts = [];
  let gap = false;
  for (let i = 0; i <= steps; i++) {
    const doyFrac = 0.5 + i * 0.5;
    const t = curve(doyFrac);
    if (t == null) { gap = true; continue; }
    pts.push(pt(angleOfDoy(doyFrac, n), rOf(t)));
  }
  if (!pts.length) return null;
  // If the curve exists everywhere, close it; if there are polar-night gaps,
  // draw what we have as an open stroke.
  return `M ${pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L ')}${gap ? '' : ' Z'}`;
}

function starField(seedStr, bands, n, C) {
  const rnd = mulberry32(fnv1a(seedStr));
  const out = [];
  let placed = 0, tries = 0;
  while (placed < 240 && tries < 1400) {
    tries++;
    const ang = rnd() * 360;
    const doyFrac = 0.5 + (ang / 360) * n;
    const b = bands(Math.min(doyFrac, n));
    const civ = b.civil;
    const r = R0 + 40 + rnd() * (R24 - R0 - 80);
    const inTwilight = civ && r > rOf(civ[0]) && r < rOf(civ[1]);
    if (inTwilight) continue; // stars only where the sun is below −6°
    const warm = rnd() < 0.65;
    const size = 3 + rnd() * rnd() * 11;
    const [x, y] = pt(ang, r);
    out.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${size.toFixed(1)}" fill="${warm ? C.starWarm : C.starCool}" opacity="${(0.5 + rnd() * 0.5).toFixed(2)}"/>`);
    placed++;
  }
  // a handful of sparkle stars
  for (let i = 0; i < 9; i++) {
    const ang = rnd() * 360;
    const doyFrac = 0.5 + (ang / 360) * n;
    const b = bands(Math.min(doyFrac, n));
    const civ = b.civil;
    const r = R0 + 80 + rnd() * (R24 - R0 - 160);
    if (civ && r > rOf(civ[0]) && r < rOf(civ[1])) continue;
    const [x, y] = pt(ang, r);
    out.push(fourPointStar(x, y, 26 + rnd() * 20, C.starWarm, 0.9));
  }
  return out.join('');
}

function fourPointStar(x, y, r, fill, opacity = 1) {
  const w = r * 0.22;
  const d = `M ${x} ${y - r} Q ${x + w} ${y - w} ${x + r} ${y} Q ${x + w} ${y + w} ${x} ${y + r} Q ${x - w} ${y + w} ${x - r} ${y} Q ${x - w} ${y - w} ${x} ${y - r} Z`;
  return `<path d="${d}" fill="${fill}" opacity="${opacity}"/>`;
}

/** Dark rounded plate behind a monospace label so it reads over any band. */
function capsule(x, y, text, C, size, tracking = 0) {
  const w = [...text].reduce((a, c) => a + size * charFactor(c, 0.6), 0) + tracking * (text.length - 1) + 56;
  const h = size * 1.5;
  return `<g><rect x="${(x - w / 2).toFixed(1)}" y="${(y - h * 0.72).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="${(h / 2).toFixed(1)}" fill="#101A30"/><rect x="${(x - w / 2).toFixed(1)}" y="${(y - h * 0.72).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="${(h / 2).toFixed(1)}" fill="none" stroke="${C.frame}" stroke-width="1.4" opacity="0.45"/><text x="${x}" y="${y}" font-family="IBM Plex Mono Medium" font-size="${size}" letter-spacing="${tracking}" fill="${C.frame}" text-anchor="middle">${esc(text)}</text></g>`;
}

/** "4F2A·C81D" from the design seed. */
export function plateNumber(seedStr) {
  const h1 = fnv1a(seedStr).toString(16).toUpperCase().padStart(8, '0').slice(0, 4);
  const h2 = fnv1a(seedStr + '✦').toString(16).toUpperCase().padStart(8, '0').slice(4, 8);
  return `${h1}·${h2}`;
}

/** Two caption lines: longest / shortest day (or midnight sun / polar night). */
export function statsLines(table, year) {
  const a = table.midnightSun
    ? `MIDNIGHT SUN · ${monthDayOfDoy(table.midnightSun.start, year)} – ${monthDayOfDoy(table.midnightSun.end, year)}`
    : `LONGEST DAY ${formatHM(table.longest.hours)} · ${monthDayOfDoy(table.longest.doy, year).toUpperCase()}`;
  const b = table.polarNight
    ? `POLAR NIGHT · ${monthDayOfDoy(table.polarNight.start, year)} – ${monthDayOfDoy(table.polarNight.end, year)}`
    : `SHORTEST DAY ${formatHM(table.shortest.hours)} · ${monthDayOfDoy(table.shortest.doy, year).toUpperCase()}`;
  return [a, b];
}
