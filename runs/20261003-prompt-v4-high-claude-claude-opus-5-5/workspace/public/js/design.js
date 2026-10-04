// Shared design engine: runs in the browser (live preview) and on the server
// (print file for Prodigi). Same input -> same SVG, byte for byte.
import { METRICS, SUPPORTED } from './metrics.js';

// Print canvas = Prodigi front print area for Bella+Canvas 3001 (~15.6" x 19.6" @ 300dpi).
export const CANVAS = { w: 4680, h: 5880 };
// Artwork never exceeds ~12" x 15.7" — a classic full-front chest print.
const DW = 3600;
const MAXH = 4700;

export const LINE_COLORS = {
  red: { label: 'Red', hex: '#E4002B', text: '#FFFFFF' },
  orange: { label: 'Orange', hex: '#FF6319', text: '#FFFFFF' },
  yellow: { label: 'Yellow', hex: '#FCCC0A', text: '#141414' },
  green: { label: 'Green', hex: '#00933C', text: '#FFFFFF' },
  teal: { label: 'Teal', hex: '#00A19A', text: '#FFFFFF' },
  sky: { label: 'Sky', hex: '#0098D8', text: '#FFFFFF' },
  blue: { label: 'Blue', hex: '#0039A6', text: '#FFFFFF' },
  purple: { label: 'Purple', hex: '#8C4799', text: '#FFFFFF' },
  pink: { label: 'Pink', hex: '#F17CB0', text: '#FFFFFF' },
  brown: { label: 'Brown', hex: '#A2662F', text: '#FFFFFF' },
  silver: { label: 'Silver', hex: '#A7A9AC', text: '#141414' },
};

export const GARMENTS = {
  white: { label: 'White', prodigi: 'white', hex: '#F7F7F5', dark: false, ink: '#141414', sub: '#555555' },
  natural: { label: 'Natural', prodigi: 'natural', hex: '#EEE6D3', dark: false, ink: '#1C1A17', sub: '#5A544A' },
  heather: { label: 'Athletic Heather', prodigi: 'athletic grey heather', hex: '#BDBEBC', dark: false, ink: '#141414', sub: '#383838' },
  black: { label: 'Black', prodigi: 'black', hex: '#1B1B1C', dark: true, ink: '#FFFFFF', sub: '#BDBDBD' },
  navy: { label: 'Navy', prodigi: 'navy blue', hex: '#222B45', dark: true, ink: '#FFFFFF', sub: '#C2C7D3' },
  military: { label: 'Military Green', prodigi: 'military green', hex: '#4D5340', dark: true, ink: '#FFFFFF', sub: '#D3D6C8' },
};

export const SIZES = ['S', 'M', 'L', 'XL', '2XL', '3XL'];

export const LIMITS = {
  title: 26, subtitle: 44, bullet: 2, name: 24, note: 30, future: 22,
  solo: [3, 10], branch: [1, 4], shared: [0, 5],
};

// ---------- sanitizing ----------

const SUPPORTED_SET = new Set(SUPPORTED);

export function cleanText(value, max) {
  const s = String(value ?? '')
    .normalize('NFC')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"');
  let out = '';
  for (const ch of s) out += SUPPORTED_SET.has(ch) ? ch : ch === '\n' || ch === '\t' ? ' ' : '';
  return [...out.replace(/\s+/g, ' ').trim()].slice(0, max).join('').trim();
}

function cleanStops(list, [min, max]) {
  const stops = (Array.isArray(list) ? list : [])
    .map((s) => ({ n: cleanText(s?.n, LIMITS.name), d: cleanText(s?.d, LIMITS.note) }))
    .filter((s) => s.n);
  if (stops.length < min) throw new DesignError(`Add at least ${min} stop${min > 1 ? 's' : ''}.`);
  if (stops.length > max) throw new DesignError(`At most ${max} stops on that stretch.`);
  return stops;
}

export class DesignError extends Error {}

