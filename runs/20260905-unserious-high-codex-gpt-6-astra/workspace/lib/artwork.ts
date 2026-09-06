import sharp from 'sharp';
import opentype from 'opentype.js';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { printDimensions } from './catalog';

export async function renderArtwork(timestamp: number) {
  const fontFile = await readFile(path.join(process.cwd(), 'public/fonts/IBMPlexMono-Regular.ttf'));
  const font = opentype.parse(fontFile.buffer.slice(fontFile.byteOffset, fontFile.byteOffset + fontFile.byteLength) as ArrayBuffer);
  const { width, height } = printDimensions();
  const text = String(timestamp);
  // White vector outlines on a transparent 300 DPI print canvas. No system-font dependency.
  const fontSize = 270;
  const textWidth = font.getAdvanceWidth(text, fontSize);
  const outline = font.getPath(text, (width - textWidth) / 2, 980, fontSize);
  outline.fill = '#ffffff';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${outline.toSVG(3)}</svg>`;
  return sharp(Buffer.from(svg), { limitInputPixels: 30_000_000 }).png().withMetadata({ density: 300 }).toBuffer();
}
