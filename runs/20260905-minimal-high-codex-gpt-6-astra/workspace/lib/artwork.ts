import fs from "node:fs/promises";
import path from "node:path";
import opentype from "opentype.js";
import sharp from "sharp";
let fontPromise: Promise<opentype.Font> | undefined;
async function font() {
  return (fontPromise ??= (async () => {
    const b = await fs.readFile(
      path.join(process.cwd(), "public/fonts/Chivo.ttf"),
    );
    return opentype.parse(
      b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer,
    );
  })());
}
// Fixed v1 print template: transparent 300 DPI canvas, 8 inch white timestamp.
// Glyph outlines are embedded, so print rendering never depends on system fonts.
export async function renderArtwork(timestamp: number) {
  if (!Number.isSafeInteger(timestamp) || !/^\d{13}$/.test(String(timestamp)))
    throw new Error("Invalid timestamp");
  const f = await font(),
    text = String(timestamp);
  const width = 4677,
    height = 5881,
    targetWidth = 2400;
  const glyphs = [...text].map((c) => f.charToGlyph(c));
  const advance = glyphs.reduce(
    (sum, g) => sum + (g.advanceWidth ?? f.unitsPerEm),
    0,
  );
  const size = (targetWidth / advance) * f.unitsPerEm;
  const p = new opentype.Path();
  let cursor = 0;
  for (const g of glyphs) {
    p.extend(g.getPath(cursor, 0, size));
    cursor += ((g.advanceWidth ?? f.unitsPerEm) * size) / f.unitsPerEm;
  }
  const box = p.getBoundingBox();
  const glyph = p.toPathData(3);
  const x = (width - (box.x2 - box.x1)) / 2 - box.x1;
  const y = 600 - box.y1;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><path fill="#ffffff" transform="translate(${x} ${y})" d="${glyph}"/></svg>`;
  return sharp(Buffer.from(svg))
    .png()
    .withMetadata({ density: 300 })
    .toBuffer();
}
