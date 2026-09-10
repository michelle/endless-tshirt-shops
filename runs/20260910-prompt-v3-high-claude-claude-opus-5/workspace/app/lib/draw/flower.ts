import { smoothPath, polar, n, D2R, type Pt } from './geom';
import type { FlowerForm } from '../species';
import type { InkSet } from '../palettes';
import type { Rng } from '../rng';

export type FlowerOpts = {
  r: number;
  petals: number;
  form: FlowerForm;
  rot: number;
  open: number;     // 0 = bud, 1 = fully open
  ink: InkSet;
  rng: Rng;
  strokeW: number;
};

function petalBlade(r: number, halfAngle: number, tipRound: number, waist: number): Pt[] {
  const pts: Pt[] = [];
  const STEPS = 16;
  for (let i = 0; i <= STEPS; i++) {
    const t = i / STEPS;
    const w = Math.sin(Math.PI * Math.pow(t, waist)) ** tipRound;
    pts.push({ x: t * r, y: -w * r * Math.tan(halfAngle * D2R) * 1.6 });
  }
  for (let i = STEPS; i >= 0; i--) {
    const t = i / STEPS;
    const w = Math.sin(Math.PI * Math.pow(t, waist)) ** tipRound;
    pts.push({ x: t * r, y: w * r * Math.tan(halfAngle * D2R) * 1.6 });
  }
  return pts;
}

