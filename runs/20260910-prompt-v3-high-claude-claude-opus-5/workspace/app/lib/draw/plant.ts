// Recursive turtle that grows the specimen. Everything is emitted as SVG
// strings so the identical code path renders the browser preview and the
// 300-dpi print file.

import { polar, n, D2R, smoothPath, type Pt } from './geom';
import { leafPaths } from './leaf';
import { flowerSvg, budSvg } from './flower';
import type { Morphology } from '../species';
import type { InkSet } from '../palettes';
import type { Rng } from '../rng';

// Each outline profile carries its own natural width, so a 'linear' leaf stays
// grass-like however slender the specimen's other traits are.
const FORM_WIDTH: Record<string, number> = {
  ovate: 0.34, lanceolate: 0.2, cordate: 0.4, palmate: 0.44, pinnate: 0.3,
  linear: 0.07, orbicular: 0.5, sagittate: 0.34, spatulate: 0.3,
};

type Ctx = {
  m: Morphology;
  ink: InkSet;
  rng: Rng;
  scale: number;
  behind: string[]; // foliage that sits under the stems
  front: string[];
  /** Grown as we draw, then used to scale the plant into its allotted box. */
  bb: { x0: number; y0: number; x1: number; y1: number };
  /**
   * Leaves and flowers are drawn once into <defs> and then instanced. A dense
   * specimen otherwise serialises to megabytes of duplicated bezier data.
   */
  uid: string;
  defs: string[];
  leafIds: string[];
  flowerIds: Map<string, string>;
  budget: { leaves: number; flowers: number };
};

function mark(ctx: Ctx, p: Pt, r = 0) {
  const b = ctx.bb;
  if (p.x - r < b.x0) b.x0 = p.x - r;
  if (p.y - r < b.y0) b.y0 = p.y - r;
  if (p.x + r > b.x1) b.x1 = p.x + r;
  if (p.y + r > b.y1) b.y1 = p.y + r;
}

function stemPath(a: Pt, b: Pt, bow: number): string {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const cx = mx + (-dy / len) * bow;
  const cy = my + (dx / len) * bow;
  return `M${n(a.x)} ${n(a.y)}Q${n(cx)} ${n(cy)} ${n(b.x)} ${n(b.y)}`;
}

/** Nominal leaf length the <defs> geometry is drawn at; instances scale from it. */
const LEAF_UNIT = 100;
const LEAF_VARIANTS = 4;

function buildLeafDefs(ctx: Ctx) {
  const m = ctx.m;
  const width = LEAF_UNIT * FORM_WIDTH[m.leafForm] * (0.55 + (1 - m.leafSlenderness) * 0.75);
  const sw = Math.max(0.55, ctx.scale * 0.9);
  for (let i = 0; i < LEAF_VARIANTS; i++) {
    const { outline, mid, veins } = leafPaths({
      length: LEAF_UNIT,
      width,
      form: m.leafForm,
      margin: m.margin,
      veins: m.venation,
      wobble: ctx.rng.range(-0.5, 0.5),
      phase: ctx.rng.next(),
    });
    const tone = i % 2 === 0 ? ctx.ink.leaf : ctx.ink.leafDark;
    const id = `${ctx.uid}lf${i}`;
    ctx.leafIds.push(id);
    ctx.defs.push(
      `<g id="${id}">` +
        `<path d="M0 0L${n(LEAF_UNIT * 0.16)} 0" stroke="${ctx.ink.stem}" stroke-width="${n(sw * 1.3)}" fill="none" stroke-linecap="round"/>` +
        `<g transform="translate(${n(LEAF_UNIT * 0.16)} 0)">` +
          `<path d="${outline}" fill="${tone}" fill-opacity="0.88" stroke="${ctx.ink.leafDark}" stroke-width="${n(sw)}" stroke-linejoin="round"/>` +
          `<path d="${mid}" fill="none" stroke="${ctx.ink.leafDark}" stroke-width="${n(sw * 0.85)}" stroke-opacity="0.75"/>` +
          `<g fill="none" stroke="${ctx.ink.leafDark}" stroke-width="${n(sw * 0.5)}" stroke-opacity="0.5">${veins.map((v) => `<path d="${v}"/>`).join('')}</g>` +
          (m.gloss > 0.55
            ? `<path d="${mid}" fill="none" stroke="${ctx.ink.wash}" stroke-width="${n(sw * 2.2)}" stroke-opacity="${n(0.1 + m.gloss * 0.14)}" transform="translate(0 ${n(-width * 0.32)})"/>`
            : '') +
        `</g>` +
      `</g>`,
    );
  }
}

