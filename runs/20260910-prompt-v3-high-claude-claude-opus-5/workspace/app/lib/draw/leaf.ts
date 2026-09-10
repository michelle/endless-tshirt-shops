// A leaf is one parametric half-outline w(t) mirrored about the midrib, with a
// high-frequency modulation for the margin. Every leaf form in the catalogue is
// a different w(t), which keeps venation, shading and serration code shared.

import { smoothPath, n, type Pt } from './geom';
import type { LeafForm, Margin } from '../species';

export type LeafOpts = {
  length: number;
  width: number;
  form: LeafForm;
  margin: Margin;
  veins: number;
  wobble: number;   // 0..1 asymmetry, so no two leaves are identical
  phase: number;    // decorrelates the wobble
};

function profile(form: LeafForm, t: number): number {
  // t: 0 at petiole, 1 at apex. Returns half-width as a fraction of max.
  const bell = (peak: number, spread: number) =>
    Math.exp(-((t - peak) ** 2) / (2 * spread * spread));
  switch (form) {
    case 'ovate':
      return Math.sin(Math.PI * Math.pow(t, 0.72)) ** 0.85;
    case 'lanceolate':
      return Math.sin(Math.PI * Math.pow(t, 0.55)) ** 1.35;
    case 'spatulate':
      return Math.sin(Math.PI * Math.pow(t, 1.5)) ** 0.8;
    case 'orbicular':
      return Math.sqrt(Math.max(0, 1 - (2 * t - 1) ** 2));
    case 'linear':
      return Math.sin(Math.PI * t) ** 0.25 * 0.9;
    case 'cordate': {
      // Widest very low down, with a notch cut at the base.
      const body = Math.sin(Math.PI * Math.pow(t, 0.58)) ** 0.68;
      const notch = t < 0.14 ? (t / 0.14) ** 0.55 : 1;
      return body * notch + (t < 0.34 ? 0.3 * bell(0.15, 0.1) : 0);
    }
    case 'sagittate': {
      const body = Math.sin(Math.PI * Math.pow(t, 0.62)) ** 1.4;
      const lobe = t < 0.28 ? 1.5 * bell(0.09, 0.07) : 0;
      return Math.max(body, lobe) * (t < 0.03 ? t / 0.03 : 1);
    }
    case 'palmate': {
      // Three to five radiating lobes read as deep sinuses in the outline.
      const body = Math.sin(Math.PI * Math.pow(t, 0.6)) ** 0.8;
      const sinus = 0.45 + 0.55 * Math.abs(Math.cos(t * Math.PI * 2.5));
      return body * sinus;
    }
    case 'pinnate': {
      // Deeply pinnatifid: regular leaflet pairs along the rachis.
      const body = Math.sin(Math.PI * Math.pow(t, 0.62)) ** 0.9;
      const cut = 0.34 + 0.66 * Math.abs(Math.sin(t * Math.PI * 5.5));
      return body * cut;
    }
    default:
      return Math.sin(Math.PI * t);
  }
}

function marginMod(margin: Margin, t: number, phase: number): number {
  switch (margin) {
    case 'entire': return 1;
    case 'serrate': {
      const s = ((t * 26 + phase) % 1);
      return 1 + 0.055 * (s < 0.5 ? s * 2 : 2 - s * 2) - 0.02;
    }
    case 'dentate': {
      const s = ((t * 16 + phase) % 1);
      return 1 + (s < 0.35 ? 0.075 : -0.015);
    }
    case 'crenate':
      return 1 + 0.05 * Math.sin((t * 18 + phase) * Math.PI * 2);
    case 'lobed':
      return 1 + 0.16 * Math.sin((t * 4.5 + phase) * Math.PI * 2);
    case 'undulate':
      return 1 + 0.035 * Math.sin((t * 9 + phase) * Math.PI * 2);
    default: return 1;
  }
}

/** Leaf drawn in local space: petiole at (0,0), apex at (length, 0). */
export function leafPaths(o: LeafOpts) {
  const STEPS = 34;
  const top: Pt[] = [];
  const bottom: Pt[] = [];
  const marginPts: Pt[] = [];
  for (let i = 0; i <= STEPS; i++) {
    const t = i / STEPS;
    const base = profile(o.form, t);
    const m = marginMod(o.margin, t, o.phase);
    // A gentle sag on one side keeps leaves from looking machine-stamped.
    const sag = Math.sin(Math.PI * t) * o.wobble * o.width * 0.18;
    const wUp = Math.max(0, base * m * o.width * (1 + o.wobble * 0.12));
    const wDn = Math.max(0, base * marginMod(o.margin, t, o.phase + 0.37) * o.width * (1 - o.wobble * 0.1));
    const x = t * o.length;
    const midY = -Math.sin(Math.PI * t * 0.85) * o.length * 0.045 * o.wobble;
    top.push({ x, y: midY - wUp + sag * 0.3 });
    bottom.push({ x, y: midY + wDn + sag * 0.3 });
    if (i % 2 === 0) marginPts.push({ x, y: midY });
  }
  const outline = smoothPath([...top, ...bottom.slice().reverse()], true);

  // Midrib follows the same slight curve as the outline centre.
  const mid = smoothPath(marginPts, false);

  // Secondary veins run from the midrib out to (just short of) the margin.
  const veins: string[] = [];
  const pairs = Math.max(2, o.veins);
  for (let k = 1; k <= pairs; k++) {
    const t = 0.1 + (k / (pairs + 1)) * 0.82;
    const i = Math.round(t * STEPS);
    const a = { x: top[i].x, y: (top[i].y + bottom[i].y) / 2 };
    for (const side of [top, bottom]) {
      const tip = side[Math.min(STEPS, i + Math.round(STEPS * 0.13))];
      const c = { x: (a.x + tip.x) / 2 + o.length * 0.02, y: (a.y + tip.y) / 2 };
      veins.push(
        `M${n(a.x)} ${n(a.y)}Q${n(c.x)} ${n(c.y)} ${n(tip.x * 0.98 + a.x * 0.02)} ${n(tip.y * 0.9 + a.y * 0.1)}`,
      );
    }
  }
  return { outline, mid, veins };
}