/** Validates and normalizes untrusted design input. Throws DesignError. */
export function normalizeDesign(input) {
  const i = input || {};
  const mode = i.mode === 'duo' ? 'duo' : 'solo';
  const pick = (k, fallback) => (LINE_COLORS[k] ? k : fallback);
  const d = {
    v: 1,
    mode,
    title: cleanText(i.title, LIMITS.title),
    subtitle: cleanText(i.subtitle, LIMITS.subtitle),
    bullet: cleanText(i.bullet, LIMITS.bullet).toUpperCase(),
    colorA: pick(i.colorA, 'red'),
    shape: i.shape === 'straight' ? 'straight' : 'winding',
    future: cleanText(i.future, LIMITS.future),
  };
  if (!d.title) throw new DesignError('Give your line a name.');
  if (!d.bullet) d.bullet = [...d.title.replace(/^the\s+/i, '')][0]?.toUpperCase() || 'A';
  if (mode === 'solo') {
    d.stopsA = cleanStops(i.stopsA, LIMITS.solo);
  } else {
    d.bulletB = cleanText(i.bulletB, LIMITS.bullet).toUpperCase() || 'B';
    d.colorB = pick(i.colorB, 'sky');
    d.stopsA = cleanStops(i.stopsA, LIMITS.branch);
    d.stopsB = cleanStops(i.stopsB, LIMITS.branch);
    const hub = { n: cleanText(i.hub?.n, LIMITS.name), d: cleanText(i.hub?.d, LIMITS.note) };
    if (!hub.n) throw new DesignError('Name the interchange where your lines meet.');
    d.hub = hub;
    d.stopsShared = cleanStops(i.stopsShared, LIMITS.shared);
  }
  return d;
}

// ---------- text measurement ----------

function measure(text, font, size, ls = 0) {
  const m = METRICS[font];
  let w = 0;
  let n = 0;
  for (const ch of text) {
    w += m[ch] ?? 0.55;
    n++;
  }
  return w * size + Math.max(0, n - 1) * ls * size;
}

function fit(text, font, maxW, size, min, ls = 0) {
  const w = measure(text, font, size, ls);
  return w <= maxW ? size : Math.max(min, Math.floor((size * maxW) / w));
}

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const FONT = {
  title: `font-family="Barlow Condensed" font-weight="800"`,
  cond: `font-family="Barlow Condensed" font-weight="700"`,
  bold: `font-family="Barlow" font-weight="700"`,
  semi: `font-family="Barlow" font-weight="600"`,
  medium: `font-family="Barlow" font-weight="500"`,
};

function text(x, y, str, font, size, fill, { anchor = 'start', ls = 0 } = {}) {
  const spacing = ls ? ` letter-spacing="${(ls * size).toFixed(1)}"` : '';
  return `<text x="${r(x)}" y="${r(y)}" ${FONT[font]} font-size="${size}" fill="${fill}" text-anchor="${anchor}"${spacing}>${esc(str)}</text>`;
}

const r = (n) => Math.round(n * 10) / 10;

// ---------- geometry ----------

/** Octilinear route between two stations (vertical runs + a 45° jog). */
function connector([x1, y1], [x2, y2]) {
  const dx = Math.abs(x2 - x1);
  if (dx < 0.5) return [[x1, y1], [x2, y2]];
  const slack = Math.max(0, y2 - y1 - dx);
  return [[x1, y1], [x1, y1 + slack / 2], [x2, y1 + slack / 2 + dx], [x2, y2]];
}