function drawLeaf(ctx: Ctx, at: Pt, angle: number, size: number, layer: string[]) {
  if (ctx.budget.leaves <= 0) return;
  ctx.budget.leaves -= 1;
  const len = size * (0.72 + ctx.m.leafLength * 0.5);
  mark(ctx, at, len * 1.2);
  const id = ctx.leafIds[Math.floor(ctx.rng.next() * ctx.leafIds.length)];
  const scale = len / LEAF_UNIT;
  layer.push(
    `<use href="#${id}" transform="translate(${n(at.x)} ${n(at.y)}) rotate(${n(angle)}) scale(${n(scale)})"/>`,
  );
}

const FLOWER_UNIT = 100;

/** Returns the id of a cached flower head, creating it on first use. */
function flowerDef(ctx: Ctx, open: number, sw: number): string {
  const bucket = Math.max(1, Math.round(open * 4));
  const key = `f${bucket}`;
  const existing = ctx.flowerIds.get(key);
  if (existing) return existing;
  const id = `${ctx.uid}${key}`;
  ctx.flowerIds.set(key, id);
  ctx.defs.push(
    `<g id="${id}">${flowerSvg({
      r: FLOWER_UNIT,
      petals: ctx.m.petals,
      form: ctx.m.flowerForm,
      rot: ctx.rng.range(0, 360),
      open: bucket / 4,
      ink: ctx.ink,
      rng: ctx.rng,
      // Stroke weights are baked at unit size, then scaled with the instance.
      strokeW: (sw * FLOWER_UNIT) / Math.max(1, FLOWER_UNIT),
    })}</g>`,
  );
  return id;
}

function drawInflorescence(ctx: Ctx, at: Pt, angle: number, size: number) {
  const m = ctx.m;
  const r = size * (0.3 + m.flowerSize * 0.34);
  const sw = Math.max(0.5, ctx.scale * 0.8);
  const put = (p: Pt, rr: number, open: number, rot: number) => {
    if (ctx.budget.flowers <= 0) return;
    ctx.budget.flowers -= 1;
    mark(ctx, p, rr * 1.5);
    const id = flowerDef(ctx, open, sw);
    ctx.front.push(
      `<use href="#${id}" transform="translate(${n(p.x)} ${n(p.y)}) rotate(${n(rot)}) scale(${n(rr / FLOWER_UNIT)})"/>`,
    );
  };
  const pedicel = (from: Pt, to: Pt) => {
    mark(ctx, to, size * 0.2);
    ctx.behind.push(`<path d="${stemPath(from, to, ctx.rng.gauss() * size * 0.06)}" fill="none" stroke="${ctx.ink.stem}" stroke-width="${n(sw * 1.5)}" stroke-linecap="round"/>`);
  };

  switch (m.inflorescence) {
    case 'solitary':
      put(at, r * 1.35, 1, angle + 90);
      break;
    case 'umbel': {
      const count = 5 + (m.petals % 3);
      for (let i = 0; i < count; i++) {
        const a = angle - 70 + (140 / (count - 1)) * i + ctx.rng.gauss() * 5;
        const p = polar(at, a, r * 1.5 + ctx.rng.range(-r * 0.2, r * 0.2));
        pedicel(at, p);
        put(p, r * 0.72, 1, a + 90);
      }
      break;
    }
    case 'raceme':
    case 'spike': {
      const count = 5 + (m.buds % 3);
      const spacing = r * (m.inflorescence === 'spike' ? 0.85 : 1.15);
      for (let i = 0; i < count; i++) {
        const along = polar(at, angle, i * spacing);
        const side = i % 2 === 0 ? 1 : -1;
        const off = m.inflorescence === 'spike' ? r * 0.25 : r * 0.95;
        const p = polar(along, angle + side * 62, off);
        if (m.inflorescence === 'raceme') pedicel(along, p);
        const open = 1 - (i / count) * 0.75;
        if (open > 0.4) put(p, r * 0.66, open, angle + side * 62 + 90);
        else {
          mark(ctx, p, r * 0.6);
          const bid = `${ctx.uid}bud`;
          if (!ctx.flowerIds.has('bud')) {
            ctx.flowerIds.set('bud', bid);
            ctx.defs.push(`<g id="${bid}">${budSvg(FLOWER_UNIT * 0.3, ctx.ink, sw * 3)}</g>`);
          }
          ctx.front.push(`<use href="#${bid}" transform="translate(${n(p.x)} ${n(p.y)}) rotate(${n(angle + 90)}) scale(${n(r / FLOWER_UNIT)})"/>`);
        }
      }
      break;
    }
    case 'panicle': {
      for (let i = 0; i < 3; i++) {
        const a = angle - 42 + i * 42;
        const hub = polar(at, a, r * 1.4);
        pedicel(at, hub);
        for (let j = 0; j < 3; j++) {
          const a2 = a - 30 + j * 30;
          const p = polar(hub, a2, r * 0.9);
          pedicel(hub, p);
          put(p, r * 0.5, 1, a2 + 90);
        }
      }
      break;
    }
    default: { // cyme
      put(at, r * 1.05, 1, angle + 90);
      for (const side of [-1, 1]) {
        const p = polar(at, angle + side * 55, r * 1.9);
        pedicel(at, p);
        put(p, r * 0.78, 0.9, angle + side * 55 + 90);
      }
      break;
    }
  }
}

