import fs from "fs";
import path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const opentype = require("opentype.js");

let cache = null;

export function getFonts() {
  if (cache) return cache;
  const dir = path.join(process.cwd(), "assets", "fonts");
  const load = (name) => opentype.parse(fs.readFileSync(path.join(dir, name)));
  cache = {
    italic: load("InstrumentSerif-Italic.ttf"),
    roman: load("InstrumentSerif-Regular.ttf"),
    sans: load("Outfit-Regular.ttf"),
  };
  return cache;
}

export function measure(font, text, fontSize, tracking = 0) {
  const extra = tracking * fontSize;
  let w = 0;
  for (const ch of text) {
    const glyph = font.charToGlyph(ch);
    w += ((glyph.advanceWidth || font.unitsPerEm * 0.5) * fontSize) / font.unitsPerEm + extra;
  }
  return text.length ? w - extra : 0;
}

export function glyphMarkup(font, text, x, y, fontSize, tracking, fill) {
  const extra = tracking * fontSize;
  let cx = x;
  const out = [];
  for (const ch of text) {
    const glyph = font.charToGlyph(ch);
    const d = glyph.getPath(cx, y, fontSize).toPathData(2);
    if (d) out.push(`<path d="${d}" fill="${fill}"/>`);
    cx += ((glyph.advanceWidth || font.unitsPerEm * 0.5) * fontSize) / font.unitsPerEm + extra;
  }
  return out.join("");
}

export function centeredGlyphs(font, text, cx, y, fontSize, tracking, fill) {
  const w = measure(font, text, fontSize, tracking);
  return glyphMarkup(font, text, cx - w / 2, y, fontSize, tracking, fill);
}