/** Returns SVG for a flower head centred on the local origin. */
export function flowerSvg(o: FlowerOpts): string {
  const { r, ink, rng } = o;
  const sw = o.strokeW;
  const open = Math.max(0.12, o.open);
  const parts: string[] = [];
  const stroke = `stroke="${ink.accentDark}" stroke-width="${n(sw)}" stroke-linejoin="round"`;

  if (o.form === 'rayed' || o.form === 'stellate' || o.form === 'rosette') {
    const rings = o.form === 'rosette' ? 3 : 1;
    for (let ring = rings - 1; ring >= 0; ring--) {
      const rr = r * open * (1 - ring * 0.24);
      const count = o.form === 'rosette' ? Math.max(5, Math.round(o.petals / (ring + 1.2))) : o.petals;
      const halfAngle = o.form === 'stellate' ? 360 / count / 2.6 : 360 / count / 2.1;
      const tipRound = o.form === 'stellate' ? 1.7 : 0.75;
      const waist = o.form === 'rosette' ? 1.3 : 0.75;
      const blade = petalBlade(rr, halfAngle, tipRound, waist);
      const fill = ring % 2 === 0 ? ink.accent : ink.accentDark;
      for (let i = 0; i < count; i++) {
        const a = o.rot + ring * 11 + (360 / count) * i + rng.gauss() * 2.2;
        parts.push(
          `<g transform="rotate(${n(a)})"><path d="${smoothPath(blade, true)}" fill="${fill}" fill-opacity="${ring === 0 ? 0.95 : 0.8}" ${stroke}/>` +
          `<path d="M${n(rr * 0.14)} 0L${n(rr * 0.82)} 0" stroke="${ink.accentDark}" stroke-width="${n(sw * 0.6)}" stroke-opacity="0.55" fill="none"/></g>`,
        );
      }
    }
    // Disc florets
    const dr = r * (o.form === 'rayed' ? 0.3 : 0.17);
    parts.push(`<circle r="${n(dr)}" fill="${ink.wash}" ${stroke}/>`);
    const dots = o.form === 'rayed' ? 26 : 10;
    for (let i = 0; i < dots; i++) {
      // Vogel phyllotaxis on the receptacle.
      const a = i * 137.507 * D2R;
      const rr = dr * 0.86 * Math.sqrt(i / dots);
      parts.push(`<circle cx="${n(Math.cos(a) * rr)}" cy="${n(Math.sin(a) * rr)}" r="${n(dr * 0.09 + sw * 0.3)}" fill="${ink.accentDark}" fill-opacity="0.8"/>`);
    }
  } else if (o.form === 'campanulate') {
    // Side-on bell.
    const w = r * 0.72 * open;
    const h = r * 1.25;
    const pts: Pt[] = [
      { x: -w * 0.28, y: -h * 0.5 }, { x: -w * 0.62, y: -h * 0.1 },
      { x: -w, y: h * 0.34 }, { x: -w * 0.86, y: h * 0.5 },
      { x: -w * 0.34, y: h * 0.4 }, { x: 0, y: h * 0.52 },
      { x: w * 0.34, y: h * 0.4 }, { x: w * 0.86, y: h * 0.5 },
      { x: w, y: h * 0.34 }, { x: w * 0.62, y: -h * 0.1 },
      { x: w * 0.28, y: -h * 0.5 },
    ];
    parts.push(`<path d="${smoothPath(pts, true)}" fill="${ink.accent}" ${stroke}/>`);
    for (let i = 1; i < 4; i++) {
      const x = -w + (2 * w * i) / 4;
      parts.push(`<path d="M${n(x * 0.55)} ${n(-h * 0.36)}Q${n(x * 0.9)} 0 ${n(x)} ${n(h * 0.4)}" fill="none" stroke="${ink.accentDark}" stroke-width="${n(sw * 0.6)}" stroke-opacity="0.5"/>`);
    }
    parts.push(`<path d="M${n(-w * 0.3)} ${n(-h * 0.5)}Q0 ${n(-h * 0.72)} ${n(w * 0.3)} ${n(-h * 0.5)}" fill="${ink.leafDark}" ${stroke}/>`);
  } else if (o.form === 'tubular') {
    const w = r * 0.6 * open;
    const h = r * 1.45;
    const pts: Pt[] = [
      { x: -w * 0.16, y: -h * 0.55 }, { x: -w * 0.24, y: 0 },
      { x: -w * 0.9, y: h * 0.34 }, { x: -w * 1.05, y: h * 0.55 },
      { x: -w * 0.4, y: h * 0.48 }, { x: 0, y: h * 0.6 },
      { x: w * 0.4, y: h * 0.48 }, { x: w * 1.05, y: h * 0.55 },
      { x: w * 0.9, y: h * 0.34 }, { x: w * 0.24, y: 0 },
      { x: w * 0.16, y: -h * 0.55 },
    ];
    parts.push(`<path d="${smoothPath(pts, true)}" fill="${ink.accent}" ${stroke}/>`);
    parts.push(`<ellipse cy="${n(h * 0.5)}" rx="${n(w * 0.95)}" ry="${n(w * 0.3)}" fill="${ink.accentDark}" fill-opacity="0.55"/>`);
  } else {
    // Papilionaceous (pea): standard, wings, keel.
    const w = r * 0.9 * open;
    const standard: Pt[] = [
      { x: -w, y: -r * 0.2 }, { x: -w * 0.75, y: -r * 0.85 },
      { x: 0, y: -r * 1.05 }, { x: w * 0.75, y: -r * 0.85 },
      { x: w, y: -r * 0.2 }, { x: 0, y: -r * 0.05 },
    ];
    parts.push(`<path d="${smoothPath(standard, true)}" fill="${ink.accent}" ${stroke}/>`);
    parts.push(`<path d="M0 ${n(-r * 0.95)}L0 ${n(-r * 0.15)}" stroke="${ink.accentDark}" stroke-width="${n(sw * 0.6)}" stroke-opacity="0.5" fill="none"/>`);
    const keel: Pt[] = [
      { x: -w * 0.78, y: -r * 0.05 }, { x: -w * 0.3, y: r * 0.55 },
      { x: w * 0.5, y: r * 0.5 }, { x: w * 0.8, y: -r * 0.05 },
    ];
    parts.push(`<path d="${smoothPath(keel, true)}" fill="${ink.accentDark}" ${stroke}/>`);
  }
  return parts.join('');
}

export function budSvg(r: number, ink: InkSet, sw: number): string {
  const pts: Pt[] = [
    { x: 0, y: -r * 1.2 }, { x: r * 0.52, y: -r * 0.35 },
    { x: r * 0.38, y: r * 0.55 }, { x: 0, y: r * 0.75 },
    { x: -r * 0.38, y: r * 0.55 }, { x: -r * 0.52, y: -r * 0.35 },
  ];
  return (
    `<path d="${smoothPath(pts, true)}" fill="${ink.accent}" fill-opacity="0.8" stroke="${ink.accentDark}" stroke-width="${n(sw)}"/>` +
    `<path d="M0 ${n(r * 0.7)}Q${n(r * 0.45)} ${n(r * 0.1)} ${n(r * 0.2)} ${n(-r * 0.85)}" fill="none" stroke="${ink.leafDark}" stroke-width="${n(sw * 0.8)}"/>` +
    `<path d="M0 ${n(r * 0.7)}Q${n(-r * 0.45)} ${n(r * 0.1)} ${n(-r * 0.2)} ${n(-r * 0.85)}" fill="none" stroke="${ink.leafDark}" stroke-width="${n(sw * 0.8)}"/>`
  );
}