function branch(ctx: Ctx, from: Pt, angle: number, length: number, width: number, order: number) {
  const m = ctx.m;
  const nodes = order === 0 ? m.internodes : Math.max(2, m.internodes - order * 2);
  let cur = from;
  let a = angle;
  const sw = ctx.scale;

  for (let i = 0; i < nodes; i++) {
    const segLen = (length / nodes) * ctx.rng.range(0.85, 1.15);
    a += m.curvature * 4 + ctx.rng.gauss() * 2.4;
    const to = polar(cur, a, segLen);
    mark(ctx, to, width);
    const w = width * (1 - i / (nodes + 1.5));
    ctx.behind.push(
      `<path d="${stemPath(cur, to, m.curvature * segLen * 0.12)}" fill="none" stroke="${ctx.ink.stem}" stroke-width="${n(Math.max(sw * 0.7, w))}" stroke-linecap="round"/>`,
    );

    const t = (i + 1) / nodes;
    const leafSize = length * 0.17 * (1.15 - t * 0.45) * (order === 0 ? 1 : 0.8);

    // Leaves at the node, arranged per the recorded phyllotaxis.
    const sides =
      m.leafArrangement === 'opposite' ? [-1, 1] :
      m.leafArrangement === 'whorled' ? [-1, 1, -0.35, 0.35] :
      [i % 2 === 0 ? 1 : -1];
    if (i < nodes - (m.habit === 'rosette' ? 0 : 1) || order > 0) {
      for (const s of sides) {
        const spread = (m.leafArrangement === 'whorled' ? 52 : 62) * s;
        drawLeaf(ctx, to, a + spread + ctx.rng.gauss() * 6, leafSize, s > 0 ? ctx.front : ctx.behind);
      }
    }

    // Lateral branches.
    if (
      order < m.branchOrders - 1 &&
      i >= 1 && i < nodes - 1 &&
      ctx.budget.leaves > 40 && ctx.budget.flowers > 6 &&
      ctx.rng.chance(0.72 - order * 0.2)
    ) {
      const s = i % 2 === 0 ? -1 : 1;
      branch(
        ctx, to,
        a + s * m.branchAngle * ctx.rng.range(0.8, 1.2),
        length * ctx.rng.range(0.42, 0.6),
        w * 0.62,
        order + 1,
      );
    }
    cur = to;
  }

  drawInflorescence(ctx, cur, a, length * 0.16);
}

