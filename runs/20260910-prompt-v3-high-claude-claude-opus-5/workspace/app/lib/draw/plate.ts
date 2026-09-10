// Composes the finished herbarium plate: rule frame, the plant itself, a
// dissection column, a scale bar and the typed specimen label.

import { makeRng } from '../rng';
import { PALETTE_BY_ID, type InkSet } from '../palettes';
import type { Specimen } from '../species';
import { plantSvg } from './plant';
import { leafPaths } from './leaf';
import { flowerSvg, fruitSvg } from './flower';
import { n, esc, smoothPath, type Pt } from './geom';

export const SERIF = "'EB Garamond', 'Times New Roman', Georgia, serif";
export const MONO = "'Courier Prime', 'Courier New', Courier, monospace";

// Canvas matches the Gildan 64000 front print area (15.6in x 19.3in) so the
// artwork can be handed to Prodigi with `fillPrintArea` and land exactly where
// it was designed to land.
export const CANVAS_W = 1166;
export const CANVAS_H = 1461;

// The composition itself is a 12in x 16in block, centred, sitting high.
const ART = { x: 134, y: 78, w: 898, h: 1196 };

type Layout = {
  plant: { x: number; y: number; w: number; h: number };
  detail: { x: number; y: number; w: number; h: number };
  label: { x: number; y: number; w: number; h: number };
};

const LAYOUT: Layout = {
  plant: { x: 14, y: 74, w: 578, h: 872 },
  detail: { x: 618, y: 92, w: 268, h: 790 },
  label: { x: 442, y: 920, w: 442, h: 258 },
};

function textEl(
  x: number, y: number, s: string,
  opts: { size: number; fill: string; family?: string; anchor?: string; weight?: string; style?: string; ls?: number; opacity?: number },
): string {
  return (
    `<text x="${n(x)}" y="${n(y)}" font-family="${opts.family || SERIF}" font-size="${n(opts.size)}"` +
    ` fill="${opts.fill}"${opts.anchor ? ` text-anchor="${opts.anchor}"` : ''}` +
    `${opts.weight ? ` font-weight="${opts.weight}"` : ''}${opts.style ? ` font-style="${opts.style}"` : ''}` +
    `${opts.ls ? ` letter-spacing="${n(opts.ls)}"` : ''}${opts.opacity != null ? ` fill-opacity="${opts.opacity}"` : ''}` +
    `>${esc(s)}</text>`
  );
}

