import fs from 'node:fs';
import path from 'node:path';
import opentype from 'opentype.js';
import sharp from 'sharp';
import { artwork, Design, TextRenderer } from './design';
let fonts: Record<string, opentype.Font> | undefined;
function getFonts() {
  if (!fonts) {
    fonts = {};
    for (const name of ['display', 'mono']) {
      const b = fs.readFileSync(
        path.join(process.cwd(), 'public/fonts', name + '.ttf'),
      );
      fonts[name] = opentype.parse(
        b.buffer.slice(
          b.byteOffset,
          b.byteOffset + b.byteLength,
        ) as ArrayBuffer,
      );
    }
  }
  return fonts;
}
export function outlinedSvg(design: Design) {
  const fonts = getFonts();
  const text: TextRenderer = (value, x, y, size, font, color, maxWidth) => {
    const f = fonts[font],
      width = f.getAdvanceWidth(value, size),
      target = maxWidth
        ? Math.min(
            maxWidth,
            value.length * size * (font === 'display' ? 0.46 : 0.6),
          )
        : width,
      scale = width ? target / width : 1;
    const path = f.getPath(value, 0, 0, size).toPathData(2);
    return `<path d="${path}" fill="${color}" transform="translate(${x - target / 2} ${y}) scale(${scale} 1)"/>`;
  };
  return artwork(design, text);
}
export async function printPng(design: Design) {
  return sharp(Buffer.from(outlinedSvg(design)))
    .resize(4680, 5882, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .withMetadata({ density: 300 })
    .png()
    .toBuffer();
}
