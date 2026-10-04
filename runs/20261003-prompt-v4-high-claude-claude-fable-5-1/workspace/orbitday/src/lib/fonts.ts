import opentype from "opentype.js";
import { LIGHT_WOFF_B64, MEDIUM_WOFF_B64, BOLD_WOFF_B64 } from "./fontData";

export type Weight = "light" | "medium" | "bold";

function b64ToArrayBuffer(b64: string): ArrayBuffer {
  if (typeof Buffer !== "undefined") {
    const buf = Buffer.from(b64, "base64");
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  }
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

let cache: Record<Weight, opentype.Font> | null = null;

/** Parse the embedded fonts once per runtime (browser or server). */
export function getFonts(): Record<Weight, opentype.Font> {
  if (!cache) {
    cache = {
      light: opentype.parse(b64ToArrayBuffer(LIGHT_WOFF_B64)),
      medium: opentype.parse(b64ToArrayBuffer(MEDIUM_WOFF_B64)),
      bold: opentype.parse(b64ToArrayBuffer(BOLD_WOFF_B64)),
    };
  }
  return cache;
}

export interface TextPathOptions {
  weight?: Weight;
  size: number;
  /** letter spacing as a fraction of font size */
  tracking?: number;
  x: number;
  /** baseline y */
  y: number;
  anchor?: "start" | "middle" | "end";
  fill: string;
}

/** Measure advance width (in design units) with tracking applied. */
export function measureText(text: string, size: number, weight: Weight = "medium", tracking = 0): number {
  const font = getFonts()[weight];
  if (!text) return 0;
  const glyphs = font.stringToGlyphs(text);
  let w = 0;
  const scale = size / font.unitsPerEm;
  for (let i = 0; i < glyphs.length; i++) {
    w += (glyphs[i].advanceWidth ?? 0) * scale;
    if (i < glyphs.length - 1) {
      w += font.getKerningValue(glyphs[i], glyphs[i + 1]) * scale;
      w += tracking * size;
    }
  }
  return w;
}

/** Render text to a single SVG <path> element so no font is needed at raster time. */
export function textPath(text: string, o: TextPathOptions): string {
  if (!text) return "";
  const weight = o.weight ?? "medium";
  const font = getFonts()[weight];
  const tracking = o.tracking ?? 0;
  const width = measureText(text, o.size, weight, tracking);
  let x = o.x;
  if (o.anchor === "middle") x -= width / 2;
  else if (o.anchor === "end") x -= width;
  const path = font.getPath(text, x, o.y, o.size, { kerning: true, letterSpacing: tracking } as never);
  const d = path.toPathData(2);
  return `<path d="${d}" fill="${o.fill}"/>`;
}