function detailColumn(sp: Specimen, ink: InkSet, seed: number): string {
  const rng = makeRng(seed ^ 0x9e3779b9);
  const { x, y, w } = LAYOUT.detail;
  const out: string[] = [];
  const cx = x + w / 2;
  const cap = (yy: number, num: string, latin: string, eng: string) =>
    textEl(cx, yy, `${num}. ${latin} — ${eng}`, { size: 15, fill: ink.faint, anchor: 'middle', style: 'italic' });

  // 1. Corolla, face on.
  out.push(
    `<g transform="translate(${n(cx)} ${n(y + 96)})">` +
      flowerSvg({ r: 86, petals: sp.morph.petals, form: sp.morph.flowerForm, rot: 8, open: 1, ink, rng, strokeW: 1.5 }) +
    `</g>`,
  );
  out.push(cap(y + 212, '1', 'corolla', `${sp.morph.petals} lobes`));

  // 2. A single leaf, laid flat.
  const detailW: Record<string, number> = {
    ovate: 0.34, lanceolate: 0.2, cordate: 0.4, palmate: 0.44, pinnate: 0.3,
    linear: 0.07, orbicular: 0.5, sagittate: 0.34, spatulate: 0.3,
  };
  const lf = leafPaths({
    length: 190,
    width: 190 * (detailW[sp.morph.leafForm] ?? 0.3) * (0.55 + (1 - sp.morph.leafSlenderness) * 0.75),
    form: sp.morph.leafForm, margin: sp.morph.margin, veins: sp.morph.venation, wobble: 0.1, phase: 0.2,
  });
  out.push(
    `<g transform="translate(${n(cx - 95)} ${n(y + 330)})">` +
      `<path d="${lf.outline}" fill="${ink.leaf}" fill-opacity="0.85" stroke="${ink.leafDark}" stroke-width="1.5" stroke-linejoin="round"/>` +
      `<path d="${lf.mid}" fill="none" stroke="${ink.leafDark}" stroke-width="1.2" stroke-opacity="0.8"/>` +
      `<g fill="none" stroke="${ink.leafDark}" stroke-width="0.8" stroke-opacity="0.55">${lf.veins.map((v) => `<path d="${v}"/>`).join('')}</g>` +
    `</g>`,
  );
  out.push(cap(y + 442, '2', 'folium', `${sp.morph.leafForm}, ${sp.morph.margin}`));

  // 3. Fruit.
  out.push(`<g transform="translate(${n(cx)} ${n(y + 546)})">${fruitSvg(sp.morph.fruit, 34, ink, 1.4, rng)}</g>`);
  out.push(cap(y + 612, '3', 'fructus', sp.morph.fruit));

  // 4. Phyllotaxis: how the leaves sit on the stem.
  const dy = y + 700;
  const stem = `<path d="M${n(cx)} ${n(dy - 46)}L${n(cx)} ${n(dy + 62)}" stroke="${ink.stem}" stroke-width="3" stroke-linecap="round" fill="none"/>`;
  const nodes: string[] = [stem];
  const blade = (px: number, py: number, dir: number, len: number) =>
    `<path d="M${n(px)} ${n(py)}q${n(dir * len * 0.55)} ${n(-len * 0.3)} ${n(dir * len)} ${n(-len * 0.1)}` +
    `q${n(-dir * len * 0.4)} ${n(len * 0.34)} ${n(-dir * len)} ${n(len * 0.1)}Z" fill="${ink.leaf}" ` +
    `stroke="${ink.leafDark}" stroke-width="1.2" stroke-linejoin="round"/>`;
  const arr = sp.morph.leafArrangement;
  for (let i = 0; i < 3; i++) {
    const py = dy - 34 + i * 44;
    if (arr === 'opposite') { nodes.push(blade(cx, py, 1, 46), blade(cx, py, -1, 46)); }
    else if (arr === 'whorled') {
      nodes.push(blade(cx, py, 1, 46), blade(cx, py, -1, 46), blade(cx, py - 6, 1, 26), blade(cx, py - 6, -1, 26));
    } else { nodes.push(blade(cx, py, i % 2 === 0 ? 1 : -1, 50)); }
    nodes.push(`<circle cx="${n(cx)}" cy="${n(py)}" r="2.6" fill="${ink.stem}"/>`);
  }
  out.push(nodes.join(''));
  out.push(cap(y + 790, '4', 'dispositio', `${arr} phyllotaxis`));

  return out.join('');
}

function scaleBar(ink: InkSet): string {
  const x = 14, y = 1006, w = 240;
  const out: string[] = [
    `<path d="M${x} ${y}h${w}" stroke="${ink.ink}" stroke-width="2"/>`,
  ];
  for (let i = 0; i <= 5; i++) {
    const xx = x + (w / 5) * i;
    out.push(`<path d="M${n(xx)} ${y}v${i % 5 === 0 ? -14 : -9}" stroke="${ink.ink}" stroke-width="2"/>`);
  }
  out.push(textEl(x, y + 26, '0', { size: 17, fill: ink.faint, family: MONO }));
  out.push(textEl(x + w, y + 26, '10 cm', { size: 17, fill: ink.faint, family: MONO, anchor: 'end' }));
  return out.join('');
}