export function fruitSvg(kind: string, r: number, ink: InkSet, sw: number, rng: Rng): string {
  const st = `stroke="${ink.ink}" stroke-width="${n(sw)}" stroke-linejoin="round"`;
  switch (kind) {
    case 'berry': {
      const out: string[] = [];
      for (let i = 0; i < 5; i++) {
        const a = -90 + (i - 2) * 34 + rng.gauss() * 4;
        const p = polar({ x: 0, y: 0 }, a, r * 1.05);
        const cy = -p.y * 0.7 - r * 0.3;
        out.push(`<circle cx="${n(p.x)}" cy="${n(cy)}" r="${n(r * 0.46)}" fill="${ink.accentDark}" ${st}/>`);
        out.push(`<circle cx="${n(p.x - r * 0.14)}" cy="${n(cy - r * 0.14)}" r="${n(r * 0.1)}" fill="${ink.wash}" fill-opacity="0.8"/>`);
      }
      return out.join('');
    }
    case 'capsule':
      return (
        `<path d="${smoothPath([
          { x: 0, y: -r * 1.1 }, { x: r * 0.62, y: -r * 0.2 }, { x: r * 0.42, y: r * 0.9 },
          { x: 0, y: r * 1.05 }, { x: -r * 0.42, y: r * 0.9 }, { x: -r * 0.62, y: -r * 0.2 },
        ], true)}" fill="${ink.wash}" ${st}/>` +
        `<path d="M0 ${n(-r)}L0 ${n(r)}M${n(-r * 0.4)} ${n(-r * 0.5)}L${n(-r * 0.28)} ${n(r * 0.8)}M${n(r * 0.4)} ${n(-r * 0.5)}L${n(r * 0.28)} ${n(r * 0.8)}" fill="none" stroke="${ink.ink}" stroke-width="${n(sw * 0.7)}" stroke-opacity="0.6"/>`
      );
    case 'legume':
      return (
        `<path d="${smoothPath([
          { x: -r * 1.6, y: -r * 0.1 }, { x: -r * 0.6, y: -r * 0.52 }, { x: r * 0.7, y: -r * 0.44 },
          { x: r * 1.7, y: r * 0.1 }, { x: r * 0.7, y: r * 0.5 }, { x: -r * 0.6, y: r * 0.42 },
        ], true)}" fill="${ink.wash}" ${st}/>` +
        [0, 1, 2].map((i) => `<circle cx="${n((i - 1) * r * 0.85)}" cy="0" r="${n(r * 0.24)}" fill="none" stroke="${ink.ink}" stroke-width="${n(sw * 0.7)}" stroke-opacity="0.55"/>`).join('')
      );
    case 'samara':
      return (
        `<path d="${smoothPath([
          { x: 0, y: 0 }, { x: r * 0.9, y: -r * 0.9 }, { x: r * 2.1, y: -r * 0.75 },
          { x: r * 2.3, y: -r * 0.1 }, { x: r * 1.1, y: r * 0.22 },
        ], true)}" fill="${ink.wash}" fill-opacity="0.75" ${st}/>` +
        `<ellipse cx="${n(r * 0.35)}" cy="${n(r * 0.05)}" rx="${n(r * 0.5)}" ry="${n(r * 0.36)}" fill="${ink.accentDark}" ${st}/>`
      );
    default: // achene
      return [0, 1, 2, 3, 4, 5].map((i) => {
        const a = -140 + i * 28;
        const p = polar({ x: 0, y: 0 }, a, r * 0.85);
        return `<g transform="translate(${n(p.x)} ${n(p.y)}) rotate(${n(a + 90)})"><ellipse rx="${n(r * 0.16)}" ry="${n(r * 0.42)}" fill="${ink.ink}" fill-opacity="0.8"/><path d="M0 ${n(-r * 0.4)}L0 ${n(-r * 1.1)}" stroke="${ink.faint}" stroke-width="${n(sw * 0.6)}"/></g>`;
      }).join('');
  }
}
