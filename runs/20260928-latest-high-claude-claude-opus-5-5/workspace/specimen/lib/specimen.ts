import { Rng, hashStr } from "./rng";
import {
  Design,
  PaletteId,
  STATUSES,
  epithetFor,
  familyFor,
  kindById,
  statusById,
  traitById,
} from "./design";
import { colorById } from "./catalog";

// Plate geometry. 1000 x 1237 matches the Prodigi front print area (4680 x 5790 px) aspect ratio.
export const PLATE_W = 1000;
export const PLATE_H = 1237;
export const PRINT_W = 4680;
export const PRINT_H = 5790;

const SERIF = "EB Garamond";
const MONO = "IBM Plex Mono";

type Pt = [number, number];
type Pal = { wing: [string, string]; accent: string; dark: string; light: string; body: string };

const PALETTES: Record<Exclude<PaletteId, "wild">, Pal & { label: string }> = {
  luna: { label: "Luna", wing: ["#d6ecb4", "#79b36a"], accent: "#f1c75b", dark: "#5c3657", light: "#f7f3dc", body: "#ebe5c8" },
  monarch: { label: "Monarch", wing: ["#fbb03b", "#e0561b"], accent: "#fff8ea", dark: "#1c1511", light: "#fff4df", body: "#2b1f18" },
  morpho: { label: "Morpho", wing: ["#7fdcff", "#1a56cc"], accent: "#d4f5ff", dark: "#0b1836", light: "#eaf8ff", body: "#1b2233" },
  atlas: { label: "Atlas", wing: ["#eab06a", "#962f19"], accent: "#f5e4c2", dark: "#361b11", light: "#fcefd8", body: "#7b3a20" },
  rosy: { label: "Rosy Maple", wing: ["#ffe685", "#f47fac"], accent: "#ff4f93", dark: "#7a2b53", light: "#fff8da", body: "#ffd84a" },
  emperor: { label: "Emperor", wing: ["#c29cf5", "#4a2385"], accent: "#f6c75a", dark: "#1d0f31", light: "#f1e7ff", body: "#39224f" },
  jewel: { label: "Jewel", wing: ["#44e095", "#0b6a6c"], accent: "#f3c24b", dark: "#062727", light: "#e1fff0", body: "#0b4a4a" },
  ember: { label: "Ember", wing: ["#ffd35e", "#e43d2a"], accent: "#2e1a4d", dark: "#2a0e0e", light: "#fff2c6", body: "#5b1a12" },
  ghost: { label: "Ghost", wing: ["#f5f0e6", "#c9bda6"], accent: "#8e7b66", dark: "#4a3f35", light: "#ffffff", body: "#d9cebb" },
};

export const PALETTE_INFO: { id: PaletteId; label: string; swatch: string[] }[] = [
  ...(Object.keys(PALETTES) as Exclude<PaletteId, "wild">[]).map((id) => ({
    id,
    label: PALETTES[id].label,
    swatch: [PALETTES[id].wing[0], PALETTES[id].wing[1], PALETTES[id].accent],
  })),
  { id: "wild", label: "Wild card", swatch: ["#ff7a59", "#5b6cff", "#35d49a"] },
];

function hslHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const hex = (x: number) => Math.round(x * 255).toString(16).padStart(2, "0");
  return `#${hex(f(0))}${hex(f(8))}${hex(f(4))}`;
}

function paletteFor(id: PaletteId, seed: number): Pal {
  if (id !== "wild") return PALETTES[id];
  const r = new Rng(hashStr(`wild:${seed}`));
  const h = r.range(0, 360);
  const h2 = (h + r.pick([30, 150, 180, 210, 330])) % 360;
  return {
    wing: [hslHex(h, r.range(70, 95), r.range(66, 78)), hslHex(h + r.range(-25, 25), r.range(60, 85), r.range(36, 48))],
    accent: hslHex(h2, r.range(75, 95), r.range(55, 68)),
    dark: hslHex(h + 180, r.range(25, 45), r.range(10, 16)),
    light: hslHex(h, 40, 95),
    body: hslHex(h + r.range(-40, 40), r.range(30, 55), r.range(25, 40)),
  };
}

// ---------------------------------------------------------------- geometry helpers

const f = (n: number) => (Math.round(n * 10) / 10).toString();
const P = (p: Pt) => `${f(p[0])} ${f(p[1])}`;
const lerp = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const dist = (a: Pt, b: Pt) => Math.hypot(b[0] - a[0], b[1] - a[1]);

function cubic(p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt {
  const u = 1 - t;
  return [
    u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
  ];
}

function quad(p0: Pt, p1: Pt, p2: Pt, t: number): Pt {
  const u = 1 - t;
  return [u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]];
}

// Catmull-Rom -> cubic bezier through a list of points.
function smooth(pts: Pt[]): string {
  if (pts.length < 2) return "";
  let d = `M${P(pts[0])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${P(c1)} ${P(c2)} ${P(p2)}`;
  }
  return d;
}

class BBox {
  x0 = Infinity;
  y0 = Infinity;
  x1 = -Infinity;
  y1 = -Infinity;
  add(p: Pt, pad = 0) {
    this.x0 = Math.min(this.x0, p[0] - pad, -p[0] - pad);
    this.x1 = Math.max(this.x1, p[0] + pad, -p[0] + pad); // creatures are mirrored around x = 0
    this.y0 = Math.min(this.y0, p[1] - pad);
    this.y1 = Math.max(this.y1, p[1] + pad);
  }
}

type Ctx = { id: (k: string) => string; defs: string[]; outline: string; dark: boolean };
type Creature = { body: string; bbox: BBox; anchors: [Pt, Pt, Pt] };

export function escapeXml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

// ---------------------------------------------------------------- wings

type WingStyle = {
  veinW: number;
  veinO: number;
  border: number;
  dots: boolean;
  band: "none" | "smooth" | "zigzag";
  innerBand: boolean;
  foreEye: boolean;
  hindEye: boolean;
  apexPatch: boolean;
  speckle: number;
  invert: boolean;
  basalShade: boolean;
};