/** Polyline with filleted corners — transit-map bends rather than sharp kinks. */
function roundedPath(points, radius) {
  const pts = points.filter((p, i) => i === 0 || p[0] !== points[i - 1][0] || p[1] !== points[i - 1][1]);
  let d = `M${r(pts[0][0])} ${r(pts[0][1])}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [a, p, b] = [pts[i - 1], pts[i], pts[i + 1]];
    const la = Math.hypot(a[0] - p[0], a[1] - p[1]);
    const lb = Math.hypot(b[0] - p[0], b[1] - p[1]);
    const rr = Math.min(radius, la / 2, lb / 2);
    const p1 = [p[0] + ((a[0] - p[0]) / la) * rr, p[1] + ((a[1] - p[1]) / la) * rr];
    const p2 = [p[0] + ((b[0] - p[0]) / lb) * rr, p[1] + ((b[1] - p[1]) / lb) * rr];
    d += ` L${r(p1[0])} ${r(p1[1])} Q${r(p[0])} ${r(p[1])} ${r(p2[0])} ${r(p2[1])}`;
  }
  const last = pts[pts.length - 1];
  return `${d} L${r(last[0])} ${r(last[1])}`;
}

function routeThrough(stations) {
  const pts = [stations[0]];
  for (let i = 1; i < stations.length; i++) pts.push(...connector(stations[i - 1], stations[i]).slice(1));
  return pts;
}

// ---------- layout ----------

const LW = 76; // line weight: ~0.25" on the shirt
const DOT_R = 58; // station disc radius
const HOLE_R = 30; // station centre (shirt shows through / white on dark tees)
const LABEL_GAP = 112;
const NAME = 120;
const NOTE = 84;
const DASH_RUN = 3 * 64 + 2 * 44; // three whole dashes, no slivers

function label(x, y, side, stop, ink, sub, maxW, scale = 1, gap = LABEL_GAP) {
  const anchor = side === 'right' ? 'start' : 'end';
  const lx = side === 'right' ? x + gap : x - gap;
  const ns = fit(stop.n, 'bold', maxW, Math.round(NAME * scale), 78);
  const ts = stop.d ? fit(stop.d, 'medium', maxW, Math.round(NOTE * scale), 60) : 0;
  const capN = 0.7 * ns;
  const blockH = stop.d ? capN + 0.42 * ns + 0.7 * ts : capN;
  const top = y - blockH / 2;
  let out = text(lx, top + capN, stop.n, 'bold', ns, ink, { anchor });
  if (stop.d) out += text(lx, top + capN + 0.42 * ns + 0.7 * ts, stop.d, 'medium', ts, sub, { anchor });
  return out;
}

function bullet(cx, cy, d, letters, color) {
  const c = LINE_COLORS[color];
  const size = Math.round(d * ([...letters].length > 1 ? 0.5 : 0.64));
  return (
    `<circle cx="${cx}" cy="${cy}" r="${d / 2}" fill="${c.hex}"/>` +
    text(cx, cy + size * 0.35, letters, 'cond', size, c.text, { anchor: 'middle' })
  );
}

/**
 * Builds the artwork. Returns { body, defs, height } in design units
 * (DW wide), positioned at the origin.
 */
function compose(d, g, idp) {
  const G = GARMENTS[g] || GARMENTS.black;
  const { ink, sub } = G;
  const cx = DW / 2;
  const A = LINE_COLORS[d.colorA].hex;
  const B = d.mode === 'duo' ? LINE_COLORS[d.colorB].hex : null;
  let defs = '';
  let lines = ''; // masked: knocked out at stations
  let dashed = '';
  let marks = '';
  let labels = '';
  const holes = [];
  const fills = [];

  // Header
  const BD = 330;
  let header = '';
  if (d.mode === 'duo') {
    header += bullet(cx - BD / 2 - 30, BD / 2, BD, d.bullet, d.colorA);
    header += bullet(cx + BD / 2 + 30, BD / 2, BD, d.bulletB, d.colorB);
  } else {
    header += bullet(cx, BD / 2, BD, d.bullet, d.colorA);
  }
  const title = d.title.toUpperCase();
  const ts = fit(title, 'title', DW, 430, 200, 0.01);
  const titleBase = BD + 70 + 0.7 * ts;
  header += text(cx, titleBase, title, 'title', ts, ink, { anchor: 'middle', ls: 0.01 });
  let y = titleBase;
  if (d.subtitle) {
    const st = d.subtitle.toUpperCase();
    const ss = fit(st, 'semi', DW, 112, 64, 0.16);
    y += 70 + 0.7 * ss;
    header += text(cx, y, st, 'semi', ss, sub, { anchor: 'middle', ls: 0.16 });
  }
  y += 100;
  header += `<rect x="${cx - DW * 0.36}" y="${r(y)}" width="${DW * 0.72}" height="14" fill="${ink}"/>`;
  const mapTop = y + 14 + 230;

  const futureLen = d.future ? 420 : 0;
  const legendH = 300;
  let mapBottom;

  if (d.mode === 'solo') {
    const n = d.stopsA.length;
    const avail = MAXH - mapTop - futureLen - legendH;
    const S = Math.max(340, Math.min(560, avail / (n - 1)));
    const J = 300;
    const pattern = [0, 0, 1, 1, 0, -1, -1, 0, 0, 1];
    const stations = d.stopsA.map((_, i) => [cx + (d.shape === 'winding' ? pattern[i] * J : 0), mapTop + i * S]);
    lines += `<path d="${roundedPath(routeThrough(stations), 150)}" fill="none" stroke="${A}" stroke-width="${LW}" stroke-linejoin="round"/>`;
    const room = DW / 2 - LABEL_GAP - 40;
    stations.forEach(([x, sy], i) => {
      marks += `<circle cx="${r(x)}" cy="${r(sy)}" r="${DOT_R}" fill="${A}"/>`;
      holes.push(`<circle cx="${r(x)}" cy="${r(sy)}" r="${HOLE_R}"/>`);
      const side = i % 2 === 0 ? 'right' : 'left';
      const maxW = room - (side === 'right' ? x - cx : cx - x);
      labels += label(x, sy, side, d.stopsA[i], ink, sub, maxW);
    });
    const [lx, ly] = stations[n - 1];
    mapBottom = ly + DOT_R;
    if (d.future) {
      dashed += `<line x1="${r(lx)}" y1="${r(ly + DOT_R + 30)}" x2="${r(lx)}" y2="${r(ly + DOT_R + 30 + DASH_RUN)}" stroke="${A}" stroke-width="${LW}" stroke-dasharray="64 44"/>`;
      const fs = fit(d.future.toUpperCase(), 'semi', DW, 84, 60, 0.12);
      labels += text(lx, ly + futureLen + 70 + 0.7 * fs, d.future.toUpperCase(), 'semi', fs, sub, { anchor: 'middle', ls: 0.12 });
      mapBottom = ly + futureLen + 90 + 0.7 * fs;
    }
  } else {
    const a = d.stopsA.length;
    const b = d.stopsB.length;
    const m = Math.max(a, b);
    const sharedN = d.stopsShared.length;
    const BR = 560;
    const off = (LW + 14) / 2; // shared-track lines run side by side
    const xa = cx - BR;
    const xb = cx + BR;
    const diag = BR - off;
    const avail = MAXH - mapTop - futureLen - legendH;
    // rows: (m-1) branch gaps + hub gap (>= diag + 2 bends) + sharedN gaps
    let S = Math.min(520, (avail - (diag + 380)) / Math.max(1, m - 1 + sharedN));
    S = Math.max(330, S);
    const hubGap = Math.max(S, diag + 380);
    const rowY = (k) => mapTop + k * S;
    const lastBranchY = rowY(m - 1);
    const hubY = lastBranchY + hubGap;
    const sharedY = (k) => hubY + (k + 1) * S;
    const endY = sharedN ? sharedY(sharedN - 1) : hubY;
    const branchRoom = DW / 2 - BR - LABEL_GAP - 30;

    const branch = (stops, x, color, side, sideX) => {
      const first = m - stops.length;
      const pts = [[x, rowY(first)], [x, lastBranchY], ...connector([x, lastBranchY], [sideX, hubY]).slice(1), [sideX, endY]];
      lines += `<path d="${roundedPath(pts, 170)}" fill="none" stroke="${color}" stroke-width="${LW}" stroke-linejoin="round"/>`;
      stops.forEach((s, i) => {
        const sy = rowY(first + i);
        marks += `<circle cx="${x}" cy="${r(sy)}" r="${DOT_R}" fill="${color}"/>`;
        holes.push(`<circle cx="${x}" cy="${r(sy)}" r="${HOLE_R}"/>`);
        labels += label(x, sy, side, s, ink, sub, branchRoom);
      });
      if (d.future) {
        dashed += `<line x1="${sideX}" y1="${r(endY + 90)}" x2="${sideX}" y2="${r(endY + 90 + DASH_RUN)}" stroke="${color}" stroke-width="${LW}" stroke-dasharray="64 44"/>`;
      }
    };
    branch(d.stopsA, xa, A, 'left', cx - off);
    branch(d.stopsB, xb, B, 'right', cx + off);

    const capsule = (sy, big) => {
      const w = 2 * off + LW + (big ? 70 : 44);
      const h = LW + (big ? 70 : 44);
      const sw = big ? 30 : 24;
      marks += `<rect x="${r(cx - w / 2)}" y="${r(sy - h / 2)}" width="${r(w)}" height="${r(h)}" rx="${r(h / 2)}" fill="none" stroke="${ink}" stroke-width="${sw}"/>`;
      const iw = w - sw;
      const ih = h - sw;
      holes.push(`<rect x="${r(cx - iw / 2)}" y="${r(sy - ih / 2)}" width="${r(iw)}" height="${r(ih)}" rx="${r(ih / 2)}"/>`);
      return w / 2;
    };
    const hubHalf = capsule(hubY, true);
    const sharedRoom = DW / 2 - hubHalf - 90;
    labels += label(cx, hubY, 'right', d.hub, ink, sub, sharedRoom, 1.18, hubHalf + 60);
    d.stopsShared.forEach((s, k) => {
      const sy = sharedY(k);
      const half = capsule(sy, false);
      const side = k % 2 === 0 ? 'left' : 'right';
      labels += label(cx, sy, side, s, ink, sub, sharedRoom, 1, half + 60);
    });
    mapBottom = endY + 80;
    if (d.future) {
      const fs = fit(d.future.toUpperCase(), 'semi', DW, 84, 60, 0.12);
      labels += text(cx, endY + futureLen + 70 + 0.7 * fs, d.future.toUpperCase(), 'semi', fs, sub, { anchor: 'middle', ls: 0.12 });
      mapBottom = endY + futureLen + 90 + 0.7 * fs;
    }
  }

  // Legend
  const items = [];
  const ls = 0.12;
  const lsz = 66;
  items.push({ icon: 'dot', label: 'STOP' });
  if (d.mode === 'duo') items.push({ icon: 'cap', label: 'INTERCHANGE' });
  if (d.future) items.push({ icon: 'dash', label: 'FUTURE SERVICE' });
  let legend = '';
  if (items.length > 1) {
    const ly = mapBottom + 200;
    const iconW = { dot: 70, cap: 120, dash: 150 };
    const widths = items.map((it) => iconW[it.icon] + 36 + measure(it.label, 'semi', lsz, ls));
    const gap = 120;
    let x = cx - (widths.reduce((s, w) => s + w, 0) + gap * (items.length - 1)) / 2;
    items.forEach((it, i) => {
      const s = 0.5;
      if (it.icon === 'dot') {
        legend += `<circle cx="${r(x + 35)}" cy="${r(ly)}" r="${DOT_R * s}" fill="${A}"/>`;
        holes.push(`<circle cx="${r(x + 35)}" cy="${r(ly)}" r="${HOLE_R * s}"/>`);
      } else if (it.icon === 'cap') {
        legend += `<rect x="${r(x + 6)}" y="${r(ly - 30)}" width="108" height="60" rx="30" fill="none" stroke="${ink}" stroke-width="14"/>`;
        holes.push(`<rect x="${r(x + 13)}" y="${r(ly - 23)}" width="94" height="46" rx="23"/>`);
      } else {
        legend += `<line x1="${r(x)}" y1="${r(ly)}" x2="${r(x + 150)}" y2="${r(ly)}" stroke="${A}" stroke-width="${LW / 2}" stroke-dasharray="40 26"/>`;
      }
      legend += text(x + iconW[it.icon] + 36, ly + 0.35 * lsz, it.label, 'semi', lsz, sub, { ls });
      x += widths[i] + gap;
    });
    mapBottom = ly + 40;
  }

  // Station centres: transparent on light tees (the shirt is the "paper"),
  // printed white on dark tees so stops read as bright dots.
  const maskId = `${idp}-knock`;
  defs += `<mask id="${maskId}" maskUnits="userSpaceOnUse" x="-200" y="-200" width="${DW + 400}" height="${MAXH + 1400}"><rect x="-200" y="-200" width="${DW + 400}" height="${MAXH + 1400}" fill="#fff"/>${holes.join('').replace(/\/>/g, ' fill="#000"/>')}</mask>`;
  // (a 3px white bleed hides the anti-aliased seam against the ring)
  if (G.dark) fills.push(...holes.map((h) => h.replace(/\/>/g, ' fill="#FFFFFF" stroke="#FFFFFF" stroke-width="6"/>')));

  const body =
    header +
    `<g mask="url(#${maskId})">${dashed}${lines}${marks}${legend}</g>` +
    fills.join('') +
    labels;
  return { body, defs, height: mapBottom };
}

/**
 * Full print-canvas SVG (transparent background). `idPrefix` keeps mask ids
 * unique when several previews share a page.
 */
export function renderSVG(design, garment, { idPrefix = 'd' } = {}) {
  const { body, defs, height } = compose(design, garment, idPrefix);
  const scale = Math.min(1, MAXH / height);
  const tx = (CANVAS.w - DW * scale) / 2;
  const ty = 60;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS.w}" height="${CANVAS.h}" viewBox="0 0 ${CANVAS.w} ${CANVAS.h}">` +
    `<defs>${defs}</defs><g transform="translate(${r(tx)} ${ty}) scale(${scale.toFixed(4)})">${body}</g></svg>`
  );
}

