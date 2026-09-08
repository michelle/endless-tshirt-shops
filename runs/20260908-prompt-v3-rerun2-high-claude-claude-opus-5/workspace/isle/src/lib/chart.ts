/**
 * The Isle of You - procedural antique sea-chart engraver.
 *
 * Pure TypeScript, no DOM and no Node APIs, so the identical code path draws the
 * live preview in the browser and the 200-DPI print file on the server. Every
 * chart is a deterministic function of the customer's answers: same answers in,
 * same island out, forever.
 */

export type Spec = {
  name: string; // -> THE ISLE OF ___
  port: string; // -> Port ___
  peak: string; // -> Mount ___
  dread: string; // -> HERE BE ___ / The ___ Deeps
  bay: string; // -> ___ Bay
  wilds: string; // -> The ___ Wilds
  year: string; // -> anno ___
  shirt: ShirtKey;
  size: SizeKey;
};

export const SIZES = ['xs', 's', 'm', 'l', 'xl', '2xl', '3xl'] as const;
export type SizeKey = (typeof SIZES)[number];

export const SHIRTS = {
  natural: { label: 'Natural', prodigi: 'natural', swatch: '#E8DFCB', dark: false },
  white: { label: 'White', prodigi: 'white', swatch: '#FBFBF9', dark: false },
  sand: { label: 'Sand', prodigi: 'sand', swatch: '#D8CBAF', dark: false },
  sportgrey: { label: 'Sport Grey', prodigi: 'sport grey', swatch: '#C3C4C2', dark: false },
  black: { label: 'Black', prodigi: 'black', swatch: '#17171A', dark: true },
  navy: { label: 'Navy', prodigi: 'navy blue', swatch: '#1F2A44', dark: true },
  forest: { label: 'Forest Green', prodigi: 'forest green', swatch: '#1E3A2B', dark: true },
  maroon: { label: 'Maroon', prodigi: 'maroon', swatch: '#4A1E28', dark: true },
} as const;
export type ShirtKey = keyof typeof SHIRTS;

export function shirtKey(k: string): ShirtKey {
  return (Object.prototype.hasOwnProperty.call(SHIRTS, k) ? k : 'natural') as ShirtKey;
}

/** Two-ink DTG palette: one line ink, one accent. Chosen to sit on the garment. */
function palette(shirt: ShirtKey) {
  return SHIRTS[shirt].dark
    ? { ink: '#EFE6D2', accent: '#C9A227' }
    : { ink: '#16263F', accent: '#8E2B20' };
}

/* ------------------------------------------------------------------ *
 * Deterministic RNG (xmur3 seed + sfc32)
 * ------------------------------------------------------------------ */