function wingArt(
  ctx: Ctx,
  key: string,
  d: string,
  root: Pt,
  margin: (t: number) => Pt,
  far: Pt,
  pal: Pal,
  r: Rng,
  st: WingStyle,
  fore: boolean,
): string {
  const clip = ctx.id(`${key}c`);
  const grad = ctx.id(`${key}g`);
  const shade = ctx.id(`${key}s`);
  const [c0, c1] = st.invert ? [pal.wing[1], pal.wing[0]] : [pal.wing[0], pal.wing[1]];
  ctx.defs.push(
    `<clipPath id="${clip}"><path d="${d}"/></clipPath>`,
    `<linearGradient id="${grad}" gradientUnits="userSpaceOnUse" x1="${f(root[0])}" y1="${f(root[1])}" x2="${f(far[0])}" y2="${f(far[1])}"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c0}"/></linearGradient>`,
    `<radialGradient id="${shade}" gradientUnits="userSpaceOnUse" cx="${f(root[0])}" cy="${f(root[1])}" r="${f(dist(root, far) * 0.55)}"><stop offset="0" stop-color="${pal.dark}" stop-opacity="0.55"/><stop offset="1" stop-color="${pal.dark}" stop-opacity="0"/></radialGradient>`,
  );
  const out: string[] = [`<path d="${d}" fill="url(#${grad})"/>`];
  if (st.basalShade) out.push(`<circle cx="${f(root[0])}" cy="${f(root[1])}" r="${f(dist(root, far) * 0.55)}" fill="url(#${shade})"/>`);

  // speckled scales
  const specks: string[] = [];
  for (let i = 0; i < st.speckle; i++) {
    const p = lerp(root, margin(r.next()), r.range(0.15, 1));
    specks.push(`<circle cx="${f(p[0])}" cy="${f(p[1])}" r="${f(r.range(1, 3.2))}"/>`);
  }
  if (specks.length) out.push(`<g fill="${r.chance(0.5) ? pal.dark : pal.light}" opacity="0.28">${specks.join("")}</g>`);

  // inner (antemedial) band
  if (st.innerBand) {
    const t = r.range(0.3, 0.42);
    const pts: Pt[] = [];
    for (let i = -1; i <= 9; i++) pts.push(lerp(root, margin(i / 8), t + r.range(-0.02, 0.02)));
    out.push(`<path d="${smooth(pts)}" fill="none" stroke="${pal.light}" stroke-width="${f(r.range(4, 9))}" opacity="0.55" stroke-linecap="round"/>`);
  }

  // veins
  const nv = fore ? r.int(6, 9) : r.int(5, 7);
  const veins: string[] = [];
  for (let i = 0; i < nv; i++) {
    const m = margin((i + 0.5) / nv);
    const end = lerp(root, m, 1.08);
    const mid = lerp(root, end, 0.5);
    const len = dist(root, end);
    const bend: Pt = [mid[0] + ((m[1] - root[1]) / len) * len * 0.06, mid[1] - ((m[0] - root[0]) / len) * len * 0.06];
    veins.push(`<path d="M${P(root)} Q${P(bend)} ${P(end)}"/>`);
  }
  out.push(`<g fill="none" stroke="${pal.dark}" stroke-width="${f(st.veinW)}" opacity="${f(st.veinO)}">${veins.join("")}</g>`);

  // postmedial band
  if (st.band !== "none") {
    const t = r.range(0.58, 0.72);
    const pts: Pt[] = [];
    for (let i = -1; i <= 13; i++) {
      const zig = st.band === "zigzag" ? (i % 2 ? 0.035 : -0.035) : r.range(-0.012, 0.012);
      pts.push(lerp(root, margin(i / 12), t + zig));
    }
    const path = st.band === "zigzag" ? `M${pts.map(P).join(" L")}` : smooth(pts);
    out.push(
      `<path d="${path}" fill="none" stroke="${pal.accent}" stroke-width="${f(r.range(10, 22))}" opacity="0.88" stroke-linejoin="round" stroke-linecap="round"/>`,
    );
  }

  // apex patch
  if (fore && st.apexPatch) {
    const c = lerp(root, far, 0.84);
    const ang = (Math.atan2(far[1] - root[1], far[0] - root[0]) * 180) / Math.PI;
    out.push(
      `<ellipse cx="${f(c[0])}" cy="${f(c[1])}" rx="${f(r.range(34, 52))}" ry="${f(r.range(14, 24))}" transform="rotate(${f(ang + 70)} ${f(c[0])} ${f(c[1])})" fill="${r.chance(0.6) ? pal.light : pal.dark}" opacity="0.85"/>`,
    );
  }

  // eyespot
  if ((fore && st.foreEye) || (!fore && st.hindEye)) {
    const c = lerp(root, margin(0.5), fore ? r.range(0.5, 0.6) : r.range(0.48, 0.58));
    const R = fore ? r.range(15, 26) : r.range(26, 44);
    out.push(
      `<circle cx="${f(c[0])}" cy="${f(c[1])}" r="${f(R * 1.12)}" fill="none" stroke="${pal.light}" stroke-width="2.5" opacity="0.8"/>`,
      `<circle cx="${f(c[0])}" cy="${f(c[1])}" r="${f(R)}" fill="${pal.dark}"/>`,
      `<circle cx="${f(c[0])}" cy="${f(c[1])}" r="${f(R * 0.8)}" fill="${pal.accent}"/>`,
      `<circle cx="${f(c[0])}" cy="${f(c[1])}" r="${f(R * 0.5)}" fill="${pal.dark}"/>`,
      `<circle cx="${f(c[0] - R * 0.16)}" cy="${f(c[1] - R * 0.16)}" r="${f(R * 0.17)}" fill="${pal.light}"/>`,
    );
  }

  // dark margin + spots
  if (st.border > 0) {
    out.push(`<path d="${d}" fill="none" stroke="${pal.dark}" stroke-width="${f(st.border * 2)}"/>`);
    if (st.dots) {
      const k = fore ? 11 : 8;
      const dots: string[] = [];
      for (let i = 1; i < k; i++) {
        const m = margin(i / k);
        const p = lerp(m, root, (st.border * 0.5) / dist(m, root));
        dots.push(`<circle cx="${f(p[0])}" cy="${f(p[1])}" r="${f(st.border * r.range(0.16, 0.24))}"/>`);
      }
      out.push(`<g fill="${pal.light}">${dots.join("")}</g>`);
    }
  }

  return `<g clip-path="url(#${clip})">${out.join("")}</g><path d="${d}" fill="none" stroke="${ctx.outline}" stroke-width="${ctx.dark ? 2.6 : 2.2}" stroke-linejoin="round"/>`;
}

