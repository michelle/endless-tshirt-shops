import opentype from "opentype.js";
import { FONT_B64 } from "./fonts.gen";

export type Weight = 400 | 600 | 800;

const cache = new Map<Weight, opentype.Font>();

function load(weight: Weight): opentype.Font {
  const hit = cache.get(weight);
  if (hit) return hit;
  const bin = Buffer.from(FONT_B64[weight], "base64");
  const ab = bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength) as ArrayBuffer;
  const font = opentype.parse(ab);
  cache.set(weight, font);
  return font;
}

export type TextOpts = {
  size: number;
  weight?: Weight;
  /** extra letter spacing, in em units (e.g. 0.06) */
  tracking?: number;
};

export function capHeight(size: number, weight: Weight = 400): number {
  const f = load(weight);
  const os2 = (f.tables as any).os2;
  const cap = os2?.sCapHeight || f.unitsPerEm * 0.72;
  return (cap / f.unitsPerEm) * size;
}

export function xHeight(size: number, weight: Weight = 400): number {
  const f = load(weight);
  const os2 = (f.tables as any).os2;
  const xh = os2?.sxHeight || f.unitsPerEm * 0.52;
  return (xh / f.unitsPerEm) * size;
}

/** Advance width of a string including tracking. */
export function measure(text: string, o: TextOpts): number {
  const w = o.weight ?? 400;
  const f = load(w);
  const track = (o.tracking ?? 0) * o.size;
  const glyphs = f.stringToGlyphs(text);
  let total = 0;
  for (let i = 0; i < glyphs.length; i++) {
    const g = glyphs[i];
    total += ((g.advanceWidth ?? 0) / f.unitsPerEm) * o.size;
    if (i < glyphs.length - 1) {
      const kern = f.getKerningValue(g, glyphs[i + 1]);
      total += (kern / f.unitsPerEm) * o.size;
      total += track;
    }
  }
  return total;
}

export type Anchor = "start" | "middle" | "end";

/**
 * Convert a string to an SVG path `d` string. Baseline sits at y; x is the
 * anchor point. Text is emitted as outlines so rendering never depends on
 * fonts being installed on the machine doing the rasterising.
 */
export function textPath(text: string, x: number, y: number, o: TextOpts & { anchor?: Anchor }): string {
  const w = o.weight ?? 400;
  const f = load(w);
  const track = (o.tracking ?? 0) * o.size;
  const width = measure(text, o);
  let cursor = x;
  if (o.anchor === "middle") cursor -= width / 2;
  else if (o.anchor === "end") cursor -= width;

  const glyphs = f.stringToGlyphs(text);
  const parts: string[] = [];
  for (let i = 0; i < glyphs.length; i++) {
    const g = glyphs[i];
    const d = g.getPath(cursor, y, o.size).toPathData(2);
    if (d) parts.push(d);
    cursor += ((g.advanceWidth ?? 0) / f.unitsPerEm) * o.size;
    if (i < glyphs.length - 1) {
      cursor += (f.getKerningValue(g, glyphs[i + 1]) / f.unitsPerEm) * o.size;
      cursor += track;
    }
  }
  return parts.join(" ");
}

/** Break `text` into lines that each fit within maxWidth. */
export function wrap(text: string, maxWidth: number, o: TextOpts): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const word of words) {
    const next = cur ? `${cur} ${word}` : word;
    if (measure(next, o) <= maxWidth || !cur) cur = next;
    else {
      lines.push(cur);
      cur = word;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}
