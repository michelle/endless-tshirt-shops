/**
 * Bloomprint botanical generator.
 *
 * Grows a one-of-one "herbarium plate" from a person's name, a date and a
 * climate. Everything is deterministic: the same inputs always grow the same
 * plant, so the browser preview and the print-resolution render are identical.
 *
 * Output is an SVG string with a transparent background sized to the DTG print
 * area of the tee (aspect 4680 x 5790).
 */
import { Rng, hashString } from "./random";
import { CLIMATES, Climate, Palette, mix } from "./palette";

export const VIEW_W = 1000;
export const VIEW_H = 1237;

export interface PlantInput {
  name: string;
  /** ISO date YYYY-MM-DD or empty */
  date: string;
  climate: Climate;
  /** free text, optional, printed under the label */
  dedication: string;
  /** re-roll counter so a customer can "grow another" */
  variant: number;
  /** true when printing on a dark garment: pale ink, lifted colours */
  dark: boolean;
}

export interface PlantLabel {
  genus: string;
  species: string;
  variety: string | null;
  specimenNo: string;
  collected: string;
  habitat: string;
}

type Vec = { x: number; y: number };
type FlowerKind = "daisy" | "fivepetal" | "bell" | "spike" | "umbel";
type LeafKind = "lanceolate" | "ovate" | "serrate" | "lobed" | "linear";

const FLOWERS_BY_CLIMATE: Record<Climate, FlowerKind[]> = {
  meadow: ["daisy", "fivepetal", "bell", "umbel", "spike"],
  alpine: ["bell", "umbel", "fivepetal", "daisy"],
  desert: ["daisy", "fivepetal", "spike"],
  tropical: ["fivepetal", "daisy", "spike"],
  nocturne: ["bell", "daisy", "umbel", "fivepetal"],
};

const LEAVES_BY_CLIMATE: Record<Climate, LeafKind[]> = {
  meadow: ["lanceolate", "ovate", "serrate", "lobed"],
  alpine: ["lanceolate", "linear", "serrate"],
  desert: ["linear", "lanceolate", "lobed"],
  tropical: ["ovate", "lobed", "lanceolate"],
  nocturne: ["lanceolate", "ovate", "serrate"],
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// ---------- helpers ----------

const f = (n: number) => (Math.round(n * 100) / 100).toString();

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function add(a: Vec, b: Vec): Vec {
  return { x: a.x + b.x, y: a.y + b.y };
}
function scale(a: Vec, s: number): Vec {
  return { x: a.x * s, y: a.y * s };
}
function rot(v: Vec, rad: number): Vec {
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return { x: v.x * c - v.y * s, y: v.x * s + v.y * c };
}
function norm(v: Vec): Vec {
  const l = Math.hypot(v.x, v.y) || 1;
  return { x: v.x / l, y: v.y / l };
}
function angleOf(v: Vec): number {
  return Math.atan2(v.y, v.x);
}
const deg = (d: number) => (d * Math.PI) / 180;

/** Quadratic bezier sample */
function quad(p0: Vec, c: Vec, p1: Vec, t: number): Vec {
  const u = 1 - t;
  return {
    x: u * u * p0.x + 2 * u * t * c.x + t * t * p1.x,
    y: u * u * p0.y + 2 * u * t * c.y + t * t * p1.y,
  };
}

/** Catmull-Rom spline through points -> smooth cubic path (open). */
function smoothPath(pts: Vec[], closed = false): string {
  if (pts.length < 2) return "";
  const p = closed ? [pts[pts.length - 1], ...pts, pts[0], pts[1]] : [pts[0], ...pts, pts[pts.length - 1]];
  let d = `M${f(p[1].x)} ${f(p[1].y)}`;
  for (let i = 1; i < p.length - 2; i++) {
    const p0 = p[i - 1], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2];
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += ` C${f(c1.x)} ${f(c1.y)} ${f(c2.x)} ${f(c2.y)} ${f(p2.x)} ${f(p2.y)}`;
  }
  return closed ? d + " Z" : d;
}