function lepidoptera(r: Rng, pal: Pal, moth: boolean, ctx: Ctx): Creature {
  const bb = new BBox();
  const span = r.range(300, 360);

  // forewing
  const P0: Pt = [8, -42];
  const A: Pt = [span, moth ? -r.range(70, 130) : -r.range(125, 185)];
  const C1: Pt = [span * 0.35, P0[1] - r.range(40, 80)];
  const C2: Pt = [A[0] - r.range(50, 110), A[1] - r.range(-5, 25)];
  const T: Pt = [span * r.range(0.5, 0.66), r.range(40, 90)];
  const M1: Pt = [A[0] + r.range(-10, 25), A[1] + (T[1] - A[1]) * 0.35];
  const M2: Pt = [T[0] + r.range(30, 80), T[1] - r.range(10, 40)];
  const P3: Pt = [12, 8];
  const I1: Pt = [T[0] * 0.6, T[1] + r.range(-10, 10)];
  const I2: Pt = [P3[0] + 40, P3[1] + 15];
  const foreD = `M${P(P0)} C${P(C1)} ${P(C2)} ${P(A)} C${P(M1)} ${P(M2)} ${P(T)} C${P(I1)} ${P(I2)} ${P(P3)} Z`;
  const foreMargin = (t: number) => cubic(A, M1, M2, T, Math.min(1, Math.max(0, t)));
  [A, M1, T, M2].forEach((p) => bb.add(p, 6));

  // hindwing
  const H0: Pt = [8, -4];
  const H1: Pt = [span * r.range(0.55, 0.7), r.range(20, 55)];
  const H2: Pt = [span * r.range(0.38, 0.55), r.range(180, 245)];
  const H3: Pt = [6, r.range(100, 140)];
  const hm1: Pt = [H1[0] + r.range(30, 70), H1[1] + r.range(40, 80)];
  const hm2: Pt = [H2[0] + r.range(40, 80), H2[1] - r.range(30, 60)];
  const hasTail = r.chance(moth ? 0.35 : 0.45);
  let hindD: string;
  let hindEnd: Pt = H2;
  if (hasTail) {
    const tl = r.range(110, 180);
    const tip: Pt = [H2[0] + r.range(-10, 45), H2[1] + tl];
    const Ta: Pt = [H2[0] + 18, H2[1] - 8];
    const Tb: Pt = [H2[0] - 26, H2[1] + 4];
    hindEnd = Ta;
    hindD =
      `M${P(H0)} C${P([H0[0] + 60, H0[1] - 25])} ${P([H1[0] - 40, H1[1] - 45])} ${P(H1)} C${P(hm1)} ${P(hm2)} ${P(Ta)}` +
      ` C${P([Ta[0] + 6, Ta[1] + tl * 0.45])} ${P([tip[0] + 20, tip[1] - tl * 0.25])} ${P(tip)}` +
      ` C${P([tip[0] - 16, tip[1] - tl * 0.18])} ${P([Tb[0] + 2, Tb[1] + tl * 0.4])} ${P(Tb)}` +
      ` C${P([Tb[0] - 30, Tb[1] + 10])} ${P([H3[0] + 40, H3[1] + 30])} ${P(H3)} Z`;
    bb.add(tip, 12);
  } else {
    hindD =
      `M${P(H0)} C${P([H0[0] + 60, H0[1] - 25])} ${P([H1[0] - 40, H1[1] - 45])} ${P(H1)} C${P(hm1)} ${P(hm2)} ${P(H2)}` +
      ` C${P([H2[0] - 40, H2[1] + 35])} ${P([H3[0] + 40, H3[1] + 30])} ${P(H3)} Z`;
  }
  const hindMargin = (t: number) => cubic(H1, hm1, hm2, hindEnd, Math.min(1, Math.max(0, t)));
  [H1, H2, hm1, hm2].forEach((p) => bb.add(p, 6));

  const st: WingStyle = {
    veinW: r.chance(pal === PALETTES.monarch ? 1 : 0.3) ? r.range(3, 5) : r.range(1.2, 2.2),
    veinO: r.range(0.35, 0.8),
    border: r.chance(moth ? 0.45 : 0.8) ? r.range(10, 24) : 0,
    dots: r.chance(0.65),
    band: r.pick(["none", "smooth", "smooth", "zigzag"] as const),
    innerBand: r.chance(moth ? 0.6 : 0.3),
    foreEye: r.chance(moth ? 0.55 : 0.3),
    hindEye: r.chance(moth ? 0.7 : 0.5),
    apexPatch: r.chance(moth ? 0.35 : 0.55),
    speckle: moth ? r.int(30, 110) : r.int(0, 40),
    invert: r.chance(0.3),
    basalShade: r.chance(0.6),
  };

  const hind = wingArt(ctx, "hw", hindD, H0, hindMargin, hindMargin(0.55), pal, r, st, false);
  const fore = wingArt(ctx, "fw", foreD, [10, -18], foreMargin, A, pal, r, st, true);

  // body
  const bw = moth ? r.range(16, 23) : r.range(9, 13);
  const abdL = moth ? r.range(140, 175) : r.range(150, 185);
  const bodyParts: string[] = [];
  bodyParts.push(
    `<path d="M0 -12 C${f(bw * 1.25)} -2 ${f(bw * 1.1)} ${f(abdL * 0.6)} 0 ${f(abdL)} C${f(-bw * 1.1)} ${f(abdL * 0.6)} ${f(-bw * 1.25)} -2 0 -12 Z" fill="${pal.body}" stroke="${ctx.outline}" stroke-width="2"/>`,
  );
  const segs: string[] = [];
  for (let i = 1; i <= 6; i++) {
    const y = (abdL * i) / 7.2;
    const w = bw * (1 - Math.pow(y / abdL, 2) * 0.75);
    segs.push(`<path d="M${f(-w)} ${f(y)} Q0 ${f(y + 6)} ${f(w)} ${f(y)}"/>`);
  }
  bodyParts.push(`<g fill="none" stroke="${pal.dark}" stroke-width="1.6" opacity="0.4">${segs.join("")}</g>`);
  const thR = moth ? bw * 1.2 : bw * 1.25;
  if (moth) {
    const fur: string[] = [];
    for (let i = 0; i < 46; i++) {
      const a = (i / 46) * Math.PI * 2;
      const x = Math.cos(a) * thR * 0.95;
      const y = -30 + Math.sin(a) * 30;
      const l = r.range(5, 11);
      fur.push(`<path d="M${f(x)} ${f(y)} l${f(Math.cos(a) * l)} ${f(Math.sin(a) * l)}"/>`);
    }
    bodyParts.push(`<g stroke="${pal.body}" stroke-width="3" stroke-linecap="round">${fur.join("")}</g>`);
  }
  bodyParts.push(
    `<ellipse cx="0" cy="-30" rx="${f(thR)}" ry="30" fill="${pal.body}" stroke="${ctx.outline}" stroke-width="2"/>`,
    `<ellipse cx="0" cy="-34" rx="${f(thR * 0.45)}" ry="16" fill="${pal.light}" opacity="0.25"/>`,
  );
  const headR = moth ? bw * 0.7 + 3 : bw * 0.9 + 3;
  const headY = -60 - headR * 0.6;
  bodyParts.push(
    `<circle cx="0" cy="${f(headY)}" r="${f(headR)}" fill="${pal.body}" stroke="${ctx.outline}" stroke-width="2"/>`,
    `<circle cx="${f(headR * 0.62)}" cy="${f(headY - 2)}" r="${f(headR * 0.42)}" fill="${pal.dark}"/>`,
    `<circle cx="${f(-headR * 0.62)}" cy="${f(headY - 2)}" r="${f(headR * 0.42)}" fill="${pal.dark}"/>`,
    `<circle cx="${f(headR * 0.5)}" cy="${f(headY - 4)}" r="${f(headR * 0.12)}" fill="#fff" opacity="0.8"/>`,
    `<circle cx="${f(-headR * 0.74)}" cy="${f(headY - 4)}" r="${f(headR * 0.12)}" fill="#fff" opacity="0.8"/>`,
  );
  bb.add([bw * 1.3, abdL], 4);

  // antennae (drawn for the right side; mirrored below)
  const a0: Pt = [headR * 0.35, headY - headR * 0.8];
  const tip: Pt = moth ? [r.range(70, 110), headY - r.range(95, 135)] : [r.range(55, 95), headY - r.range(130, 175)];
  const ac: Pt = [a0[0] + 10, (a0[1] + tip[1]) / 2 - 20];
  let ant = `<path d="M${P(a0)} Q${P(ac)} ${P(tip)}" fill="none" stroke="${ctx.outline}" stroke-width="2.4" stroke-linecap="round"/>`;
  if (moth) {
    const barbs: string[] = [];
    for (let i = 2; i <= 19; i++) {
      const t = i / 20;
      const p = quad(a0, ac, tip, t);
      const p2 = quad(a0, ac, tip, t + 0.01);
      const tx = p2[0] - p[0];
      const ty = p2[1] - p[1];
      const tl = Math.hypot(tx, ty) || 1;
      const nx = -ty / tl;
      const ny = tx / tl;
      const len = 17 * (1 - t) + 4;
      const fx = (tx / tl) * len * 0.5;
      const fy = (ty / tl) * len * 0.5;
      barbs.push(`<path d="M${P(p)} l${f(nx * len + fx)} ${f(ny * len + fy)} M${P(p)} l${f(-nx * len + fx)} ${f(-ny * len + fy)}"/>`);
    }
    ant += `<g stroke="${ctx.outline}" stroke-width="1.5" stroke-linecap="round">${barbs.join("")}</g>`;
  } else {
    const ang = (Math.atan2(tip[1] - ac[1], tip[0] - ac[0]) * 180) / Math.PI;
    ant += `<ellipse cx="${f(tip[0])}" cy="${f(tip[1])}" rx="11" ry="5.5" transform="rotate(${f(ang)} ${f(tip[0])} ${f(tip[1])})" fill="${pal.body}" stroke="${ctx.outline}" stroke-width="2"/>`;
  }
  bb.add(tip, 20);

  const sideId = ctx.id("side");
  const antId = ctx.id("ant");
  const body =
    `<g id="${sideId}">${hind}${fore}</g><use href="#${sideId}" transform="scale(-1 1)"/>` +
    `<g id="${antId}">${ant}</g><use href="#${antId}" transform="scale(-1 1)"/>` +
    bodyParts.join("") +
    pinHead(r, [0, -34]);

  const w1 = lerp([10, -18], foreMargin(0.4), 0.72);
  const w2 = lerp(H0, hindMargin(0.75), 0.72);
  return {
    body,
    bbox: bb,
    anchors: [[-w1[0], w1[1]], [w2[0], w2[1]], [-tip[0], tip[1]]],
  };
}