function labelCard(sp: Specimen, ink: InkSet): string {
  const { x, y, w, h } = LAYOUT.label;
  const t = sp.taxon;
  const pad = 22;
  const out: string[] = [];

  out.push(
    `<g transform="rotate(-0.9 ${n(x + w / 2)} ${n(y + h / 2)})">` +
      `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" fill="none" stroke="${ink.ink}" stroke-width="2"/>` +
      `<rect x="${n(x + 6)}" y="${n(y + 6)}" width="${n(w - 12)}" height="${n(h - 12)}" fill="none" stroke="${ink.faint}" stroke-width="0.9"/>`,
  );

  let yy = y + pad + 8;
  out.push(textEl(x + pad, yy, 'HERBARIUM FLORAE PERSONALIS', { size: 15, fill: ink.faint, family: MONO, ls: 1.6 }));
  yy += 10;
  out.push(`<path d="M${n(x + pad)} ${n(yy)}h${n(w - pad * 2)}" stroke="${ink.faint}" stroke-width="0.9"/>`);

  yy += 32;
  const binomial = `${t.genus} ${t.epithet}`;
  const size = binomial.length > 22 ? 30 : binomial.length > 17 ? 34 : 38;
  out.push(textEl(x + pad, yy, binomial, { size, fill: ink.label, style: 'italic' }));
  out.push(textEl(x + pad + 2, yy + 24, `${t.authority}  var. ${t.variety}`, { size: 18, fill: ink.faint, style: 'italic' }));

  yy += 50;
  out.push(textEl(x + pad, yy, `“${t.common}”`, { size: 21, fill: ink.label }));

  yy += 13;
  out.push(`<path d="M${n(x + pad)} ${n(yy)}h${n(w - pad * 2)}" stroke="${ink.faint}" stroke-width="0.9"/>`);

  const rows: [string, string][] = [
    ['LOC.', t.locality],
    ['COLL.', t.collector],
    ['DATE', t.dateLong],
    ['NO.', `${t.accession}   PL. ${t.plate}`],
  ];
  yy += 25;
  for (const [k, v] of rows) {
    out.push(textEl(x + pad, yy, k, { size: 16, fill: ink.faint, family: MONO }));
    out.push(textEl(x + pad + 72, yy, v.length > 29 ? v.slice(0, 28) + '…' : v, { size: 16, fill: ink.label, family: MONO }));
    yy += 23;
  }

  out.push(`</g>`);
  return out.join('');
}

function accessionStamp(sp: Specimen, ink: InkSet): string {
  const cx = 372, cy = 1082, r = 50;
  return (
    `<g transform="rotate(-8 ${cx} ${cy})" fill-opacity="0.5" stroke-opacity="0.5">` +
      `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${ink.accentDark}" stroke-width="3"/>` +
      `<circle cx="${cx}" cy="${cy}" r="${r - 7}" fill="none" stroke="${ink.accentDark}" stroke-width="1.2"/>` +
      textEl(cx, cy - 10, 'HORT.', { size: 13, fill: ink.accentDark, anchor: 'middle', family: MONO, ls: 1.2 }) +
      textEl(cx, cy + 10, sp.taxon.plate, { size: 22, fill: ink.accentDark, anchor: 'middle' }) +
      textEl(cx, cy + 28, 'PERS.', { size: 11, fill: ink.accentDark, anchor: 'middle', family: MONO, ls: 1.2 }) +
    `</g>`
  );
}

function pressedTape(ink: InkSet, box: { x: number; y: number; w: number; h: number }): string {
  // Three strips of gummed linen tape, the way a real sheet is mounted, laid
  // across wherever the plant actually ended up.
  const cx = box.x + box.w * 0.5;
  const strips: [number, number, number, number][] = [
    [cx - 34 + box.w * 0.16, box.y + box.h * 0.18, 62, 22],
    [cx - 36 - box.w * 0.2, box.y + box.h * 0.52, 70, 22],
    [cx - 33 + box.w * 0.05, box.y + box.h * 0.84, 66, 22],
  ];
  return strips
    .map(([x, y, w, h], i) =>
      `<g transform="rotate(${i % 2 ? 7 : -6} ${n(x + w / 2)} ${n(y + h / 2)})">` +
        `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" fill="${ink.faint}" fill-opacity="0.16" stroke="${ink.faint}" stroke-width="0.8" stroke-opacity="0.5"/>` +
      `</g>`)
    .join('');
}

export type PlateOpts = {
  /** Renders the garment colour behind the plate; used for on-screen preview only. */
  garmentHex?: string;
  dark: boolean;
  showBleedGuides?: boolean;
  /** Exact output size, used to hit Prodigi's print area to the pixel. */
  outWidth?: number;
  outHeight?: number;
};

