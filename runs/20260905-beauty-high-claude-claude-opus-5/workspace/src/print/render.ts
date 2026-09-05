import fs from "node:fs";
import path from "node:path";
import { Font, Path, parse as parseFont } from "opentype.js";
import sharp from "sharp";
import {
  compose,
  DESIGN_WIDTH,
  type Block,
  type DialectId,
  type PrintFont,
} from "@/lib/dialects";

/* -------------------------------------------------------------------------- */
/* Fonts                                                                       */
/* -------------------------------------------------------------------------- */

const FONT_FILES: Record<PrintFont, string> = {
  mono: "SpaceMono-Regular.ttf",
  monoBold: "SpaceMono-Bold.ttf",
  serifItalic: "InstrumentSerif-Italic.ttf",
};

const cache = new Map<PrintFont, Font>();

function loadFont(which: PrintFont): Font {
  const hit = cache.get(which);
  if (hit) return hit;
  const file = path.join(process.cwd(), "src", "print", "fonts", FONT_FILES[which]);
  const buf = fs.readFileSync(file);
  const font = parseFont(
    buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer,
  );
  cache.set(which, font);
  return font;
}

/** Drop anything the font cannot actually draw, rather than printing tofu. */
function sanitize(font: Font, text: string) {
  let out = "";
  for (const ch of text) {
    if (ch === " " || font.charToGlyphIndex(ch) > 0) out += ch;
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/* Typesetting                                                                 */
/* -------------------------------------------------------------------------- */

type Box = { x1: number; y1: number; x2: number; y2: number };

const EMPTY_BOX: Box = { x1: 0, y1: 0, x2: 0, y2: 0 };

/**
 * Lay a string out one glyph at a time so we can apply letter-spacing, then
 * hand back the SVG path data plus the ink box it occupies. Baseline sits at
 * y = 0; the caller translates.
 */
function typeset(font: Font, text: string, size: number, tracking: number) {
  const step = size * tracking;
  let x = 0;
  const combined = new Path();
  for (const ch of text) {
    const glyph = font.charToGlyph(ch);
    const p = glyph.getPath(x, 0, size);
    combined.extend(p);
    x += (glyph.advanceWidth ?? 0) * (size / font.unitsPerEm) + step;
  }
  const advance = Math.max(0, x - step);
  const raw = combined.getBoundingBox();
  const box: Box =
    Number.isFinite(raw.x1) && raw.x2 > raw.x1 ? (raw as Box) : { ...EMPTY_BOX, x2: advance };
  return { path: combined, advance, box };
}

type Command = { type: string; x?: number; y?: number; x1?: number; y1?: number; x2?: number; y2?: number };

/**
 * Our own SVG serialiser.
 *
 * opentype.js's `toPathData` rounds via `Math.round(decimalPart + "e+2")`,
 * which yields NaN whenever the fractional part is small enough to stringify
 * in exponential form (0.00000000000005 -> "5e-14e+2"). It then caches the
 * NaN. One bad coordinate truncates everything after it in the path, so a
 * shirt would silently print half a timestamp. We format the numbers here.
 */
function toPathData(commands: Command[]) {
  const v = (n: number | undefined) => {
    const r = Math.round((n ?? 0) * 100) / 100;
    return Number.isFinite(r) ? String(r) : "0";
  };
  let d = "";
  for (const c of commands) {
    switch (c.type) {
      case "M":
        d += `M${v(c.x)} ${v(c.y)}`;
        break;
      case "L":
        d += `L${v(c.x)} ${v(c.y)}`;
        break;
      case "C":
        d += `C${v(c.x1)} ${v(c.y1)} ${v(c.x2)} ${v(c.y2)} ${v(c.x)} ${v(c.y)}`;
        break;
      case "Q":
        d += `Q${v(c.x1)} ${v(c.y1)} ${v(c.x)} ${v(c.y)}`;
        break;
      case "Z":
        d += "Z";
        break;
    }
  }
  return d;
}

/** Widest a block is allowed to be inside the 1000-unit column. */
const MAX_WIDTH = 946;

type Placed =
  | { kind: "path"; d: string; transform: string; opacity: number }
  | { kind: "rect"; rect: [number, number, number, number]; opacity: number };

/** Turn a composition into positioned SVG geometry in design units. */
function layout(blocks: Block[]) {
  const items: Placed[] = [];
  let cursor = 0;

  for (const block of blocks) {
    cursor += block.gap;

    if (block.kind === "rule") {
      const h = 3.5;
      items.push({
        kind: "rect",
        rect: [(DESIGN_WIDTH - block.width) / 2, cursor, block.width, h],
        opacity: block.opacity,
      });
      cursor += h;
      continue;
    }

    const font = loadFont(block.font);
    const text = sanitize(font, block.text);
    if (!text) continue;

    // Measure once, shrink if the line would run off the chest, then measure again.
    const first = typeset(font, text, block.size, block.tracking);
    const width = Math.max(first.advance, first.box.x2 - first.box.x1);
    const final =
      width > MAX_WIDTH
        ? typeset(font, text, block.size * (MAX_WIDTH / width), block.tracking)
        : first;

    const inkWidth = final.box.x2 - final.box.x1;
    items.push({
      kind: "path",
      d: toPathData(final.path.commands as unknown as Command[]),
      transform: `translate(${round((DESIGN_WIDTH - inkWidth) / 2 - final.box.x1)} ${round(cursor - final.box.y1)})`,
      opacity: block.opacity,
    });

    cursor += final.box.y2 - final.box.y1;
  }

  return { items, height: cursor };
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}

/* -------------------------------------------------------------------------- */
/* The print file                                                              */
/* -------------------------------------------------------------------------- */

export type ArtworkSpec = {
  dialect: DialectId;
  epochMs: number;
  timeZone: string;
  /** Colour of the ink, e.g. "#F6F1E6". */
  ink: string;
  /** Output width in pixels. */
  width: number;
};

/**
 * Prodigi's global tee print area is 4680 x 5790. We build a transparent
 * canvas in that ratio and drop the design into the upper chest, so
 * `fitPrintArea` lands it where a chest print belongs.
 */
export const PRINT_RATIO = 5790 / 4680;
/** Fraction of the canvas width the 1000-unit design column occupies. */
const COLUMN = 0.8;
/** Where the top of the design sits, as a fraction of canvas height. */
const TOP = 0.135;

export function buildSvg(spec: ArtworkSpec) {
  const W = Math.round(spec.width);
  const H = Math.round(W * PRINT_RATIO);

  const { items, height } = layout(compose(spec.dialect, spec.epochMs, spec.timeZone).blocks);

  const scale = (W * COLUMN) / DESIGN_WIDTH;
  const tx = (W - DESIGN_WIDTH * scale) / 2;
  const ty = H * TOP;

  const body = items
    .map((it) => {
      const o = it.opacity < 1 ? ` fill-opacity="${it.opacity}"` : "";
      if (it.kind === "rect") {
        const [x, y, w, h] = it.rect;
        return `<rect x="${round(x)}" y="${round(y)}" width="${round(w)}" height="${round(h)}"${o}/>`;
      }
      return `<path transform="${it.transform}" d="${it.d}"${o}/>`;
    })
    .join("");

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
    `<g transform="translate(${round(tx)} ${round(ty)}) scale(${round(scale * 10000) / 10000})" fill="${spec.ink}">` +
    body +
    `</g></svg>`;

  return { svg, width: W, height: H, designHeight: height };
}

export async function renderPng(spec: ArtworkSpec): Promise<Buffer> {
  const { svg, width, height } = buildSvg(spec);
  return sharp(Buffer.from(svg), { density: 72 })
    .resize(width, height, { fit: "fill" })
    .png({ compressionLevel: 9, palette: false })
    .toBuffer();
}
