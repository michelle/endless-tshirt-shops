import fs from 'fs';
import path from 'path';
import * as opentype from 'opentype.js';
import { designElements, FONT_FILES, type DesignElement, type FontId } from './design';
import { PRINT_HEIGHT, PRINT_WIDTH } from './print-const';
import type { StyleId } from './catalog';

export { PRINT_WIDTH, PRINT_HEIGHT };

const fontCache = new Map<FontId, opentype.Font>();

function loadFont(id: FontId): opentype.Font {
  let font = fontCache.get(id);
  if (!font) {
    font = opentype.parse(fs.readFileSync(path.join(process.cwd(), 'fonts', FONT_FILES[id])));
    fontCache.set(id, font);
  }
  return font;
}

function runToPathData(el: Extract<DesignElement, { kind: 'text' }>): string {
  const font = loadFont(el.font);
  const ls = el.letterSpacing ?? 0;
  if (ls > 0) {
    const chars = [...el.text];
    const widths = chars.map((ch) => font.getAdvanceWidth(ch, el.size));
    const total = widths.reduce((a, b) => a + b, 0) + ls * (chars.length - 1);
    let x = el.x - total / 2;
    let d = '';
    chars.forEach((ch, i) => {
      d += font.getPath(ch, x, el.y, el.size, { kerning: false }).toPathData(2);
      x += widths[i] + ls;
    });
    return d;
  }
  const advance = font.getAdvanceWidth(el.text, el.size, { kerning: true });
  const x0 = el.x - advance / 2;
  return font.getPath(el.text, x0, el.y, el.size, { kerning: true }).toPathData(2);
}

export function designToPrintSvg(text: string, style: StyleId, inkHex: string): string {
  const elements = designElements({ text, style, width: PRINT_WIDTH, height: PRINT_HEIGHT });
  const parts: string[] = [];
  for (const el of elements) {
    if (el.kind === 'text') {
      const d = runToPathData(el);
      const opacity = el.opacity < 1 ? ` fill-opacity="${el.opacity}"` : '';
      if (el.rotate) {
        // Glyph centered on its anchor point so rotate spins about it.
        const font = loadFont(el.font);
        const advance = font.getAdvanceWidth(el.text, el.size, { kerning: true });
        const dCentered = font
          .getPath(el.text, -advance / 2, 0, el.size, { kerning: true })
          .toPathData(2);
        parts.push(
          `<g transform="translate(${el.x.toFixed(2)} ${el.y.toFixed(2)}) rotate(${el.rotate.toFixed(2)})"><path d="${dCentered}" fill="${inkHex}"${opacity}/></g>`
        );
      } else {
        parts.push(`<path d="${d}" fill="${inkHex}"${opacity}/>`);
      }
    } else if (el.kind === 'rect') {
      const opacity = el.opacity < 1 ? ` fill-opacity="${el.opacity}"` : '';
      parts.push(
        `<rect x="${el.x.toFixed(2)}" y="${el.y.toFixed(2)}" width="${el.w.toFixed(2)}" height="${el.h.toFixed(2)}" fill="${inkHex}"${opacity}/>`
      );
    } else {
      const opacity = el.opacity < 1 ? ` fill-opacity="${el.opacity}"` : '';
      parts.push(
        `<circle cx="${el.cx.toFixed(2)}" cy="${el.cy.toFixed(2)}" r="${el.r.toFixed(2)}" fill="${inkHex}"${opacity}/>`
      );
    }
  }
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${PRINT_WIDTH}" height="${PRINT_HEIGHT}" ` +
    `viewBox="0 0 ${PRINT_WIDTH} ${PRINT_HEIGHT}">${parts.join('')}</svg>`
  );
}