export function plateSvgBody(sp: Specimen, opts: PlateOpts): string {
  const palette = PALETTE_BY_ID[sp.paletteId] || PALETTE_BY_ID.herbarium;
  const ink: InkSet = opts.dark ? palette.onDark : palette.onLight;
  const rng = makeRng(sp.seed);
  const t = sp.taxon;

  // Several plates can share one page, so every id is namespaced by seed.
  const uid = `p${sp.seed.toString(36)}${opts.dark ? 'd' : 'l'}-`;
  const plant = plantSvg(sp.morph, ink, rng, LAYOUT.plant.w, LAYOUT.plant.h, uid);

  const inner: string[] = [];

  // Frame + running heads.
  inner.push(`<rect x="0" y="0" width="${ART.w}" height="${ART.h}" fill="none" stroke="${ink.ink}" stroke-width="2.4"/>`);
  inner.push(`<rect x="9" y="9" width="${ART.w - 18}" height="${ART.h - 18}" fill="none" stroke="${ink.faint}" stroke-width="1"/>`);
  inner.push(textEl(ART.w / 2, 46, 'FLORA PERSONALIS', { size: 26, fill: ink.ink, anchor: 'middle', ls: 7.5 }));
  inner.push(textEl(28, 46, `PL. ${t.plate}`, { size: 18, fill: ink.faint, family: MONO }));
  inner.push(textEl(ART.w - 28, 46, t.family.toUpperCase(), { size: 18, fill: ink.faint, family: MONO, anchor: 'end' }));
  inner.push(`<path d="M28 60h${ART.w - 56}" stroke="${ink.faint}" stroke-width="0.9"/>`);

  inner.push(
    `<g transform="translate(${LAYOUT.plant.x} ${LAYOUT.plant.y})">` +
      pressedTape(ink, plant.box) + plant.svg +
    `</g>`,
  );
  inner.push(`<path d="M${LAYOUT.detail.x - 22} 92v${LAYOUT.detail.h}" stroke="${ink.faint}" stroke-width="0.9" stroke-opacity="0.7"/>`);
  inner.push(detailColumn(sp, ink, sp.seed));
  inner.push(scaleBar(ink));
  inner.push(accessionStamp(sp, ink));
  inner.push(
    textEl(14, 1064, t.habitatNote.charAt(0).toUpperCase() + t.habitatNote.slice(1) + '.', { size: 17, fill: ink.faint, style: 'italic' }),
  );
  inner.push(textEl(14, 1090, `${t.floweringNote}  Perennial.`, { size: 17, fill: ink.faint, style: 'italic' }));
  inner.push(textEl(14, 1116, `Det. ${t.authority}, ${t.dateLong.split(' ').slice(-1)[0]}`, { size: 17, fill: ink.faint, style: 'italic' }));
  inner.push(labelCard(sp, ink));

  const bg = opts.garmentHex
    ? `<rect x="0" y="0" width="${CANVAS_W}" height="${CANVAS_H}" fill="${opts.garmentHex}"/>`
    : '';

  const guides = opts.showBleedGuides
    ? `<rect x="0.5" y="0.5" width="${CANVAS_W - 1}" height="${CANVAS_H - 1}" fill="none" stroke="#ff0000" stroke-width="1" stroke-dasharray="8 8" stroke-opacity="0.5"/>`
    : '';

  return `${bg}<g transform="translate(${ART.x} ${ART.y})">${inner.join('')}</g>${guides}`;
}

export function plateSvg(sp: Specimen, opts: PlateOpts): string {
  const w = opts.outWidth ?? CANVAS_W;
  const h = opts.outHeight ?? CANVAS_H;
  // `none` lets the print file match the press's pixel dimensions exactly; the
  // resulting distortion is under a twentieth of a percent.
  const par = opts.outWidth || opts.outHeight ? ' preserveAspectRatio="none"' : '';
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${CANVAS_W} ${CANVAS_H}"${par}>` +
    plateSvgBody(sp, opts) +
    `</svg>`
  );
}