function xmur3(str: string) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}
function sfc32(a: number, b: number, c: number, d: number) {
  return () => {
    a |= 0;
    b |= 0;
    c |= 0;
    d |= 0;
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}
function makeRng(seed: string) {
  const s = xmur3(seed);
  const r = sfc32(s(), s(), s(), s());
  for (let i = 0; i < 12; i++) r();
  return r;
}

/* ------------------------------------------------------------------ *
 * Text handling
 * ------------------------------------------------------------------ */
export function clean(s: string, max = 22): string {
  let out = '';
  for (const ch of String(s || '')) {
    const c = ch.codePointAt(0) as number;
    if (c < 0x20 || c === 0x7f) out += ' ';
    else if (ch === '<' || ch === '>' || ch === '&' || ch === '"') out += ' ';
    else out += ch;
  }
  return out.replace(/\s+/g, ' ').trim().slice(0, max).trim();
}
/**
 * IM Fell is a 17th-century Latin face: it has no CJK, Cyrillic, Greek or Arabic
 * glyphs, and resvg would set those as empty boxes on the finished shirt. We
 * check here rather than let someone buy a plate full of tofu.
 */
const ENGRAVABLE = /^[A-Za-z0-9 .,'!?()\/\-\u00C0-\u017F]$/;
export function unengravable(s: string): string[] {
  const bad = new Set<string>();
  for (const ch of clean(s, 40)) if (!ENGRAVABLE.test(ch)) bad.add(ch);
  return Array.from(bad);
}

function titled(s: string): string {
  const words = s.split(' ');
  return words
    .map((w, i) =>
      w.length > 3 || i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w.toLowerCase()
    )
    .join(' ');
}
function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
const ROMAN: [number, string][] = [
  [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
  [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
];
function roman(n: number): string {
  let out = '';
  for (const [v, s] of ROMAN) while (n >= v) { out += s; n -= v; }
  return out || 'I';
}

const F_SC = "'IM Fell English SC', 'IM Fell English', Georgia, serif";
const F_RM = "'IM Fell English', Georgia, serif";

/* ------------------------------------------------------------------ *
 * Geometry helpers
 * ------------------------------------------------------------------ */
type Pt = { x: number; y: number };
const TAU = Math.PI * 2;

function polyPath(pts: Pt[], close = true): string {
  if (!pts.length) return '';
  let d = 'M' + pts[0].x.toFixed(1) + ' ' + pts[0].y.toFixed(1);
  for (let i = 1; i < pts.length; i++) d += 'L' + pts[i].x.toFixed(1) + ' ' + pts[i].y.toFixed(1);
  return close ? d + 'Z' : d;
}

/* ------------------------------------------------------------------ *
 * The engraver
 * ------------------------------------------------------------------ */
export const CANVAS = { w: 1560, h: 1930 };

export function normalize(spec: Spec) {
  return {
    name: titled(clean(spec.name, 20)) || 'Nemo',
    port: titled(clean(spec.port, 20)) || 'Anywhere',
    peak: titled(clean(spec.peak, 20)) || 'Tomorrow',
    dread: titled(clean(spec.dread, 20)) || 'Mondays',
    bay: titled(clean(spec.bay, 20)) || 'Quiet',
    wilds: titled(clean(spec.wilds, 20)) || 'Idle Hours',
    year: clean(spec.year, 4).replace(/[^0-9]/g, '') || '1999',
  };
}

export function renderChart(spec: Spec): string {
  const n = normalize(spec);
  const { name, port, peak, dread, bay, wilds, year } = n;

  const seedStr = [name, port, peak, dread, bay, wilds, year].join('|').toLowerCase();
  const rand = makeRng(seedStr);
  const sk = shirtKey(spec.shirt);
  const P = palette(sk);
  const W = CANVAS.w;
  const H = CANVAS.h;
  const px = (v: number) => v.toFixed(1);

  /* ---- coordinates & plate number, derived from the seed ---- */
  const latDeg = 3 + Math.floor(rand() * 54);
  const latMin = Math.floor(rand() * 60);
  const lonDeg = 4 + Math.floor(rand() * 160);
  const lonMin = Math.floor(rand() * 60);
  const NS = rand() < 0.5 ? 'N' : 'S';
  const EW = rand() < 0.5 ? 'E' : 'W';
  const plate = 1 + Math.floor(rand() * 880);
  const elevation = 2100 + Math.floor(rand() * 7600);

  /* ---- island field ---- */
  const cx = 782;
  const cy = 1034;
  const R = 344;
  const sx = 1 + (rand() - 0.5) * 0.2;
  const sy = 1 + (rand() - 0.5) * 0.16;

  // Low harmonics give the island its personality; the set is then normalised so
  // the coast can never wander outside a predictable envelope of the plate.
  const harmonics: { k: number; a: number; p: number }[] = [];
  for (let k = 2; k <= 9; k++) {
    harmonics.push({ k, a: (0.55 / Math.pow(k, 1.22)) * (0.3 + rand() * 0.7), p: rand() * TAU });
  }
  const hTotal = harmonics.reduce((s, h) => s + h.a, 0);
  for (const h of harmonics) h.a *= 0.34 / hTotal;

  // fine ruggedness: continuous, so the coast stays a smooth closed curve
  const rugged: { k: number; a: number; p: number }[] = [];
  for (let k = 13; k <= 33; k += 4) {
    rugged.push({ k, a: 0.015 * (0.5 + rand()), p: rand() * TAU });
  }

  // Feature bearings, spaced so no two named places ever crowd each other.
  const bayAngle = rand() * TAU;
  const portAngle = bayAngle + 1.45 + rand() * 0.85;
  const peakAngle = bayAngle + Math.PI + (rand() - 0.5) * 0.7;
  const wildAngle = bayAngle + 4.42 + rand() * 0.3;
  const tarnAngle = bayAngle + 5.62 + rand() * 0.3;

  // two deep bites out of the coast: the great bay and the harbour mouth
  const bites = [
    { t: bayAngle, w: 0.3 + rand() * 0.1, d: 0.28 + rand() * 0.08 },
    { t: portAngle, w: 0.18 + rand() * 0.07, d: 0.13 + rand() * 0.05 },
  ];

  function radiusAt(t: number): number {
    let m = 1;
    for (const h of harmonics) m += h.a * Math.sin(h.k * t + h.p);
    for (const h of rugged) m += h.a * Math.sin(h.k * t + h.p);
    for (const b of bites) {
      const dt = ((t - b.t + Math.PI * 3) % TAU) - Math.PI;
      m -= b.d * Math.exp(-(dt * dt) / (2 * b.w * b.w));
    }
    return R * Math.max(0.26, m);
  }
  function coastPt(t: number, f = 1): Pt {
    const r = radiusAt(t) * f;
    return { x: cx + Math.cos(t) * r * sx, y: cy + Math.sin(t) * r * sy };
  }
  function inside(p: Pt, f = 1): boolean {
    const dx = (p.x - cx) / sx;
    const dy = (p.y - cy) / sy;
    return Math.hypot(dx, dy) < radiusAt(Math.atan2(dy, dx)) * f;
  }

  const STEPS = 720;
  const coast: Pt[] = [];
  for (let i = 0; i < STEPS; i++) coast.push(coastPt((i / STEPS) * TAU));

  /* ---- placement guard: keeps ornaments out of land and out of each other ---- */
  type Box = { x: number; y: number; hw: number; hh: number };
  const avoid: Box[] = [
    { x: 780, y: 352, hw: 660, hh: 196 }, // title block
    { x: 1216, y: 1548, hw: 158, hh: 158 }, // compass rose
    { x: 366, y: 1698, hw: 190, hh: 74 }, // scale bar
  ];
  function boxClear(b: Box): boolean {
    if (b.x - b.hw < 110 || b.x + b.hw > W - 110 || b.y - b.hh < 336 || b.y + b.hh > 1738) return false;
    for (const a of avoid) {
      if (Math.abs(a.x - b.x) < a.hw + b.hw + 16 && Math.abs(a.y - b.y) < a.hh + b.hh + 16) return false;
    }
    for (let i = 0; i <= 4; i++) {
      for (let j = 0; j <= 4; j++) {
        const p = { x: b.x - b.hw + (2 * b.hw * i) / 4, y: b.y - b.hh + (2 * b.hh * j) / 4 };
        if (inside(p, 1.1)) return false;
      }
    }
    return true;
  }
  function pickSpot(cands: Pt[], hw: number, hh: number): Pt | null {
    for (const c of cands) {
      const b = { x: c.x, y: c.y, hw, hh };
      if (boxClear(b)) {
        avoid.push(b);
        return c;
      }
    }
    return null;
  }

  /* ---- the summit, and relief that leans toward it ---- */
  const peakPt: Pt = {
    x: cx + Math.cos(peakAngle) * R * 0.33 * sx,
    y: cy + Math.sin(peakAngle) * R * 0.33 * sy,
  };
  const wildPt: Pt = {
    x: cx + Math.cos(wildAngle) * R * 0.4 * sx,
    y: cy + Math.sin(wildAngle) * R * 0.4 * sy,
  };
  const tarn: Pt = {
    x: cx + Math.cos(tarnAngle) * R * 0.5 * sx,
    y: cy + Math.sin(tarnAngle) * R * 0.5 * sy,
  };

  // Inland engraving (trees, hachures) is held back from the inland lettering so
  // the names stay legible against the texture.
  const chars = (s: string, size: number, ls: number) => s.length * (size * 0.56 + ls);
  const landLabels: Box[] = [
    { x: peakPt.x, y: peakPt.y - 80, hw: chars('Mount ' + peak, 33, 3) / 2 + 30, hh: 24 },
    { x: peakPt.x, y: peakPt.y + 46, hw: 78, hh: 18 },
    { x: wildPt.x, y: wildPt.y + 4, hw: chars('The ' + wilds + ' Wilds', 27, 2.5) / 2 + 34, hh: 22 },
    { x: tarn.x, y: tarn.y - 42, hw: 66, hh: 16 },
  ];
  const onLabel = (p: Pt) =>
    landLabels.some((b) => Math.abs(b.x - p.x) < b.hw + 6 && Math.abs(b.y - p.y) < b.hh + 6);

  function contour(f: number): Pt[] {
    const pts: Pt[] = [];
    const bl = 1 - f;
    for (let i = 0; i < 320; i++) {
      const t = (i / 320) * TAU;
      const base = coastPt(t, f);
      const lean = { x: peakPt.x + Math.cos(t) * radiusAt(t) * f * sx, y: peakPt.y + Math.sin(t) * radiusAt(t) * f * sy };
      pts.push({ x: base.x * (1 - bl) + lean.x * bl, y: base.y * (1 - bl) + lean.y * bl });
    }
    return pts;
  }

  const out: string[] = [];

  /* ================= SEA ================= */
  const roseC = { x: 1216, y: 1548 };
  const roseR = 120;
  const sea: string[] = [];
  for (let i = 0; i < 16; i++) {
    const t = (i / 16) * TAU;
    sea.push(
      `<line x1="${px(roseC.x)}" y1="${px(roseC.y)}" x2="${px(roseC.x + Math.cos(t) * 2600)}" y2="${px(roseC.y + Math.sin(t) * 2600)}" stroke="${P.ink}" stroke-width="1" opacity="${i % 4 === 0 ? 0.4 : 0.2}"/>`
    );
  }
  const keepOut = (p: Pt) =>
    inside(p, 1.12) ||
    Math.hypot(p.x - roseC.x, p.y - roseC.y) < roseR + 48 ||
    p.y < 372 ||
    p.y > 1736 ||
    p.x < 118 ||
    p.x > W - 118;
  for (let i = 0; i < 520; i++) {
    const p = { x: 100 + rand() * (W - 200), y: 340 + rand() * 1420 };
    if (keepOut(p)) continue;
    const s = 9 + rand() * 9;
    sea.push(
      `<path d="M${px(p.x)} ${px(p.y)}q${px(s * 0.5)} ${px(-s * 0.42)} ${px(s)} 0q${px(s * 0.5)} ${px(s * 0.42)} ${px(s)} 0" fill="none" stroke="${P.ink}" stroke-width="1.5" opacity="0.32" stroke-linecap="round"/>`
    );
  }
  out.push('<g>' + sea.join('') + '</g>');

  /* ================= ISLAND ================= */
  const land: string[] = [];
  for (let i = 1; i <= 4; i++) {
    const ring: Pt[] = [];
    for (let j = 0; j < STEPS; j++) ring.push(coastPt((j / STEPS) * TAU, 1 + i * 0.024));
    land.push(
      `<path d="${polyPath(ring)}" fill="none" stroke="${P.ink}" stroke-width="${(1.5 - i * 0.22).toFixed(2)}" opacity="${(0.42 - i * 0.075).toFixed(2)}"/>`
    );
  }
  land.push(`<path d="${polyPath(coast)}" fill="none" stroke="${P.ink}" stroke-width="4"/>`);

  [0.86, 0.72, 0.58, 0.44, 0.3, 0.18].forEach((f, i) => {
    land.push(
      `<path d="${polyPath(contour(f))}" fill="none" stroke="${P.ink}" stroke-width="${(2.0 - i * 0.16).toFixed(2)}" opacity="${(0.72 - i * 0.04).toFixed(2)}"/>`
    );
  });

  for (let i = 0; i < 220; i++) {
    const t = rand() * TAU;
    const rr = 26 + rand() * 108;
    const a = { x: peakPt.x + Math.cos(t) * rr, y: peakPt.y + Math.sin(t) * rr * 0.82 };
    if (!inside(a, 0.62) || onLabel(a)) continue;
    const len = 9 + rand() * 15;
    land.push(
      `<line x1="${px(a.x)}" y1="${px(a.y)}" x2="${px(a.x + Math.cos(t) * len)}" y2="${px(a.y + Math.sin(t) * len * 0.8)}" stroke="${P.ink}" stroke-width="1.6" opacity="0.6" stroke-linecap="round"/>`
    );
  }

  let trees = 0;
  for (let i = 0; i < 1100 && trees < 120; i++) {
    const t = rand() * TAU;
    const rr = rand() * 175;
    const p = { x: wildPt.x + Math.cos(t) * rr, y: wildPt.y + Math.sin(t) * rr * 0.7 };
    if (!inside(p, 0.9) || inside(p, 0.34) || onLabel(p)) continue;
    trees++;
    const s = 5.5 + rand() * 3;
    land.push(
      `<g opacity="0.82"><path d="M${px(p.x)} ${px(p.y)}l0 ${px(s * 0.9)}" stroke="${P.ink}" stroke-width="1.4"/><path d="M${px(p.x - s * 0.62)} ${px(p.y)}q${px(s * 0.62)} ${px(-s * 1.5)} ${px(s * 1.24)} 0z" fill="${P.ink}"/></g>`
    );
  }

  // river from the summit to the sea
  {
    const t0 = bayAngle + (rand() - 0.5) * 0.7;
    const mouth = coastPt(t0);
    const nx = -(mouth.y - peakPt.y);
    const ny = mouth.x - peakPt.x;
    const nl = Math.hypot(nx, ny) || 1;
    const riv: Pt[] = [];
    const N = 30;
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      const wob = Math.sin(u * 9.2) * 28 * (1 - Math.abs(u - 0.5) * 1.2);
      riv.push({
        x: peakPt.x + (mouth.x - peakPt.x) * u + (nx / nl) * wob,
        y: peakPt.y + (mouth.y - peakPt.y) * u + (ny / nl) * wob,
      });
    }
    land.push(
      `<path d="${polyPath(riv, false)}" fill="none" stroke="${P.ink}" stroke-width="2.6" opacity="0.85" stroke-linecap="round"/>`
    );
  }

  // the tarn
  {
    const pts: Pt[] = [];
    for (let i = 0; i < 44; i++) {
      const t = (i / 44) * TAU;
      const rr = 30 * (1 + 0.24 * Math.sin(3 * t + 1) + 0.14 * Math.sin(5 * t));
      pts.push({ x: tarn.x + Math.cos(t) * rr * 1.25, y: tarn.y + Math.sin(t) * rr * 0.8 });
    }
    land.push(`<path d="${polyPath(pts)}" fill="none" stroke="${P.ink}" stroke-width="2.2" opacity="0.9"/>`);
    for (let i = 0; i < 5; i++) {
      const yy = tarn.y - 14 + i * 7;
      land.push(
        `<line x1="${px(tarn.x - 22 + i * 2)}" y1="${px(yy)}" x2="${px(tarn.x + 20 - i * 2)}" y2="${px(yy)}" stroke="${P.ink}" stroke-width="1" opacity="0.4"/>`
      );
    }
  }

  // an offshore islet, if the sea has room for one
  {
    const dirs = [0.75, 2.35, 3.9, 5.2, 1.6, 4.7].map((d) => bayAngle + d);
    const cands: Pt[] = [];
    for (const d of dirs) cands.push(coastPt(d, 1.52), coastPt(d, 1.34));
    const spot = pickSpot(cands, 76, 62);
    if (spot) {
      const pts: Pt[] = [];
      const ph = rand() * TAU;
      for (let i = 0; i < 60; i++) {
        const t = (i / 60) * TAU;
        const rr = 44 * (1 + 0.22 * Math.sin(2 * t + ph) + 0.13 * Math.sin(5 * t + ph) + 0.08 * Math.sin(9 * t));
        pts.push({ x: spot.x + Math.cos(t) * rr * 1.15, y: spot.y + Math.sin(t) * rr * 0.78 });
      }
      land.push(`<path d="${polyPath(pts)}" fill="none" stroke="${P.ink}" stroke-width="3"/>`);
      for (let i = 1; i <= 2; i++) {
        const ring = pts.map((p) => ({
          x: spot.x + (p.x - spot.x) * (1 + i * 0.13),
          y: spot.y + (p.y - spot.y) * (1 + i * 0.13),
        }));
        land.push(
          `<path d="${polyPath(ring)}" fill="none" stroke="${P.ink}" stroke-width="1.1" opacity="${0.36 - i * 0.1}"/>`
        );
      }
      for (let i = 0; i < 7; i++) {
        const t = rand() * TAU;
        const rr = rand() * 26;
        const p = { x: spot.x + Math.cos(t) * rr * 1.1, y: spot.y + Math.sin(t) * rr * 0.7 };
        land.push(
          `<path d="M${px(p.x - 4)} ${px(p.y)}q4 -10 8 0z" fill="${P.ink}" opacity="0.8"/>`
        );
      }
    }
  }
  out.push('<g>' + land.join('') + '</g>');

  /* ================= FURNITURE & LABELS ================= */
  const fg: string[] = [];
  type LabelOpts = {
    anchor?: string;
    font?: string;
    ls?: number;
    op?: number;
    italic?: boolean;
    fill?: string;
    rot?: number;
  };
  const label = (x: number, y: number, text: string, size: number, o: LabelOpts = {}) => {
    const tr = o.rot ? ` transform="rotate(${o.rot.toFixed(2)} ${px(x)} ${px(y)})"` : '';
    fg.push(
      `<text x="${px(x)}" y="${px(y)}" font-family="${o.font || F_SC}" font-size="${size}" fill="${o.fill || P.ink}" text-anchor="${o.anchor || 'middle'}" letter-spacing="${o.ls ?? 2}" opacity="${o.op ?? 1}"${o.italic ? ' font-style="italic"' : ''}${tr}>${esc(text)}</text>`
    );
  };
  const textW = (s: string, size: number, ls = 2) => s.length * (size * 0.56 + ls);

  /* -- the great bay: named in its own water, inside the bite -- */
  const bayLabelPt = coastPt(bayAngle, 1.34);
  {
    label(bayLabelPt.x, bayLabelPt.y, (bay + ' Bay').toUpperCase(), 30, {
      ls: 3,
      op: 0.95,
      rot: Math.sin(bayAngle) * 7,
    });
    avoid.push({ x: bayLabelPt.x, y: bayLabelPt.y, hw: textW(bay + ' Bay', 30, 3) / 2, hh: 26 });
  }

  /* -- the port -- */
  {
    const q = coastPt(portAngle, 0.97);
    fg.push(`<circle cx="${px(q.x)}" cy="${px(q.y)}" r="9" fill="none" stroke="${P.accent}" stroke-width="3"/>`);
    fg.push(`<circle cx="${px(q.x)}" cy="${px(q.y)}" r="3.4" fill="${P.accent}"/>`);
    const outw = Math.cos(portAngle) >= 0;
    const lx = q.x + (outw ? 30 : -30);
    const ly = q.y + (Math.sin(portAngle) > 0 ? 34 : -22);
    fg.push(
      `<line x1="${px(q.x + (outw ? 11 : -11))}" y1="${px(q.y)}" x2="${px(lx - (outw ? 6 : -6))}" y2="${px(ly - 9)}" stroke="${P.ink}" stroke-width="1.3" opacity="0.7"/>`
    );
    label(lx, ly, ('Port ' + port).toUpperCase(), 27, { anchor: outw ? 'start' : 'end', ls: 2.5 });
  }

  /* -- the summit -- */
  {
    for (let i = -1; i <= 1; i++) {
      const bx = peakPt.x + i * 38;
      const by = peakPt.y + Math.abs(i) * 12;
      const hgt = 44 - Math.abs(i) * 13;
      fg.push(
        `<path d="M${px(bx - hgt * 0.8)} ${px(by)}L${px(bx)} ${px(by - hgt)}L${px(bx + hgt * 0.8)} ${px(by)}" fill="none" stroke="${P.ink}" stroke-width="3"/>`
      );
      fg.push(
        `<path d="M${px(bx - hgt * 0.28)} ${px(by - hgt * 0.65)}L${px(bx)} ${px(by - hgt)}L${px(bx + hgt * 0.26)} ${px(by - hgt * 0.62)}" fill="none" stroke="${P.ink}" stroke-width="2" opacity="0.6"/>`
      );
    }
    label(peakPt.x, peakPt.y - 80, ('Mount ' + peak).toUpperCase(), 33, { ls: 3 });
    label(peakPt.x, peakPt.y + 46, elevation.toLocaleString('en-US') + ' ft.', 20, {
      font: F_RM,
      ls: 1,
      op: 0.75,
      italic: true,
    });
  }

  /* -- the wilds -- */
  label(wildPt.x, wildPt.y + 8, ('The ' + wilds + ' Wilds').toUpperCase(), 27, {
    ls: 2.5,
    op: 0.92,
    rot: -4,
  });

  /* -- the tarn, named only if its name has room to breathe -- */
  {
    const me = landLabels[3];
    const clash = landLabels
      .slice(0, 3)
      .some((b) => Math.abs(b.x - me.x) < b.hw + me.hw && Math.abs(b.y - me.y) < b.hh + me.hh + 8);
    if (!clash) label(tarn.x, tarn.y - 42, 'Still Water', 19, { font: F_RM, italic: true, ls: 1, op: 0.7 });
  }

  /* -- the deeps, and the thing that lives in them -- */
  {
    const dreadW = textW('Here be ' + dread, 26, 3);
    const serpent = pickSpot(
      [
        { x: 1128, y: 470 },
        { x: 424, y: 470 },
        { x: 1200, y: 632 },
        { x: 356, y: 632 },
        { x: 1204, y: 1178 },
        { x: 352, y: 1178 },
        { x: 1140, y: 1660 },
        { x: 412, y: 1660 },
      ],
      Math.max(158, dreadW / 2 + 14),
      104
    );
    if (serpent) {
      const sxp = serpent.x - 12;
      const syp = serpent.y - 22;
      const hump = (x: number, y: number, r: number) =>
        `<path d="M${px(x - r)} ${px(y)}a${px(r)} ${px(r * 0.92)} 0 0 1 ${px(r * 2)} 0" fill="none" stroke="${P.ink}" stroke-width="4" stroke-linecap="round"/>`;
      fg.push(hump(sxp - 96, syp, 34) + hump(sxp - 18, syp, 27) + hump(sxp + 46, syp, 20));
      fg.push(
        `<path d="M${px(sxp + 78)} ${px(syp)}q4 -46 40 -52q30 -5 34 20q3 19 -18 24l-30 8z" fill="none" stroke="${P.ink}" stroke-width="4" stroke-linejoin="round"/>`,
        `<circle cx="${px(sxp + 132)}" cy="${px(syp - 32)}" r="3.6" fill="${P.ink}"/>`,
        `<path d="M${px(sxp + 106)} ${px(syp - 46)}l-14 -22l22 8" fill="none" stroke="${P.ink}" stroke-width="3" stroke-linecap="round"/>`
      );
      label(serpent.x, syp + 70, ('Here be ' + dread).toUpperCase(), 26, { ls: 3, fill: P.accent });
    }

    // soundings, and the name of the deep water they measure
    const deepAngle = peakAngle + Math.PI * 0.6;
    const deepsTxt = ('The ' + dread + ' Deeps').toUpperCase();
    const deepsW = textW(deepsTxt, 23, 2.5);
    const deeps =
      pickSpot([coastPt(deepAngle, 1.34), coastPt(deepAngle, 1.55), coastPt(deepAngle + 0.5, 1.4), coastPt(deepAngle - 0.5, 1.4)], deepsW / 2 + 10, 22) ||
      coastPt(deepAngle, 1.34);
    label(deeps.x, deeps.y + 7, deepsTxt, 23, { ls: 2.5, op: 0.8, rot: 8 });

    for (let i = 0; i < 40; i++) {
      const t = deepAngle + (rand() - 0.5) * 1.5;
      const p = coastPt(t, 1.14 + rand() * 0.5);
      if (
        p.y < 350 || p.y > 1720 || p.x < 130 || p.x > W - 130 ||
        inside(p, 1.06) ||
        avoid.some((a) => Math.abs(a.x - p.x) < a.hw + 30 && Math.abs(a.y - p.y) < a.hh + 22)
      ) continue;
      fg.push(
        `<text x="${px(p.x)}" y="${px(p.y)}" font-family="${F_RM}" font-size="16" fill="${P.ink}" opacity="0.5" text-anchor="middle">${20 + Math.floor(rand() * 780)}</text>`
      );
    }
  }

  /* -- the voyage: port to bay, and the mark -- */
  {
    // The track hugs the coast rather than cutting across it — a ship's course,
    // not a straight line.
    let d0 = portAngle;
    let d1 = bayAngle;
    while (d1 - d0 > Math.PI) d1 -= TAU;
    while (d0 - d1 > Math.PI) d1 += TAU;
    const wake: Pt[] = [];
    const N = 40;
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      const t = d0 + (d1 - d0) * u;
      let lee = 0;
      for (let k = -4; k <= 4; k++) lee = Math.max(lee, radiusAt(t + k * 0.1));
      const rr = (lee / radiusAt(t)) * (1.1 + 0.12 * Math.sin(Math.PI * u));
      wake.push(coastPt(t, rr));
    }
    const b = coastPt(d1, 1.04); // the mark rides just inside the bay mouth
    wake.push(b);
    fg.push(
      `<path d="${polyPath(wake, false)}" fill="none" stroke="${P.accent}" stroke-width="3" stroke-dasharray="2 12" stroke-linecap="round"/>`
    );
    const m = 12;
    fg.push(
      `<path d="M${px(b.x - m)} ${px(b.y - m)}l${px(m * 2)} ${px(m * 2)}M${px(b.x + m)} ${px(b.y - m)}l${px(-m * 2)} ${px(m * 2)}" stroke="${P.accent}" stroke-width="5" stroke-linecap="round"/>`
    );
    avoid.push({ x: b.x, y: b.y, hw: 26, hh: 26 });
  }

  /* -- the ship -- */
  {
    const ship = pickSpot(
      [
        { x: 306, y: 1560 },
        { x: 306, y: 640 },
        { x: 1240, y: 700 },
        { x: 1244, y: 1200 },
        { x: 336, y: 1200 },
        { x: 780, y: 1660 },
      ],
      88,
      74
    );
    if (ship) {
      fg.push(
        `<g transform="translate(${px(ship.x)} ${px(ship.y + 22)}) scale(1.1) rotate(-4)" fill="none" stroke="${P.ink}" stroke-width="3" stroke-linecap="round">` +
          '<path d="M-56 12q56 26 112 0l-14 20q-42 14 -84 0z"/>' +
          '<path d="M0 12L0 -74"/>' +
          '<path d="M0 -68q34 12 34 26q0 12 -34 22z" stroke-width="2.6"/>' +
          '<path d="M0 -30q-30 10 -30 22q0 10 30 18z" stroke-width="2.6"/>' +
          '<path d="M0 -74l16 -12l-16 -6z" stroke-width="2.2"/>' +
          '</g>'
      );
    }
  }

  /* -- compass rose -- */
  {
    const x = roseC.x;
    const y = roseC.y;
    const r = roseR;
    const g: string[] = [];
    g.push(`<circle cx="${px(x)}" cy="${px(y)}" r="${px(r)}" fill="none" stroke="${P.ink}" stroke-width="2.4" opacity="0.85"/>`);
    g.push(`<circle cx="${px(x)}" cy="${px(y)}" r="${px(r * 0.86)}" fill="none" stroke="${P.ink}" stroke-width="1.2" opacity="0.6"/>`);
    for (let i = 0; i < 64; i++) {
      const t = (i / 64) * TAU;
      const r0 = r * (i % 4 === 0 ? 0.86 : 0.93);
      g.push(
        `<line x1="${px(x + Math.cos(t) * r0)}" y1="${px(y + Math.sin(t) * r0)}" x2="${px(x + Math.cos(t) * r)}" y2="${px(y + Math.sin(t) * r)}" stroke="${P.ink}" stroke-width="1.2" opacity="0.7"/>`
      );
    }
    for (let i = 0; i < 8; i++) {
      const t = (i / 8) * TAU - Math.PI / 2;
      const len = r * 0.84;
      const wdt = r * 0.115;
      const tipx = x + Math.cos(t) * len;
      const tipy = y + Math.sin(t) * len;
      const lx = x + Math.cos(t + Math.PI / 2) * wdt;
      const ly = y + Math.sin(t + Math.PI / 2) * wdt;
      const rx = x + Math.cos(t - Math.PI / 2) * wdt;
      const ry = y + Math.sin(t - Math.PI / 2) * wdt;
      g.push(`<path d="M${px(x)} ${px(y)}L${px(lx)} ${px(ly)}L${px(tipx)} ${px(tipy)}Z" fill="${P.ink}" opacity="0.92"/>`);
      g.push(`<path d="M${px(x)} ${px(y)}L${px(rx)} ${px(ry)}L${px(tipx)} ${px(tipy)}Z" fill="none" stroke="${P.ink}" stroke-width="2"/>`);
    }
    for (let i = 0; i < 8; i++) {
      const t = ((i + 0.5) / 8) * TAU - Math.PI / 2;
      const len = r * 0.5;
      const wdt = r * 0.06;
      const tipx = x + Math.cos(t) * len;
      const tipy = y + Math.sin(t) * len;
      const lx = x + Math.cos(t + Math.PI / 2) * wdt;
      const ly = y + Math.sin(t + Math.PI / 2) * wdt;
      const rx = x + Math.cos(t - Math.PI / 2) * wdt;
      const ry = y + Math.sin(t - Math.PI / 2) * wdt;
      g.push(`<path d="M${px(lx)} ${px(ly)}L${px(tipx)} ${px(tipy)}L${px(rx)} ${px(ry)}Z" fill="none" stroke="${P.ink}" stroke-width="1.6" opacity="0.8"/>`);
    }
    g.push(
      `<path d="M${px(x)} ${px(y - r * 0.84)}l-9 -30q9 -14 9 -30q0 16 9 30z" fill="${P.accent}" stroke="${P.accent}" stroke-width="2" stroke-linejoin="round"/>`
    );
    const card: [string, number][] = [['E', 0], ['S', 1], ['W', 2], ['N', 3]];
    for (const [ch, i] of card) {
      const t = (i / 4) * TAU;
      g.push(
        `<text x="${px(x + Math.cos(t) * r * 1.18)}" y="${px(y + Math.sin(t) * r * 1.18 + 9)}" font-family="${F_SC}" font-size="30" fill="${P.ink}" text-anchor="middle">${ch}</text>`
      );
    }
    fg.push('<g>' + g.join('') + '</g>');
  }

  /* -- scale bar -- */
  {
    const bx = 214;
    const by = 1688;
    const bw = 300;
    fg.push(`<rect x="${px(bx)}" y="${px(by)}" width="${px(bw)}" height="15" fill="none" stroke="${P.ink}" stroke-width="2"/>`);
    for (let i = 0; i < 6; i += 2) {
      fg.push(`<rect x="${px(bx + (bw / 6) * i)}" y="${px(by)}" width="${px(bw / 6)}" height="15" fill="${P.ink}"/>`);
    }
    label(bx, by - 14, '0', 18, { font: F_RM, ls: 0, op: 0.85 });
    label(bx + bw, by - 14, '30', 18, { font: F_RM, ls: 0, op: 0.85 });
    label(bx + bw / 2, by + 42, 'Leagues', 20, { font: F_RM, italic: true, ls: 1, op: 0.85 });
  }

  /* ================= PLATE FURNITURE ================= */
  const frame: string[] = [];
  const M = 62;
  frame.push(`<rect x="${M}" y="${M}" width="${W - 2 * M}" height="${H - 2 * M}" fill="none" stroke="${P.ink}" stroke-width="5"/>`);
  frame.push(`<rect x="${M + 15}" y="${M + 15}" width="${W - 2 * M - 30}" height="${H - 2 * M - 30}" fill="none" stroke="${P.ink}" stroke-width="1.8"/>`);
  for (let x = M + 15; x <= W - M - 15 + 0.01; x += (W - 2 * M - 30) / 44) {
    frame.push(`<line x1="${px(x)}" y1="${M}" x2="${px(x)}" y2="${M + 15}" stroke="${P.ink}" stroke-width="1.6"/>`);
    frame.push(`<line x1="${px(x)}" y1="${H - M - 15}" x2="${px(x)}" y2="${H - M}" stroke="${P.ink}" stroke-width="1.6"/>`);
  }
  for (let y = M + 15; y <= H - M - 15 + 0.01; y += (H - 2 * M - 30) / 56) {
    frame.push(`<line x1="${M}" y1="${px(y)}" x2="${M + 15}" y2="${px(y)}" stroke="${P.ink}" stroke-width="1.6"/>`);
    frame.push(`<line x1="${W - M - 15}" y1="${px(y)}" x2="${W - M}" y2="${px(y)}" stroke="${P.ink}" stroke-width="1.6"/>`);
  }
  const corners: [number, number][] = [
    [M + 15, M + 15],
    [W - M - 15, M + 15],
    [M + 15, H - M - 15],
    [W - M - 15, H - M - 15],
  ];
  for (const [qx, qy] of corners) {
    frame.push(
      `<circle cx="${px(qx)}" cy="${px(qy)}" r="13" fill="${P.ink}"/><circle cx="${px(qx)}" cy="${px(qy)}" r="6.5" fill="none" stroke="${SHIRTS[sk].swatch}" stroke-width="3"/>`
    );
  }
  out.push('<g>' + frame.join('') + '</g>');

  /* ---- title block ---- */
  const title: string[] = [];
  const tName = name.toUpperCase();
  const tSize = tName.length > 13 ? 92 : tName.length > 9 ? 114 : 136;
  title.push(
    `<text x="${W / 2}" y="238" font-family="${F_SC}" font-size="40" fill="${P.ink}" text-anchor="middle" letter-spacing="14">THE ISLE OF</text>`
  );
  const nameY = 238 + tSize * 0.98;
  title.push(
    `<text x="${W / 2}" y="${px(nameY)}" font-family="${F_SC}" font-size="${tSize}" fill="${P.ink}" text-anchor="middle" letter-spacing="6">${esc(tName)}</text>`
  );
  const ruleY = nameY + 42;
  const halfw = Math.max(200, Math.min(560, textW(tName, tSize, 6) / 2 + 44));
  title.push(
    `<path d="M${px(W / 2 - halfw)} ${px(ruleY)}L${px(W / 2 - 26)} ${px(ruleY)}M${px(W / 2 + 26)} ${px(ruleY)}L${px(W / 2 + halfw)} ${px(ruleY)}" stroke="${P.ink}" stroke-width="2.4"/>`
  );
  title.push(`<path d="M${px(W / 2)} ${px(ruleY - 11)}l11 11l-11 11l-11 -11z" fill="${P.accent}"/>`);
  title.push(
    `<text x="${W / 2}" y="${px(ruleY + 46)}" font-family="${F_RM}" font-style="italic" font-size="31" fill="${P.ink}" text-anchor="middle" letter-spacing="2">surveyed &amp; charted from life &#183; anno ${esc(year)}</text>`
  );
  // IM Fell has no degree or prime glyph, so the coordinates are set the way the
  // period atlases actually set them: abbreviated words, plain figures.
  title.push(
    `<text x="${W / 2}" y="${px(ruleY + 88)}" font-family="${F_SC}" font-size="25" fill="${P.ink}" text-anchor="middle" letter-spacing="5" opacity="0.85">LAT. ${latDeg} ${String(latMin).padStart(2, '0')} ${NS} &#183; LONG. ${lonDeg} ${String(lonMin).padStart(2, '0')} ${EW}</text>`
  );
  out.push('<g>' + title.join('') + '</g>');

  out.push('<g>' + fg.join('') + '</g>');

  /* ---- foot cartouche ---- */
  const foot: string[] = [];
  const fy = 1802;
  foot.push(`<path d="M${W / 2 - 300} ${fy - 36}L${W / 2 + 300} ${fy - 36}" stroke="${P.ink}" stroke-width="1.6" opacity="0.8"/>`);
  foot.push(
    `<path d="M${W / 2 - 318} ${fy - 36}l11 -8v16zM${W / 2 + 318} ${fy - 36}l-11 -8v16z" fill="${P.ink}" opacity="0.8"/>`
  );
  foot.push(
    `<text x="${W / 2}" y="${fy + 4}" font-family="${F_SC}" font-size="27" fill="${P.ink}" text-anchor="middle" letter-spacing="5">THE ATLAS OF PERSONS &#183; PLATE ${roman(plate)}</text>`
  );
  foot.push(
    `<text x="${W / 2}" y="${fy + 46}" font-family="${F_RM}" font-style="italic" font-size="23" fill="${P.ink}" text-anchor="middle" letter-spacing="1.5" opacity="0.85">one island, one soul, no second impression</text>`
  );
  out.push('<g>' + foot.join('') + '</g>');

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">` +
    '<g shape-rendering="geometricPrecision">' +
    out.join('') +
    '</g></svg>'
  );
}