/** Rough contrast check between a line colour and the garment (WCAG ratio). */
export function contrast(hexA, hexB) {
  const lum = (hex) => {
    const [R, G, B] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * R + 0.7152 * G + 0.0722 * B;
  };
  const [a, b] = [lum(hexA), lum(hexB)].sort((x, y) => y - x);
  return (a + 0.05) / (b + 0.05);
}

// ---------- order metadata round-trip (Stripe metadata values max 500 chars) ----------

export function packDesign(design) {
  const json = JSON.stringify(design);
  const chunks = {};
  for (let i = 0, k = 0; i < json.length; i += 480, k++) chunks[`design_${k}`] = json.slice(i, i + 480);
  return chunks;
}

export function unpackDesign(metadata) {
  let json = '';
  for (let k = 0; metadata[`design_${k}`] !== undefined; k++) json += metadata[`design_${k}`];
  return normalizeDesign(JSON.parse(json));
}

export const PRESETS = {
  life: {
    mode: 'solo', title: 'The Maya Line', subtitle: 'Est. 1994 · Austin to Brooklyn', bullet: 'M', colorA: 'red', shape: 'winding',
    future: 'Next stop: ???',
    stopsA: [
      { n: 'Austin, TX', d: 'Origin · 1994' },
      { n: 'Lakeview Elementary', d: 'Spelling bee champ' },
      { n: 'UT Austin', d: 'Hook ’em · 2012' },
      { n: 'First Apartment', d: 'Ramen years' },
      { n: 'Denver', d: 'Learned to ski (badly)' },
      { n: 'Brooklyn', d: 'Current terminus' },
    ],
  },
  love: {
    mode: 'duo', title: 'Sam & Priya', subtitle: 'Shared service since 2016', bullet: 'S', bulletB: 'P', colorA: 'blue', colorB: 'orange',
    future: 'Next stop: ???',
    stopsA: [{ n: 'Leeds', d: 'Since 1990' }, { n: 'Manchester Uni', d: 'Class of 2012' }],
    stopsB: [{ n: 'Pune', d: 'Since 1991' }, { n: 'London', d: '2010' }, { n: 'Night Bus N29', d: 'Fateful journey' }],
    hub: { n: 'Camden Karaoke', d: 'Interchange · 2016' },
    stopsShared: [{ n: 'Hackney', d: 'First flat' }, { n: 'Lisbon', d: 'The proposal' }, { n: 'The Wedding', d: '14 June 2025' }],
  },
  crawl: {
    mode: 'solo', title: 'Dave’s Stag Line', subtitle: 'Saturday Service · Edinburgh', bullet: 'D', colorA: 'yellow', shape: 'straight',
    future: 'Last train: 3am',
    stopsA: [
      { n: 'Waverley Station', d: 'Assemble · 2pm' },
      { n: 'The Hanging Bat', d: '' },
      { n: 'Brewdog Lothian Rd', d: '' },
      { n: 'Sandy Bell’s', d: 'Ceilidh hour' },
      { n: 'The Last Drop', d: 'Aptly named' },
      { n: 'Kebab Terminus', d: 'End of the line' },
    ],
  },
  grad: {
    mode: 'solo', title: 'The Okafor Express', subtitle: 'PhD Service · 2019 – 2025', bullet: 'O', colorA: 'green', shape: 'winding',
    future: '',
    stopsA: [
      { n: 'Lagos', d: 'Departure' },
      { n: 'MSc, Edinburgh', d: '2019' },
      { n: 'Lab 4.12', d: 'Too many all-nighters' },
      { n: 'First Paper', d: 'Reviewer 2 survived' },
      { n: 'Thesis Submitted', d: '312 pages' },
      { n: 'Dr. Okafor', d: 'Arrived · 2025' },
    ],
  },
};