// ---------------------------------------------------------------- beetle

function beetle(r: Rng, pal: Pal, ctx: Ctx): Creature {
  const bb = new BBox();
  const w = r.range(95, 125);
  const L = r.range(250, 305);
  const pn = r.range(72, 100);
  const wb = w * 0.9;
  const wt = w * r.range(0.5, 0.64);
  const hh = r.range(26, 34);
  const headCy = -pn - hh * 0.55;
  const headFront = headCy - hh;

  const legFill = pal.dark;
  const legOutline = ctx.dark ? ctx.outline : null;
  const leg = (pts: Pt[], widths: number[]) => {
    let s = "";
    for (const pass of legOutline ? [0, 1] : [1]) {
      for (let i = 0; i < pts.length - 1; i++) {
        const wdt = widths[Math.min(i, widths.length - 1)] + (pass === 0 ? 3.5 : 0);
        s += `<path d="M${P(pts[i])} L${P(pts[i + 1])}" stroke="${pass === 0 ? legOutline : legFill}" stroke-width="${f(wdt)}" stroke-linecap="round"/>`;
      }
    }
    pts.forEach((p) => bb.add(p, 8));
    return s;
  };
  const tarsus = (from: Pt, dir: Pt, n: number): Pt[] => {
    const out: Pt[] = [];
    let p = from;
    for (let i = 0; i < n; i++) {
      p = [p[0] + dir[0] + r.range(-2, 2), p[1] + dir[1] + r.range(-2, 2)];
      out.push(p);
    }
    return out;
  };
  const fk: Pt = [wb + r.range(30, 55), -pn * 0.75 - r.range(5, 30)];
  const ff: Pt = [wb + r.range(45, 75), -pn - r.range(55, 95)];
  const mk: Pt = [w + r.range(45, 70), L * 0.06];
  const mf: Pt = [w + r.range(75, 105), L * 0.26];
  const hk: Pt = [w + r.range(35, 55), L * 0.42];
  const hf: Pt = [w + r.range(55, 85), L * 0.72];
  const legs =
    leg([[wb * 0.55, -pn * 0.4], fk, ff, ...tarsus(ff, [6, -12], 3)], [11, 7, 4]) +
    leg([[w * 0.55, L * 0.1], mk, mf, ...tarsus(mf, [8, 10], 3)], [11, 7, 4]) +
    leg([[w * 0.5, L * 0.28], hk, hf, ...tarsus(hf, [5, 13], 3)], [12, 7, 4]);

  // antennae
  const aBase: Pt = [wt * 0.45, headFront + 10];
  const longhorn = r.chance(0.3);
  let ant = "";
  if (longhorn) {
    const c1: Pt = [w * 0.9, headFront - r.range(60, 110)];
    const c2: Pt = [w * 1.6, -pn * r.range(0.6, 1)];
    const end: Pt = [w * r.range(1.5, 1.8), L * r.range(0.2, 0.45)];
    ant = `<path d="M${P(aBase)} C${P(c1)} ${P(c2)} ${P(end)}" fill="none" stroke="${ctx.dark ? ctx.outline : pal.dark}" stroke-width="4" stroke-linecap="round"/>`;
    const ticks: string[] = [];
    for (let i = 1; i < 11; i++) {
      const p = cubic(aBase, c1, c2, end, i / 11);
      ticks.push(`<circle cx="${f(p[0])}" cy="${f(p[1])}" r="3.6"/>`);
      bb.add(p, 6);
    }
    ant += `<g fill="${pal.accent}">${ticks.join("")}</g>`;
    bb.add(end, 8);
  } else {
    const tip: Pt = [wt + r.range(35, 70), headFront - r.range(55, 100)];
    const c: Pt = [aBase[0] + r.range(20, 50), headFront - r.range(10, 40)];
    const beads: string[] = [];
    for (let i = 0; i <= 10; i++) {
      const p = quad(aBase, c, tip, i / 10);
      const rad = i >= 8 ? 7.5 : 3.8;
      beads.push(`<ellipse cx="${f(p[0])}" cy="${f(p[1])}" rx="${f(rad)}" ry="${f(rad * 0.85)}"/>`);
    }
    ant = `<g fill="${pal.dark}"${ctx.dark ? ` stroke="${ctx.outline}" stroke-width="1.4"` : ""}>${beads.join("")}</g>`;
    bb.add(tip, 12);
  }

  // head armament
  const arm = r.pick(["none", "none", "mandibles", "horn"] as const);
  let mand = "";
  let horn = "";
  if (arm === "mandibles") {
    const m0: Pt = [wt * 0.3, headFront + 8];
    const mt: Pt = [wt * r.range(0.32, 0.5), headFront - r.range(70, 105)];
    const mc1: Pt = [wt * 1.1, headFront - 5];
    const mc2: Pt = [wt * 1.15, mt[1] + 10];
    mand =
      `<path d="M${P(m0)} C${P(mc1)} ${P(mc2)} ${P(mt)}" fill="none" stroke="${ctx.dark ? ctx.outline : pal.dark}" stroke-width="13" stroke-linecap="round"/>` +
      `<path d="M${P(m0)} C${P(mc1)} ${P(mc2)} ${P(mt)}" fill="none" stroke="${pal.body}" stroke-width="8" stroke-linecap="round"/>` +
      `<path d="M${P(cubic(m0, mc1, mc2, mt, 0.55))} l-12 4" stroke="${pal.body}" stroke-width="6" stroke-linecap="round"/>`;
    bb.add(mt, 10);
    bb.add(cubic(m0, mc1, mc2, mt, 0.5), 10);
  } else if (arm === "horn") {
    const hl = r.range(90, 140);
    const top = headFront - hl;
    horn = `<path d="M-13 ${f(headFront + 12)} C-18 ${f(headFront - hl * 0.4)} -8 ${f(top + hl * 0.25)} 16 ${f(top)} C6 ${f(top + hl * 0.35)} 12 ${f(headFront - hl * 0.3)} 13 ${f(headFront + 12)} Z" fill="${pal.body}" stroke="${ctx.outline}" stroke-width="2"/>`;
    bb.add([16, top], 8);
  }

  // elytron (right)
  const elyD = `M2 2 C${f(w * 0.55)} -5 ${f(w * 0.95)} 0 ${f(w * 0.98)} ${f(L * 0.12)} C${f(w * 1.04)} ${f(L * 0.45)} ${f(w * 0.92)} ${f(L * 0.8)} ${f(w * 0.45)} ${f(L * 0.95)} C${f(w * 0.25)} ${f(L * 1.01)} 10 ${f(L)} 2 ${f(L)} Z`;
  bb.add([w * 1.04, L * 0.45], 4);
  bb.add([2, L], 6);
  const clip = ctx.id("elc");
  const grad = ctx.id("elg");
  const pgrad = ctx.id("prg");
  ctx.defs.push(
    `<clipPath id="${clip}"><path d="${elyD}"/></clipPath>`,
    `<linearGradient id="${grad}" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${f(w)}" y2="${f(L)}"><stop offset="0" stop-color="${pal.wing[0]}"/><stop offset="0.5" stop-color="${pal.wing[1]}"/><stop offset="1" stop-color="${pal.dark}"/></linearGradient>`,
    `<linearGradient id="${pgrad}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${pal.wing[1]}"/><stop offset="1" stop-color="${pal.dark}"/></linearGradient>`,
  );
  const pattern = r.pick(["spots", "stripes", "bands", "speckle", "spots", "stripes"] as const);
  const el: string[] = [`<path d="${elyD}" fill="url(#${grad})"/>`];
  if (pattern === "spots") {
    const n = r.int(2, 5);
    const col = r.chance(0.6) ? pal.dark : pal.accent;
    for (let i = 0; i < n; i++) {
      el.push(`<circle cx="${f(r.range(w * 0.25, w * 0.75))}" cy="${f(r.range(L * 0.12, L * 0.85))}" r="${f(r.range(12, 24))}" fill="${col}"/>`);
    }
  } else if (pattern === "stripes") {
    const k = r.int(4, 7);
    const lines: string[] = [];
    for (let j = 1; j <= k; j++) {
      const x = (j / (k + 1)) * w * 0.95;
      lines.push(`<path d="M${f(x)} ${f(L * 0.02)} C${f(x * 1.05)} ${f(L * 0.4)} ${f(x * 0.95)} ${f(L * 0.75)} ${f(x * 0.45)} ${f(L * 0.98)}"/>`);
    }
    el.push(`<g fill="none" stroke="${pal.dark}" stroke-width="3" opacity="0.5" stroke-dasharray="${r.chance(0.5) ? "2 7" : "none"}" stroke-linecap="round">${lines.join("")}</g>`);
    if (r.chance(0.5)) el.push(`<path d="M${f(w * 0.5)} 0 L${f(w * 0.5)} ${f(L)}" stroke="${pal.accent}" stroke-width="${f(r.range(10, 20))}" opacity="0.8"/>`);
  } else if (pattern === "bands") {
    for (const y of [L * r.range(0.25, 0.35), L * r.range(0.6, 0.72)]) {
      const pts: Pt[] = [];
      for (let i = 0; i <= 8; i++) pts.push([(i / 8) * w * 1.1, y + (i % 2 ? 14 : -14)]);
      el.push(`<path d="M${pts.map(P).join(" L")}" fill="none" stroke="${pal.accent}" stroke-width="${f(r.range(16, 26))}" stroke-linejoin="round"/>`);
    }
  } else {
    const dots: string[] = [];
    for (let i = 0; i < 90; i++) dots.push(`<circle cx="${f(r.range(0, w))}" cy="${f(r.range(0, L))}" r="${f(r.range(1.5, 4.5))}"/>`);
    el.push(`<g fill="${pal.accent}" opacity="0.7">${dots.join("")}</g>`);
  }
  el.push(
    `<ellipse cx="${f(w * 0.42)}" cy="${f(L * 0.28)}" rx="${f(w * 0.16)}" ry="${f(L * 0.2)}" fill="#fff" opacity="0.18"/>`,
    `<ellipse cx="${f(w * 0.38)}" cy="${f(L * 0.2)}" rx="${f(w * 0.06)}" ry="${f(L * 0.08)}" fill="#fff" opacity="0.35"/>`,
    `<path d="${elyD}" fill="none" stroke="${pal.dark}" stroke-width="10" opacity="0.35"/>`,
  );
  const elytron = `<g clip-path="url(#${clip})">${el.join("")}</g><path d="${elyD}" fill="none" stroke="${ctx.outline}" stroke-width="2.2"/>`;

  const pronD = `M${f(-wb)} 0 C${f(-wb - 8)} ${f(-pn * 0.45)} ${f(-wt - 14)} ${f(-pn)} ${f(-wt)} ${f(-pn)} L${f(wt)} ${f(-pn)} C${f(wt + 14)} ${f(-pn)} ${f(wb + 8)} ${f(-pn * 0.45)} ${f(wb)} 0 Q0 8 ${f(-wb)} 0 Z`;
  let pron = `<path d="${pronD}" fill="url(#${pgrad})" stroke="${ctx.outline}" stroke-width="2.2"/>`;
  if (r.chance(0.5)) {
    pron += `<circle cx="${f(wb * 0.4)}" cy="${f(-pn * 0.5)}" r="${f(r.range(8, 14))}" fill="${pal.accent}"/><circle cx="${f(-wb * 0.4)}" cy="${f(-pn * 0.5)}" r="${f(r.range(8, 14))}" fill="${pal.accent}"/>`;
  } else {
    pron += `<path d="M0 ${f(-pn + 8)} L0 -6" stroke="${pal.accent}" stroke-width="5" opacity="0.8"/>`;
  }
  pron += `<ellipse cx="${f(-wb * 0.3)}" cy="${f(-pn * 0.62)}" rx="${f(wb * 0.2)}" ry="${f(pn * 0.14)}" fill="#fff" opacity="0.22"/>`;
  bb.add([wb + 8, -pn], 4);

  const head =
    `<ellipse cx="0" cy="${f(headCy)}" rx="${f(wt * 0.72)}" ry="${f(hh)}" fill="${pal.body}" stroke="${ctx.outline}" stroke-width="2.2"/>` +
    `<ellipse cx="${f(wt * 0.6)}" cy="${f(headCy - 2)}" rx="7" ry="10" fill="${pal.dark}"/><ellipse cx="${f(-wt * 0.6)}" cy="${f(headCy - 2)}" rx="7" ry="10" fill="${pal.dark}"/>`;
  bb.add([wt * 0.72, headFront], 4);

  const sideId = ctx.id("bside");
  const topId = ctx.id("btop");
  const body =
    `<g id="${sideId}">${legs}${ant}</g><use href="#${sideId}" transform="scale(-1 1)"/>` +
    `<g id="${topId}">${elytron}${mand}</g><use href="#${topId}" transform="scale(-1 1)"/>` +
    `<path d="M0 0 L0 ${f(L)}" stroke="${pal.dark}" stroke-width="3"/>` +
    pron +
    head +
    horn +
    pinHead(r, [w * 0.35, L * 0.14]);

  return {
    body,
    bbox: bb,
    anchors: [[-w * 0.55, L * 0.58], [wb * 0.55, -pn * 0.5], [-mf[0], mf[1]]],
  };
}

