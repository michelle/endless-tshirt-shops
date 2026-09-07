import { createHmac, timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
// The package is CommonJS; Node ESM exposes its API as the default export.
// oxlint-disable-next-line import/default
import opentype from 'opentype.js';
import sharp from 'sharp';
import { CATALOG, type Selection } from './catalog';
import { appUrl, required } from './config';
export function artworkSignature(timestamp: number, fit: Selection['fit']) {
  return createHmac('sha256', required('ARTWORK_SIGNING_SECRET'))
    .update(`datetime-v1:${timestamp}:${fit}`)
    .digest('hex');
}
export function validSignature(
  timestamp: number,
  fit: Selection['fit'],
  signature: string,
) {
  if (!/^[a-f0-9]{64}$/.test(signature)) return false;
  return timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(artworkSignature(timestamp, fit), 'hex'),
  );
}
export function artworkUrl(s: Selection) {
  const p = new URLSearchParams({
    timestamp: String(s.timestamp),
    fit: s.fit,
    signature: artworkSignature(s.timestamp, s.fit),
  });
  return `${appUrl()}/api/artwork?${p}`;
}
let fontPromise: Promise<opentype.Font> | undefined;
async function font() {
  return (fontPromise ??= readFile(
    path.join(process.cwd(), 'public/fonts/mono.ttf'),
  ).then((b) =>
    opentype.parse(
      b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer,
    ),
  ));
}
export async function renderArtwork(timestamp: number, fit: Selection['fit']) {
  const { width, height } = CATALOG[fit];
  const f = await font();
  const text = String(timestamp);
  const fontSize = 308;
  const textWidth = f.getAdvanceWidth(text, fontSize);
  const glyphs = f.getPath(text, (width - textWidth) / 2, 1150, fontSize);
  glyphs.fill = '#ffffff';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${glyphs.toSVG(3)}</svg>`;
  return sharp(Buffer.from(svg), { limitInputPixels: 40000000 })
    .png()
    .withMetadata({ density: 300 })
    .toBuffer();
}