function roots(ctx: Ctx, at: Pt, size: number): string {
  const sw = Math.max(0.6, ctx.scale);
  const ink = ctx.ink;
  const st = `stroke="${ink.stem}" fill="none" stroke-linecap="round"`;
  const out: string[] = [];
  const fine = (from: Pt, a: number, len: number, w: number, depth: number) => {
    const to = polar(from, a, len);
    mark(ctx, to, w);
    out.push(`<path d="${stemPath(from, to, ctx.rng.gauss() * len * 0.12)}" ${st} stroke-width="${n(w)}"/>`);
    if (depth > 0) {
      for (const s of [-1, 1]) fine(to, a + s * ctx.rng.range(18, 40), len * 0.6, w * 0.6, depth - 1);
    }
  };
  switch (ctx.m.root) {
    case 'taproot':
      fine(at, 90, size * 1.1, sw * 3.2, 2);
      for (let i = 0; i < 5; i++) fine(polar(at, 90, size * 0.2 * i), 90 + (i % 2 ? 55 : -55), size * 0.4, sw * 1.1, 1);
      break;
    case 'fibrous':
      for (let i = 0; i < 11; i++) fine(at, 55 + i * 7 + ctx.rng.gauss() * 4, size * ctx.rng.range(0.5, 1), sw * 1.2, 1);
      break;
    case 'rhizome': {
      const end = polar(at, 172, size * 1.1);
      out.push(`<path d="${stemPath(at, end, size * 0.1)}" ${st} stroke-width="${n(sw * 4)}"/>`);
      for (let i = 0; i < 4; i++) fine(polar(at, 172, size * 0.28 * (i + 0.5)), 88 + ctx.rng.gauss() * 12, size * 0.5, sw * 1.1, 1);
      break;
    }
    case 'bulb': {
      const r = size * 0.42;
      const pts: Pt[] = [
        { x: 0, y: -r * 0.5 }, { x: r * 0.85, y: r * 0.15 }, { x: r * 0.5, y: r * 1.05 },
        { x: 0, y: r * 1.2 }, { x: -r * 0.5, y: r * 1.05 }, { x: -r * 0.85, y: r * 0.15 },
      ].map((p) => ({ x: at.x + p.x, y: at.y + p.y }));
      out.push(`<path d="${smoothPath(pts, true)}" fill="${ink.wash}" fill-opacity="0.75" stroke="${ink.stem}" stroke-width="${n(sw)}"/>`);
      for (let i = -2; i <= 2; i++) {
        out.push(`<path d="M${n(at.x + i * r * 0.3)} ${n(at.y - r * 0.4)}Q${n(at.x + i * r * 0.42)} ${n(at.y + r * 0.4)} ${n(at.x + i * r * 0.18)} ${n(at.y + r * 1.1)}" ${st} stroke-width="${n(sw * 0.7)}" stroke-opacity="0.6"/>`);
      }
      for (let i = 0; i < 7; i++) fine({ x: at.x + (i - 3) * r * 0.2, y: at.y + r * 1.15 }, 78 + i * 5, size * 0.4, sw * 0.9, 0);
      break;
    }
    default: { // tuber
      for (let i = 0; i < 3; i++) {
        const c = polar(at, 60 + i * 45, size * 0.45);
        out.push(`<ellipse cx="${n(c.x)}" cy="${n(c.y)}" rx="${n(size * 0.24)}" ry="${n(size * 0.17)}" transform="rotate(${n(20 + i * 30)} ${n(c.x)} ${n(c.y)})" fill="${ink.wash}" fill-opacity="0.75" stroke="${ink.stem}" stroke-width="${n(sw)}"/>`);
        out.push(`<path d="${stemPath(at, c, size * 0.05)}" ${st} stroke-width="${n(sw * 1.2)}"/>`);
      }
      break;
    }
  }
  return out.join('');
}

export type PlantResult = { svg: string; box: { x: number; y: number; w: number; h: number } };

