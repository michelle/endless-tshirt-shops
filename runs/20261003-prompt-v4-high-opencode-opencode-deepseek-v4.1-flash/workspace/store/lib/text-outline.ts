// Server-only text renderer: converts strings to vector outlines using
// bundled TTF fonts, so the print file has no font dependencies.
import * as opentype from 'opentype.js';
import {
  montserratBold,
  montserratMedium,
  montserratRegular,
  montserratSemiBold,
  playfairBold,
  playfairRegular,
} from './fonts';
import type { TextRenderer, TextSpec } from './design-svg';

type FontKind = 'display' | 'sans';

function fontData(font: FontKind, weight: number): string {
  if (font === 'display') return weight >= 600 ? playfairBold : playfairRegular;
  if (weight >= 700) return montserratBold;
  if (weight >= 600) return montserratSemiBold;
  if (weight >= 500) return montserratMedium;
  return montserratRegular;
}

const cache = new Map<string, opentype.Font>();

function parseFont(b64: string): opentype.Font {
  let font = cache.get(b64);
  if (!font) {
    const buf = Buffer.from(b64, 'base64');
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    font = opentype.parse(ab as ArrayBuffer);
    cache.set(b64, font);
  }
  return font;
}

function toPathData(font: opentype.Font, text: string, size: number, tracking: number) {
  const scale = size / font.unitsPerEm;
  const chars = Array.from(text);
  let x = 0;
  let d = '';
  for (const ch of chars) {
    const glyph = font.charToGlyph(ch);
    d += glyph.getPath(x, 0, size).toPathData(2) + ' ';
    x += (glyph.advanceWidth ?? 0) * scale + tracking;
  }
  const width = x - (chars.length ? tracking : 0);
  return { d, width };
}

export const outlineTextRenderer: TextRenderer = {
  render(text: string, spec: TextSpec, x: number, y: number): string {
    const font = parseFont(fontData(spec.font, spec.weight));
    const { d, width } = toPathData(font, text, spec.size, spec.tracking);
    return `<path d="${d}" transform="translate(${(x - width / 2).toFixed(1)} ${y.toFixed(1)})" fill="${spec.fill}" opacity="${spec.opacity}"/>`;
  },
};
