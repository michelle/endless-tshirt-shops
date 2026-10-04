import * as opentype from "opentype.js";
import { alfa, anton } from "./fonts-data";

type Font = opentype.Font;

function load(b64: string): Font {
  const buf = Buffer.from(b64, "base64");
  return opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
}

/** Serialise path commands ourselves — opentype's toPathData emits NaN for some fractional sizes. */
function pathData(path: opentype.Path) {
  const n = (v: number) => (Math.round(v * 10) / 10).toString();
  let d = "";
  for (const c of path.commands as any[]) {
    if (c.type === "M" || c.type === "L") d += `${c.type}${n(c.x)} ${n(c.y)}`;
    else if (c.type === "Q") d += `Q${n(c.x1)} ${n(c.y1)} ${n(c.x)} ${n(c.y)}`;
    else if (c.type === "C") d += `C${n(c.x1)} ${n(c.y1)} ${n(c.x2)} ${n(c.y2)} ${n(c.x)} ${n(c.y)}`;
    else if (c.type === "Z") d += "Z";
  }
  return d;
}

let cache: { display: Font; label: Font } | null = null;

/** display = park name (Alfa Slab One), label = small caps lines (Anton). */
export function fonts() {
  if (!cache) cache = { display: load(alfa), label: load(anton) };
  return cache;
}

export function capHeight(font: Font, size: number) {
  return ((font.tables.os2?.sCapHeight || font.unitsPerEm * 0.72) / font.unitsPerEm) * size;
}

export function hasGlyphs(font: Font, text: string) {
  for (const ch of text) {
    if (ch === " ") continue;
    if (font.charToGlyphIndex(ch) <= 0) return false;
  }
  return true;
}

interface Laid {
  glyph: opentype.Glyph;
  x: number; // left edge, relative to start
  advance: number;
}

/** Lays out glyphs left-to-right with kerning and extra tracking (in px). */
export function layout(font: Font, text: string, size: number, tracking = 0) {
  const scale = size / font.unitsPerEm;
  const glyphs = font.stringToGlyphs(text);
  const laid: Laid[] = [];
  let x = 0;
  glyphs.forEach((g, i) => {
    const advance = (g.advanceWidth || 0) * scale;
    laid.push({ glyph: g, x, advance });
    x += advance + tracking;
    if (i < glyphs.length - 1) x += font.getKerningValue(g, glyphs[i + 1]) * scale;
  });
  const width = laid.length ? x - tracking : 0;
  return { laid, width, size };
}

/** Straight text, horizontally centered on cx, baseline at y. */
export function textPath(font: Font, text: string, cx: number, y: number, size: number, tracking = 0) {
  const { laid, width } = layout(font, text, size, tracking);
  const x0 = cx - width / 2;
  return laid.map((l) => pathData(l.glyph.getPath(x0 + l.x, y, size))).join("");
}

/**
 * Text set along a circle. `top` reads left-to-right over the top of the circle
 * with glyph bottoms facing the centre; otherwise it reads along the bottom with
 * glyph tops facing the centre. Returns path data plus the angular span used.
 */
export function arcTextPath(
  font: Font,
  text: string,
  cx: number,
  cy: number,
  radius: number,
  size: number,
  tracking: number,
  top: boolean,
) {
  const { laid, width } = layout(font, text, size, tracking);
  const ch = capHeight(font, size);
  // Baseline radius: caps straddle `radius`.
  const rBase = top ? radius - ch / 2 : radius + ch / 2;
  const span = width / radius;
  const parts: string[] = [];
  for (const l of laid) {
    const mid = l.x + l.advance / 2;
    const theta = top ? -Math.PI / 2 - span / 2 + mid / radius : Math.PI / 2 + span / 2 - mid / radius;
    const px = cx + rBase * Math.cos(theta);
    const py = cy + rBase * Math.sin(theta);
    const rot = top ? theta + Math.PI / 2 : theta - Math.PI / 2;
    const d = pathData(l.glyph.getPath(-l.advance / 2, 0, size));
    if (!d) continue;
    parts.push(
      `<path transform="translate(${px.toFixed(1)} ${py.toFixed(1)}) rotate(${((rot * 180) / Math.PI).toFixed(2)})" d="${d}"/>`,
    );
  }
  return { svg: parts.join(""), span };
}