function pinHead(r: Rng, at: Pt): string {
  const col = r.pick(["#b3262e", "#1b1b1b", "#d9b44a"]);
  return (
    `<circle cx="${f(at[0] + 1.5)}" cy="${f(at[1] + 2)}" r="8" fill="#000" opacity="0.25"/>` +
    `<circle cx="${f(at[0])}" cy="${f(at[1])}" r="7.5" fill="${col}"/>` +
    `<circle cx="${f(at[0] - 2.4)}" cy="${f(at[1] - 2.4)}" r="2.4" fill="#fff" opacity="0.75"/>`
  );
}

// ---------------------------------------------------------------- typography helpers

const SERIF_EM = 0.47;
const SERIF_ITALIC_EM = 0.43;
const MONO_EM = 0.6;

function fitSize(text: string, maxW: number, base: number, em: number, spacing = 0): number {
  const w = text.length * (base * em + spacing);
  return w <= maxW ? base : Math.max(base * 0.45, (maxW / text.length - spacing) / em);
}

function wrap(text: string, maxW: number, size: number, em: number, maxLines: number): string[] | null {
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length * size * em <= maxW) cur = next;
    else {
      if (cur) lines.push(cur);
      cur = w;
      if (w.length * size * em > maxW) return null;
    }
  }
  if (cur) lines.push(cur);
  return lines.length <= maxLines ? lines : null;
}