/** Draws the whole plant into a box of `w` x `h`, base centred at the bottom. */
export function plantSvg(m: Morphology, ink: InkSet, rng: Rng, w: number, h: number, uid: string): PlantResult {
  const scale = Math.max(0.9, w / 620);
  const baseY = h * 0.86;
  const base: Pt = { x: w * 0.5, y: baseY };
  const ctx: Ctx = {
    m, ink, rng, scale, behind: [], front: [],
    bb: { x0: base.x, y0: base.y, x1: base.x, y1: base.y },
    uid, defs: [], leafIds: [], flowerIds: new Map(),
    budget: { leaves: 240, flowers: 96 },
  };
  buildLeafDefs(ctx);

  const trunkLen = h * 0.62 * (0.72 + m.height * 0.34);
  const trunkW = scale * (m.habit === 'shrubby' ? 5.2 : 3.6);

  const rootSvg = roots(ctx, base, Math.min(w, h) * 0.16);

  if (m.habit === 'rosette') {
    // Basal rosette of leaves plus a naked flowering scape.
    for (let i = 0; i < 9; i++) {
      const a = -196 + i * 26 + rng.gauss() * 4;
      drawLeaf(ctx, base, a, trunkLen * 0.34, a < -90 ? ctx.behind : ctx.front);
    }
    branch(ctx, base, -90 + m.curvature * 5, trunkLen, trunkW, 1);
  } else if (m.habit === 'climbing') {
    branch(ctx, base, -90 + m.curvature * 10, trunkLen, trunkW, 0);
    // Tendrils.
    for (let i = 0; i < 4; i++) {
      const p = polar(base, -90, trunkLen * (0.25 + i * 0.18));
      const coil: Pt[] = [];
      for (let t = 0; t <= 22; t++) {
        const u = t / 22;
        const rr = trunkLen * 0.06 * (1 - u * 0.5);
        coil.push({ x: p.x + (i % 2 ? 1 : -1) * (u * trunkLen * 0.16 + Math.cos(u * 12) * rr * 0.5), y: p.y - u * trunkLen * 0.1 + Math.sin(u * 12) * rr });
      }
      for (const c of coil) mark(ctx, c, scale);
      ctx.behind.push(`<path d="${smoothPath(coil)}" fill="none" stroke="${ink.stem}" stroke-width="${n(scale * 0.9)}" stroke-linecap="round"/>`);
    }
  } else if (m.habit === 'shrubby') {
    for (let i = 0; i < 3; i++) {
      branch(ctx, base, -90 + (i - 1) * 26 + rng.gauss() * 5, trunkLen * rng.range(0.72, 1), trunkW * 0.8, 0);
    }
  } else {
    const lean = m.habit === 'arching' ? m.curvature * 16 - 8 : 0;
    branch(ctx, base, -90 + lean, trunkLen, trunkW, 0);
  }

  // Fine stipple, standing in for the hatching on an engraved plate.
  const stipple: string[] = [];
  const dots = Math.round(m.hairiness * 90);
  for (let i = 0; i < dots; i++) {
    const x = base.x + rng.gauss() * w * 0.2;
    const y = baseY - Math.abs(rng.gauss()) * trunkLen * 0.55;
    stipple.push(`<circle cx="${n(x)}" cy="${n(y)}" r="${n(scale * 0.45)}" fill="${ink.faint}" fill-opacity="0.28"/>`);
  }

  // Nothing above knows how large the plant ended up, so scale the measured
  // extent into the allotted box rather than hoping the parameters behave.
  const bb = ctx.bb;
  const bw = Math.max(1, bb.x1 - bb.x0);
  const bh = Math.max(1, bb.y1 - bb.y0);
  const fit = Math.min(w / bw, h / bh, 1.35);
  const cx = (bb.x0 + bb.x1) / 2;
  const tx = w / 2 - cx * fit;
  // Bottom-anchored: the roots belong at the foot of the sheet, not floating
  // in the middle of it.
  const ty = h - bb.y1 * fit;

  return {
    box: { x: tx + bb.x0 * fit, y: ty + bb.y0 * fit, w: bw * fit, h: bh * fit },
    svg:
      `<defs>${ctx.defs.join('')}</defs>` +
      `<g transform="translate(${n(tx)} ${n(ty)}) scale(${n(fit)})">` +
        `<g>${rootSvg}</g>` +
        `<g>${ctx.behind.join('')}</g>` +
        `<g>${stipple.join('')}</g>` +
        `<g>${ctx.front.join('')}</g>` +
      `</g>`,
  };
}