/** A tapered ribbon along a polyline, widths from w0 (start) to w1 (end). */
function taperedRibbon(pts: Vec[], w0: number, w1: number): string {
  const left: Vec[] = [];
  const right: Vec[] = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const prev = pts[Math.max(0, i - 1)];
    const next = pts[Math.min(n - 1, i + 1)];
    const tangent = norm({ x: next.x - prev.x, y: next.y - prev.y });
    const normal = { x: -tangent.y, y: tangent.x };
    const t = i / (n - 1);
    const w = (w0 + (w1 - w0) * t) / 2;
    left.push(add(pts[i], scale(normal, w)));
    right.push(add(pts[i], scale(normal, -w)));
  }
  return smoothPath([...left, ...right.reverse()], true);
}

// ---------- label / naming ----------

export function latinizeName(raw: string): string {
  const cleaned = raw
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z' -]/g, "")
    .trim();
  const first = (cleaned.split(/[\s-]+/)[0] || "Flora").replace(/'/g, "");
  const base = first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
  if (base.length <= 2) return base + "ia";
  const last = base[base.length - 1];
  if (last === "a") return base;
  if ("eiouy".includes(last)) return base.slice(0, -1) + "ia";
  if (base.endsWith("s")) return base.slice(0, -1) + "sia";
  return base + "ia";
}

function toRoman(n: number): string {
  const map: [number, string][] = [
    [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"],
    [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
  ];
  let out = "";
  for (const [v, s] of map) while (n >= v) { out += s; n -= v; }
  return out;
}

export function parseIsoDate(date: string): { y: number; m: number; d: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date || "");
  if (!m) return null;
  const y = +m[1], mo = +m[2], d = +m[3];
  if (y < 1000 || y > 2999 || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return { y, m: mo, d };
}

export function plantSeed(input: PlantInput): number {
  const key = [
    input.name.trim().toLowerCase().replace(/\s+/g, " "),
    input.date || "",
    input.climate,
    String(input.variant || 1),
  ].join("|");
  return hashString(key);
}

export function makeLabel(input: PlantInput): PlantLabel {
  const seed = plantSeed(input);
  const rng = new Rng(seed ^ 0x5bd1e995);
  const climate = CLIMATES[input.climate];
  const dt = parseIsoDate(input.date);
  const genus = latinizeName(input.name);
  const species = rng.pick(climate.epithets);
  const specimenNo = String(1000 + (seed % 9000));
  return {
    genus,
    species,
    variety: dt ? `var. ${toRoman(dt.y)}` : null,
    specimenNo,
    collected: dt ? `Collected ${dt.d} ${MONTHS[dt.m - 1]} ${dt.y}` : "Collected in the wild",
    habitat: climate.habitat,
  };
}

// ---------- drawing primitives ----------

interface Ctx {
  rng: Rng;
  pal: Palette;
  ink: string;
  inkSoft: string;
  leafKind: LeafKind;
  flowerKind: FlowerKind;
  leafFills: string[];
  petalFill: string;
  petalFill2: string;
  centerFill: string;
  out: string[];
  late: string[]; // flowers drawn on top of foliage
}

function leafPath(kind: LeafKind, L: number, W: number, rng: Rng): string {
  switch (kind) {
    case "lanceolate":
      return `M0 0 C${f(L * 0.25)} ${f(-W)} ${f(L * 0.7)} ${f(-W * 0.9)} ${f(L)} 0 C${f(L * 0.7)} ${f(W * 0.9)} ${f(L * 0.25)} ${f(W)} 0 0 Z`;
    case "ovate":
      return `M0 0 C${f(L * 0.08)} ${f(-W * 1.15)} ${f(L * 0.62)} ${f(-W * 1.05)} ${f(L)} 0 C${f(L * 0.62)} ${f(W * 1.05)} ${f(L * 0.08)} ${f(W * 1.15)} 0 0 Z`;
    case "linear":
      return `M0 0 C${f(L * 0.3)} ${f(-W * 0.9)} ${f(L * 0.85)} ${f(-W * 0.6)} ${f(L)} ${f(-W * 0.15)} C${f(L * 0.85)} ${f(W * 0.5)} ${f(L * 0.3)} ${f(W * 0.9)} 0 0 Z`;
    case "serrate": {
      const N = 22;
      const top: Vec[] = [];
      const bottom: Vec[] = [];
      for (let i = 0; i <= N; i++) {
        const t = i / N;
        const base = W * Math.pow(Math.sin(Math.PI * t), 0.75);
        const tooth = i % 2 === 0 || i === 0 || i === N ? 1 : 0.8;
        top.push({ x: L * t, y: -base * tooth });
        bottom.push({ x: L * t, y: base * (i % 2 === 1 ? 1 : 0.8) });
      }
      const pts = [...top, ...bottom.reverse().slice(1, -1)];
      let d = `M${f(pts[0].x)} ${f(pts[0].y)}`;
      for (let i = 1; i < pts.length; i++) d += ` L${f(pts[i].x)} ${f(pts[i].y)}`;
      return d + " Z";
    }
    case "lobed": {
      const lobes = rng.int(2, 3);
      const N = 40;
      const top: Vec[] = [];
      const bottom: Vec[] = [];
      for (let i = 0; i <= N; i++) {
        const t = i / N;
        const env = Math.pow(Math.sin(Math.PI * t), 0.65);
        const mod = 0.62 + 0.38 * Math.abs(Math.sin(lobes * Math.PI * t + Math.PI / 2));
        top.push({ x: L * t, y: -W * env * mod });
        bottom.push({ x: L * t, y: W * env * mod });
      }
      return smoothPath([...top, ...bottom.reverse().slice(1, -1)], true);
    }
  }
}

function drawLeaf(ctx: Ctx, at: Vec, angle: number, L: number, flip: boolean) {
  const { rng } = ctx;
  const ratio = { lanceolate: 0.26, ovate: 0.4, linear: 0.1, serrate: 0.3, lobed: 0.36 }[ctx.leafKind];
  const W = L * ratio * rng.range(0.85, 1.15);
  const fill = rng.pick(ctx.leafFills);
  const d = leafPath(ctx.leafKind, L, W, rng);
  const veins: string[] = [];
  const midEnd = ctx.leafKind === "linear" ? 0.95 : 0.88;
  veins.push(`<path d="M${f(L * 0.04)} 0 L${f(L * midEnd)} 0" stroke="${ctx.inkSoft}" stroke-width="0.9" fill="none" stroke-linecap="round"/>`);
  if (ctx.leafKind !== "linear" && L > 45) {
    const n = rng.int(3, 5);
    for (let i = 1; i <= n; i++) {
      const t = i / (n + 1);
      const x = L * t;
      const reach = W * Math.pow(Math.sin(Math.PI * t), 0.75) * 0.72;
      veins.push(`<path d="M${f(x)} 0 Q${f(x + L * 0.06)} ${f(-reach * 0.5)} ${f(x + L * 0.11)} ${f(-reach)}" stroke="${ctx.inkSoft}" stroke-width="0.6" fill="none"/>`);
      veins.push(`<path d="M${f(x)} 0 Q${f(x + L * 0.06)} ${f(reach * 0.5)} ${f(x + L * 0.11)} ${f(reach)}" stroke="${ctx.inkSoft}" stroke-width="0.6" fill="none"/>`);
    }
  }
  const sy = flip ? -1 : 1;
  ctx.out.push(
    `<g transform="translate(${f(at.x)} ${f(at.y)}) rotate(${f((angle * 180) / Math.PI)}) scale(1 ${sy})">` +
      `<path d="${d}" fill="${fill}" stroke="${ctx.ink}" stroke-width="1.1" stroke-linejoin="round"/>` +
      veins.join("") +
      `</g>`,
  );
}

function petalPath(r: number, w: number): string {
  return `M0 0 C${f(r * 0.3)} ${f(-w)} ${f(r * 0.8)} ${f(-w)} ${f(r)} 0 C${f(r * 0.8)} ${f(w)} ${f(r * 0.3)} ${f(w)} 0 0 Z`;
}

function drawFlower(ctx: Ctx, kind: FlowerKind, at: Vec, dir: Vec, r: number, target: string[] = ctx.late) {
  const { rng } = ctx;
  const g: string[] = [];
  const a = angleOf(dir);
  switch (kind) {
    case "daisy": {
      const n = rng.int(12, 18);
      const w = r * 0.14;
      const off = rng.range(0, Math.PI);
      for (let i = 0; i < n; i++) {
        const ang = off + (i * 2 * Math.PI) / n;
        const fill = i % 2 === 0 ? ctx.petalFill : ctx.petalFill2;
        g.push(`<path d="${petalPath(r, w)}" transform="rotate(${f((ang * 180) / Math.PI)})" fill="${fill}" stroke="${ctx.ink}" stroke-width="0.9" stroke-linejoin="round"/>`);
      }
      g.push(`<circle r="${f(r * 0.33)}" fill="${ctx.centerFill}" stroke="${ctx.ink}" stroke-width="1"/>`);
      for (let i = 0; i < 9; i++) {
        const rr = r * 0.2 * Math.sqrt(rng.next());
        const ang = rng.range(0, Math.PI * 2);
        g.push(`<circle cx="${f(Math.cos(ang) * rr)}" cy="${f(Math.sin(ang) * rr)}" r="${f(r * 0.03)}" fill="${ctx.ink}" opacity="0.7"/>`);
      }
      break;
    }
    case "fivepetal": {
      const n = rng.int(5, 6);
      const off = rng.range(0, Math.PI);
      const petal = (rr: number) => `M0 0 C${f(rr * 0.15)} ${f(-rr * 0.55)} ${f(rr * 0.9)} ${f(-rr * 0.6)} ${f(rr)} 0 C${f(rr * 0.9)} ${f(rr * 0.6)} ${f(rr * 0.15)} ${f(rr * 0.55)} 0 0 Z`;
      for (let i = 0; i < n; i++) {
        const ang = off + (i * 2 * Math.PI) / n;
        g.push(`<path d="${petal(r)}" transform="rotate(${f((ang * 180) / Math.PI)})" fill="${ctx.petalFill}" stroke="${ctx.ink}" stroke-width="1" stroke-linejoin="round"/>`);
      }
      for (let i = 0; i < n; i++) {
        const ang = off + Math.PI / n + (i * 2 * Math.PI) / n;
        g.push(`<path d="${petal(r * 0.62)}" transform="rotate(${f((ang * 180) / Math.PI)})" fill="${ctx.petalFill2}" stroke="${ctx.ink}" stroke-width="0.9" stroke-linejoin="round"/>`);
      }
      g.push(`<circle r="${f(r * 0.17)}" fill="${ctx.centerFill}" stroke="${ctx.ink}" stroke-width="0.9"/>`);
      break;
    }
    case "bell": {
      // a drooping pedicel from the tip, then the bell hanging straight down (+y)
      const h = r * 1.55;
      const w = r * 0.4;
      const d =
        `M0 ${f(-w * 0.75)} C${f(h * 0.4)} ${f(-w * 0.9)} ${f(h * 0.78)} ${f(-w * 1.35)} ${f(h)} ${f(-w * 1.3)} ` +
        `L${f(h * 0.9)} ${f(-w * 0.6)} L${f(h * 1.07)} 0 L${f(h * 0.9)} ${f(w * 0.6)} L${f(h)} ${f(w * 1.3)} ` +
        `C${f(h * 0.78)} ${f(w * 1.35)} ${f(h * 0.4)} ${f(w * 0.9)} 0 ${f(w * 0.75)} Z`;
      const ped = { x: dir.x * r * 0.6 + rng.range(-0.3, 0.3) * r, y: -Math.abs(dir.y) * r * 0.25 + r * 0.35 };
      g.push(`<path d="M0 0 Q${f(ped.x * 0.6)} ${f(ped.y * 0.1)} ${f(ped.x)} ${f(ped.y)}" stroke="${ctx.pal.stem}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`);
      const ang = Math.PI / 2 + rng.range(-0.3, 0.3);
      g.push(`<g transform="translate(${f(ped.x)} ${f(ped.y)}) rotate(${f((ang * 180) / Math.PI)})">` +
        `<path d="${d}" fill="${ctx.petalFill}" stroke="${ctx.ink}" stroke-width="1" stroke-linejoin="round"/>` +
        `<path d="M${f(h * 0.15)} 0 L${f(h * 0.88)} 0" stroke="${ctx.ink}" stroke-width="0.6" opacity="0.5"/>` +
        `<path d="M${f(h * 0.15)} ${f(-w * 0.45)} L${f(h * 0.88)} ${f(-w * 0.62)}" stroke="${ctx.ink}" stroke-width="0.6" opacity="0.5"/>` +
        `<path d="M${f(h * 0.15)} ${f(w * 0.45)} L${f(h * 0.88)} ${f(w * 0.62)}" stroke="${ctx.ink}" stroke-width="0.6" opacity="0.5"/>` +
        `<circle r="${f(w * 0.6)}" fill="${ctx.leafFills[0]}" stroke="${ctx.ink}" stroke-width="0.9"/>` +
        `</g>`);
      break;
    }
    case "spike": {
      // little florets continuing along the branch direction past the tip
      const len = r * 2.6;
      const n = rng.int(9, 14);
      g.push(`<g transform="rotate(${f((a * 180) / Math.PI)})">` +
        `<path d="M0 0 L${f(len)} 0" stroke="${ctx.pal.stem}" stroke-width="2" stroke-linecap="round"/>`);
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1);
        const x = len * t;
        const side = i % 2 === 0 ? -1 : 1;
        const s = 1 - t * 0.55;
        const fill = i % 3 === 0 ? ctx.petalFill2 : ctx.petalFill;
        g.push(`<ellipse cx="${f(x)}" cy="${f(side * r * 0.22 * s)}" rx="${f(r * 0.28 * s)}" ry="${f(r * 0.17 * s)}" transform="rotate(${f(side * -35)} ${f(x)} ${f(side * r * 0.22 * s)})" fill="${fill}" stroke="${ctx.ink}" stroke-width="0.8"/>`);
      }
      g.push(`</g>`);
      break;
    }
    case "umbel": {
      const spokes = rng.int(5, 7);
      const spread = deg(95);
      g.push(`<g transform="rotate(${f((a * 180) / Math.PI)})">`);
      for (let i = 0; i < spokes; i++) {
        const ang = -spread / 2 + (spread * i) / (spokes - 1) + rng.range(-0.08, 0.08);
        const L = r * rng.range(0.9, 1.25);
        const end = { x: Math.cos(ang) * L, y: Math.sin(ang) * L };
        g.push(`<path d="M0 0 L${f(end.x)} ${f(end.y)}" stroke="${ctx.pal.stem}" stroke-width="1.3" stroke-linecap="round"/>`);
        const dots = 5;
        for (let k = 0; k < dots; k++) {
          const da = (k * 2 * Math.PI) / dots;
          const dr = r * 0.16;
          g.push(`<circle cx="${f(end.x + Math.cos(da) * dr)}" cy="${f(end.y + Math.sin(da) * dr)}" r="${f(r * 0.12)}" fill="${k % 2 ? ctx.petalFill2 : ctx.petalFill}" stroke="${ctx.ink}" stroke-width="0.7"/>`);
        }
        g.push(`<circle cx="${f(end.x)}" cy="${f(end.y)}" r="${f(r * 0.07)}" fill="${ctx.centerFill}"/>`);
      }
      g.push(`</g>`);
      break;
    }
  }
  target.push(`<g transform="translate(${f(at.x)} ${f(at.y)})">${g.join("")}</g>`);
}

function drawBud(ctx: Ctx, at: Vec, dir: Vec, size: number) {
  const a = (angleOf(dir) * 180) / Math.PI;
  const L = size, W = size * 0.4;
  ctx.late.push(
    `<g transform="translate(${f(at.x)} ${f(at.y)}) rotate(${f(a)})">` +
      `<path d="M0 0 C${f(L * 0.2)} ${f(-W)} ${f(L * 0.8)} ${f(-W * 0.7)} ${f(L)} 0 C${f(L * 0.8)} ${f(W * 0.7)} ${f(L * 0.2)} ${f(W)} 0 0 Z" fill="${ctx.petalFill2}" stroke="${ctx.ink}" stroke-width="0.9"/>` +
      `<path d="M0 0 C${f(L * 0.15)} ${f(-W * 0.9)} ${f(L * 0.45)} ${f(-W * 0.6)} ${f(L * 0.5)} ${f(-W * 0.15)} L${f(L * 0.5)} ${f(W * 0.15)} C${f(L * 0.45)} ${f(W * 0.6)} ${f(L * 0.15)} ${f(W * 0.9)} 0 0 Z" fill="${ctx.leafFills[0]}" stroke="${ctx.ink}" stroke-width="0.8"/>` +
      `</g>`,
  );
}

function drawBerries(ctx: Ctx, at: Vec, dir: Vec, r: number) {
  const { rng } = ctx;
  const n = rng.int(3, 6);
  const g: string[] = [];
  const down = norm(add(scale(dir, 0.4), { x: 0, y: 1 }));
  for (let i = 0; i < n; i++) {
    const spreadAng = rng.range(-0.9, 0.9);
    const dist = r * rng.range(0.9, 2.2);
    const p = scale(rot(down, spreadAng), dist);
    g.push(`<path d="M0 0 L${f(p.x)} ${f(p.y)}" stroke="${ctx.pal.stem}" stroke-width="1.2" fill="none"/>`);
    g.push(`<circle cx="${f(p.x)}" cy="${f(p.y)}" r="${f(r * 0.55)}" fill="${ctx.pal.accent}" stroke="${ctx.ink}" stroke-width="0.9"/>`);
    g.push(`<circle cx="${f(p.x - r * 0.18)}" cy="${f(p.y - r * 0.18)}" r="${f(r * 0.12)}" fill="#ffffff" opacity="0.7"/>`);
  }
  ctx.late.push(`<g transform="translate(${f(at.x)} ${f(at.y)})">${g.join("")}</g>`);
}

// ---------- plant growth ----------

interface Branch {
  pts: Vec[];
  L: number;
  tip: Vec;
  tipDir: Vec;
}

function growBranch(ctx: Ctx, base: Vec, baseDir: Vec, L: number, side: number): Branch {
  const { rng } = ctx;
  const up = { x: 0, y: -1 };
  const outAngle = deg(rng.range(38, 68)) * side;
  const dir = rot(up, outAngle);
  // gentle pull toward the stem direction for a natural upward curve
  const end = add(base, add(scale(dir, L), scale(up, L * rng.range(0.15, 0.35))));
  const ctrl = add(base, add(scale(dir, L * 0.55), scale(baseDir, L * 0.05)));
  const pts: Vec[] = [];
  const n = 14;
  for (let i = 0; i <= n; i++) pts.push(quad(base, ctrl, end, i / n));
  const tipDir = norm({ x: pts[n].x - pts[n - 1].x, y: pts[n].y - pts[n - 1].y });
  ctx.out.push(`<path d="${taperedRibbon(pts, 5.5, 1.6)}" fill="${ctx.pal.stem}" stroke="${ctx.ink}" stroke-width="0.8" stroke-linejoin="round"/>`);
  return { pts, L, tip: pts[n], tipDir };
}

function dressBranch(ctx: Ctx, b: Branch, leafScale: number, isApex: boolean) {
  const { rng } = ctx;
  const n = b.pts.length;
  const leafCount = b.L > 200 ? 3 : b.L > 120 ? 2 : 1;
  for (let i = 0; i < leafCount; i++) {
    const t = 0.28 + (0.5 * i) / Math.max(1, leafCount - 1) + rng.range(-0.06, 0.06);
    const idx = Math.min(n - 2, Math.max(1, Math.round(t * (n - 1))));
    const p = b.pts[idx];
    const tangent = norm({ x: b.pts[idx + 1].x - b.pts[idx].x, y: b.pts[idx + 1].y - b.pts[idx].y });
    const side = i % 2 === 0 ? 1 : -1;
    const ang = angleOf(tangent) + side * deg(rng.range(40, 70));
    const L = leafScale * (0.32 * b.L + 24) * rng.range(0.8, 1.15) * (1 - t * 0.3);
    drawLeaf(ctx, p, ang, Math.max(26, Math.min(130, L)), side < 0);
  }
  const r = Math.max(16, Math.min(48, b.L * 0.16 + 10)) * (isApex ? 1.3 : 1);
  const roll = rng.next();
  if (isApex || roll < 0.62) drawFlower(ctx, ctx.flowerKind, b.tip, b.tipDir, r);
  else if (roll < 0.82) drawBud(ctx, b.tip, b.tipDir, r * 0.9);
  else drawBerries(ctx, b.tip, b.tipDir, r * 0.35);
}

// ---------- main ----------

export function generatePlantSvg(input: PlantInput): { svg: string; label: PlantLabel } {
  const seed = plantSeed(input);
  const rng = new Rng(seed);
  const climateInfo = CLIMATES[input.climate];
  const dark = input.dark;

  const lift = (c: string) => (dark ? mix(c, "#ffffff", 0.18) : c);
  const pal: Palette = {
    leaves: climateInfo.palette.leaves.map(lift),
    petals: climateInfo.palette.petals.map(lift),
    centers: climateInfo.palette.centers.map(lift),
    accent: lift(climateInfo.palette.accent),
    stem: lift(climateInfo.palette.stem),
  };
  const ink = dark ? "#f1e9d8" : "#2b2722";
  const inkSoft = dark ? "#f1e9d8" : "#2b2722";

  const leafKind = rng.pick(LEAVES_BY_CLIMATE[input.climate]);
  const flowerKind = rng.pick(FLOWERS_BY_CLIMATE[input.climate]);
  const li = rng.int(0, pal.leaves.length - 1);
  const leafFills = [pal.leaves[li], pal.leaves[(li + 1) % pal.leaves.length]];
  const pi = rng.int(0, pal.petals.length - 1);
  const petalFill = pal.petals[pi];
  const petalFill2 = pal.petals[(pi + 1) % pal.petals.length];
  const centerFill = rng.pick(pal.centers);

  const ctx: Ctx = { rng, pal, ink, inkSoft, leafKind, flowerKind, leafFills, petalFill, petalFill2, centerFill, out: [], late: [] };

  // --- main stem ---
  const root: Vec = { x: 500, y: 905 };
  const H = rng.range(610, 700);
  const segs = 40;
  const stemPts: Vec[] = [root];
  let ang = -Math.PI / 2 + rng.range(-0.12, 0.12);
  const sway = rng.range(0.03, 0.07);
  const swayFreq = rng.range(0.6, 1.3);
  const swayPhase = rng.range(0, Math.PI * 2);
  let p = root;
  for (let i = 1; i <= segs; i++) {
    const t = i / segs;
    const drift = Math.sin(t * Math.PI * 2 * swayFreq + swayPhase) * sway + rng.range(-0.02, 0.02);
    ang = ang * 0.9 + (-Math.PI / 2 + drift) * 0.1 + drift * 0.3;
    p = add(p, { x: Math.cos(ang) * (H / segs), y: Math.sin(ang) * (H / segs) });
    stemPts.push(p);
  }
  // keep it inside the frame horizontally
  const shift = 500 - stemPts[segs].x;
  for (let i = 0; i <= segs; i++) stemPts[i].x += (shift * i) / segs * 0.6;

  // roots
  const roots: string[] = [];
  const nRoots = rng.int(3, 5);
  for (let i = 0; i < nRoots; i++) {
    const a = Math.PI / 2 + rng.range(-0.9, 0.9);
    const len = rng.range(30, 70);
    const pts: Vec[] = [root];
    let q = root;
    let ra = a;
    for (let k = 1; k <= 6; k++) {
      ra += rng.range(-0.35, 0.35);
      q = add(q, { x: Math.cos(ra) * (len / 6), y: Math.sin(ra) * (len / 6) });
      pts.push(q);
    }
    roots.push(`<path d="${smoothPath(pts)}" stroke="${ink}" stroke-width="${f(rng.range(1.2, 2.2))}" fill="none" stroke-linecap="round" opacity="0.85"/>`);
  }
  ctx.out.push(`<g>${roots.join("")}</g>`);

  ctx.out.push(`<path d="${taperedRibbon(stemPts, 9, 3)}" fill="${pal.stem}" stroke="${ink}" stroke-width="1" stroke-linejoin="round"/>`);

  // basal leaves on the lower stem
  const basal = rng.int(2, 3);
  for (let i = 0; i < basal; i++) {
    const t = 0.05 + i * 0.07 + rng.range(0, 0.03);
    const idx = Math.round(t * segs);
    const side = i % 2 === 0 ? 1 : -1;
    const tangent = norm({ x: stemPts[idx + 1].x - stemPts[idx].x, y: stemPts[idx + 1].y - stemPts[idx].y });
    const a = angleOf(tangent) + side * deg(rng.range(55, 80));
    drawLeaf(ctx, stemPts[idx], a, rng.range(85, 135), side < 0);
  }

  // branches
  const k = rng.int(4, 7);
  const leafScale = rng.range(0.85, 1.1);
  let side = rng.sign();
  for (let j = 0; j < k; j++) {
    const t = 0.2 + (0.66 * (j + rng.range(0.25, 0.75))) / k;
    const idx = Math.min(segs - 1, Math.round(t * segs));
    const base = stemPts[idx];
    const tangent = norm({ x: stemPts[idx + 1].x - stemPts[idx].x, y: stemPts[idx + 1].y - stemPts[idx].y });
    const L = H * (0.2 + 0.22 * (1 - t)) * rng.range(0.8, 1.15);
    const b = growBranch(ctx, base, tangent, L, side);
    dressBranch(ctx, b, leafScale, false);
    side = rng.chance(0.8) ? -side : side;
    // a small leaf at the branch axil
    if (rng.chance(0.5)) {
      const a = angleOf(tangent) - side * deg(rng.range(45, 70));
      drawLeaf(ctx, base, a, rng.range(34, 60), side > 0);
    }
  }

  // apex
  const apexDir = norm({ x: stemPts[segs].x - stemPts[segs - 1].x, y: stemPts[segs].y - stemPts[segs - 1].y });
  const apex: Branch = { pts: stemPts.slice(-6), L: 150, tip: stemPts[segs], tipDir: apexDir };
  dressBranch(ctx, apex, leafScale, true);

  // --- side details (like a botanical plate): flower & leaf studies ---
  const detail: string[] = [];
  drawFlower(ctx, flowerKind, { x: 128, y: flowerKind === "bell" ? 790 : 838 }, { x: 0, y: -1 }, 44, detail);
  detail.push(`<text x="128" y="912" font-family="Cormorant Garamond, serif" font-style="italic" font-size="19" fill="${ink}" text-anchor="middle">a. flower</text>`);
  const leafDetail: Ctx = { ...ctx, out: [] };
  drawLeaf(leafDetail, { x: 812, y: 866 }, deg(-58), 96, false);
  detail.push(...leafDetail.out);
  detail.push(`<text x="872" y="912" font-family="Cormorant Garamond, serif" font-style="italic" font-size="19" fill="${ink}" text-anchor="middle">b. leaf</text>`);

  // --- label ---
  const label = makeLabel(input);
  const binomial = `${label.genus} ${label.species}`;
  const dedication = input.dedication.trim();
  const collectedLine = [label.variety, label.collected, `Specimen No. ${label.specimenNo}`]
    .filter(Boolean)
    .join(" · ")
    .toUpperCase();

  const text: string[] = [];
  text.push(`<path d="M400 962 L600 962" stroke="${ink}" stroke-width="1"/>`);
  text.push(`<circle cx="500" cy="962" r="3" fill="${ink}"/>`);
  text.push(`<text x="500" y="1032" font-family="Cormorant Garamond, serif" font-size="58" font-style="italic" font-weight="600" fill="${ink}" text-anchor="middle">${esc(binomial)}</text>`);
  text.push(`<text x="500" y="1074" font-family="Cormorant Garamond, serif" font-size="19" letter-spacing="3.2" fill="${ink}" text-anchor="middle">${esc(collectedLine)}</text>`);
  text.push(`<text x="500" y="1108" font-family="Cormorant Garamond, serif" font-size="24" font-style="italic" fill="${ink}" text-anchor="middle">${esc(label.habitat)}</text>`);
  if (dedication) {
    text.push(`<text x="500" y="1148" font-family="Cormorant Garamond, serif" font-size="26" font-style="italic" fill="${ink}" text-anchor="middle">${esc(dedication)}</text>`);
  }
  text.push(`<text x="946" y="86" font-family="Cormorant Garamond, serif" font-size="22" font-style="italic" fill="${ink}" text-anchor="end">Pl. ${label.specimenNo}</text>`);
  text.push(`<text x="54" y="86" font-family="Cormorant Garamond, serif" font-size="22" font-style="italic" fill="${ink}" text-anchor="start">${esc(climateInfo.label)} flora</text>`);
  text.push(`<text x="500" y="1196" font-family="Cormorant Garamond, serif" font-size="13" letter-spacing="3" fill="${ink}" text-anchor="middle" opacity="0.85">BLOOMPRINT · ONE OF ONE</text>`);

  const frame =
    `<rect x="34" y="34" width="932" height="1169" fill="none" stroke="${ink}" stroke-width="2.4"/>` +
    `<rect x="46" y="46" width="908" height="1145" fill="none" stroke="${ink}" stroke-width="0.9"/>`;

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEW_W} ${VIEW_H}" width="${VIEW_W}" height="${VIEW_H}">` +
    frame +
    `<g>${ctx.out.join("")}</g>` +
    `<g>${ctx.late.join("")}</g>` +
    `<g>${detail.join("")}</g>` +
    `<g>${text.join("")}</g>` +
    `</svg>`;

  return { svg, label };
}