function wrapFit(text: string, maxW: number, base: number, em: number, maxLines: number) {
  for (let s = base; s >= base * 0.6; s -= 1) {
    const lines = wrap(text, maxW, s, em, maxLines);
    if (lines) return { lines, size: s };
  }
  return { lines: [text], size: fitSize(text, maxW, base, em) };
}

const CAPTIONS = [
  "Not to scale (subject is considerably larger).",
  "Observed shortly before snack time.",
  "Handle with affection.",
  "Specimen pinned for science and for style.",
  "Rarely photographed. Frequently discussed.",
];

// ---------------------------------------------------------------- plate

export type PlateOptions = { uid?: string };

export function plateParts(design: Design, opts: PlateOptions = {}) {
  const uid = (opts.uid ?? `s${hashStr(JSON.stringify(design)).toString(36)}`).replace(/[^a-zA-Z0-9_-]/g, "");
  const shirt = colorById(design.color);
  const darkShirt = !!shirt?.dark;
  const ink = darkShirt ? "#f1e8d5" : "#241a13";
  const paper = shirt?.hex ?? "#f7f6f2";
  let n = 0;
  const ctx: Ctx = {
    id: (k) => `${uid}-${k}${n++}`,
    defs: [],
    outline: darkShirt ? "#f1e8d5" : "#241a13",
    dark: darkShirt,
  };
  const r = new Rng(hashStr(`${design.seed}:${design.kind}`));
  const pal = paletteFor(design.palette, design.seed);
  const creature = design.kind === "beetle" ? beetle(r, pal, ctx) : lepidoptera(r, pal, design.kind === "moth", ctx);

  // fit the creature into its box
  const box = { x: 70, y: 96, w: 860, h: 520 };
  const bw = creature.bbox.x1 - creature.bbox.x0;
  const bh = creature.bbox.y1 - creature.bbox.y0;
  const s = Math.min(box.w / bw, box.h / bh, 1.45);
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const tx = cx - ((creature.bbox.x0 + creature.bbox.x1) / 2) * s;
  const ty = cy - ((creature.bbox.y0 + creature.bbox.y1) / 2) * s;
  const toPlate = (p: Pt): Pt => [tx + p[0] * s, ty + p[1] * s];

  const out: string[] = [];
  out.push(`<g transform="translate(${f(tx)} ${f(ty)}) scale(${s.toFixed(4)})">${creature.body}</g>`);

  // numbered callouts
  creature.anchors.forEach((a, i) => {
    const p = toPlate(a);
    let dx = p[0] - cx;
    let dy = p[1] - cy;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;
    const e: Pt = [Math.max(36, Math.min(964, p[0] + dx * 64)), Math.max(96, Math.min(640, p[1] + dy * 64))];
    out.push(
      `<path d="M${P(p)} L${P(e)}" stroke="${ink}" stroke-width="1.6"/>`,
      `<circle cx="${f(p[0])}" cy="${f(p[1])}" r="4" fill="${ink}" stroke="${paper}" stroke-width="1.5"/>`,
      `<circle cx="${f(e[0])}" cy="${f(e[1])}" r="16" fill="${paper}" stroke="${ink}" stroke-width="1.8"/>`,
      `<text x="${f(e[0])}" y="${f(e[1] + 6)}" font-family="${MONO}" font-size="17" font-weight="500" fill="${ink}" text-anchor="middle">${i + 1}</text>`,
    );
  });

  const kind = kindById(design.kind)!;
  const trait = traitById(design.trait)!;
  const status = statusById(design.status)!;
  const epithet = epithetFor(design.genus, design.trait);
  const latin = `${design.genus} ${epithet}`;
  const family = familyFor(design.genus);
  const plateNo = String((design.seed % 900) + 100);
  const code = hashStr(JSON.stringify(design)).toString(36).toUpperCase().padStart(7, "0").slice(0, 7);
  const caption = CAPTIONS[design.seed % CAPTIONS.length];
  const T = (x: number, y: number, size: number, text: string, extra = "") =>
    `<text x="${f(x)}" y="${f(y)}" font-size="${f(size)}" fill="${ink}" ${extra}>${escapeXml(text)}</text>`;
  const mono = (x: number, y: number, size: number, text: string, extra = "") =>
    T(x, y, size, text, `font-family="${MONO}" letter-spacing="${f(size * 0.18)}" ${extra}`);
  const rule = (y: number) =>
    `<path d="M40 ${y} L960 ${y}" stroke="${ink}" stroke-width="1.8"/><path d="M40 ${y + 5} L960 ${y + 5}" stroke="${ink}" stroke-width="0.8"/>`;

  // header
  out.push(
    mono(40, 54, 15, "A FIELD GUIDE TO RARE SPECIES"),
    mono(960, 54, 15, `PLATE No. ${plateNo}`, `text-anchor="end"`),
    rule(68),
  );

  // caption + names
  out.push(T(500, 668, 20, `Fig. 1 — ${kind.label}, dorsal view. ${caption}`, `font-family="${SERIF}" font-style="italic" text-anchor="middle"`));
  out.push(T(500, 748, fitSize(latin, 900, 86, SERIF_ITALIC_EM), latin, `font-family="${SERIF}" font-style="italic" text-anchor="middle"`));
  const common = `The ${trait.adj} ${design.name}`;
  out.push(T(500, 794, fitSize(common, 880, 32, SERIF_EM), common, `font-family="${SERIF}" text-anchor="middle"`));
  const cls = `ORDER ${kind.order.toUpperCase()} · FAMILY ${family.toUpperCase()} · ${design.name.toUpperCase()}, ${design.year}`;
  out.push(mono(500, 830, fitSize(cls, 900, 14, MONO_EM, 14 * 0.18), cls, `text-anchor="middle"`));
  out.push(rule(852));

  // left column: field notes
  const rows: [string, string][] = [
    ["HABITAT", design.habitat || "Unknown, possibly the couch"],
    ["DIET", design.diet || "Whatever is in the fridge"],
    ["CALL", `“${design.call || "…"}”`],
  ];
  rows.forEach(([label, value], i) => {
    const y = 896 + i * 76;
    out.push(mono(40, y, 13, label, `opacity="0.8"`));
    out.push(T(40, y + 34, fitSize(value, 420, 28, SERIF_EM), value, `font-family="${SERIF}"`));
  });
  out.push(`<path d="M500 880 L500 1100" stroke="${ink}" stroke-width="0.8"/>`);

  // right column: distinguishing marks
  out.push(mono(530, 896, 13, "DISTINGUISHING MARKS", `opacity="0.8"`));
  let my = 934;
  design.marks.forEach((m, i) => {
    const text = m || ["Unmistakable at a distance", "Impossible to replicate", "Best observed in person"][i];
    const { lines, size } = wrapFit(text, 390, 24, SERIF_EM, 2);
    out.push(
      `<circle cx="${f(544)}" cy="${f(my - 8)}" r="13" fill="none" stroke="${ink}" stroke-width="1.5"/>`,
      `<text x="544" y="${f(my - 2.5)}" font-family="${MONO}" font-size="14" font-weight="500" fill="${ink}" text-anchor="middle">${i + 1}</text>`,
    );
    lines.forEach((ln, j) => out.push(T(568, my + j * (size + 3), size, ln, `font-family="${SERIF}"`)));
    my += lines.length * (size + 3) + 22;
  });

  // footer: conservation status + specimen id
  out.push(rule(1124));
  out.push(mono(40, 1162, 13, "CONSERVATION STATUS", `opacity="0.8"`));
  STATUSES.forEach((st, i) => {
    const x = 58 + i * 44;
    const sel = st.id === status.id;
    out.push(
      `<circle cx="${x}" cy="1192" r="17" fill="${sel ? ink : "none"}" stroke="${ink}" stroke-width="1.5"/>`,
      `<text x="${x}" y="1197.5" font-family="${MONO}" font-size="13" font-weight="500" fill="${sel ? paper : ink}" text-anchor="middle">${st.id}</text>`,
    );
  });
  out.push(T(318, 1200, fitSize(status.label, 380, 24, SERIF_ITALIC_EM), status.label, `font-family="${SERIF}" font-style="italic"`));
  out.push(
    mono(960, 1162, 13, "SPECIMEN 1 OF 1", `text-anchor="end" opacity="0.8"`),
    mono(960, 1184, 13, `No. ${code}`, `text-anchor="end"`),
    `<path d="M860 1204 L960 1204 M860 1198 L860 1210 M910 1200 L910 1208 M960 1198 L960 1210" stroke="${ink}" stroke-width="1.5"/>`,
  );

  return { defs: ctx.defs.join(""), content: out.join(""), ink, paper, uid };
}

export function plateSvg(design: Design, opts: PlateOptions & { background?: string } = {}): string {
  const { defs, content } = plateParts(design, opts);
  const bg = opts.background ? `<rect width="${PLATE_W}" height="${PLATE_H}" fill="${opts.background}"/>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${PLATE_W} ${PLATE_H}" width="${PLATE_W}" height="${PLATE_H}"><defs>${defs}</defs>${bg}${content}</svg>`;
}
