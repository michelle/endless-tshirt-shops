/**
 * A dependency-free rasteriser + PNG encoder.
 *
 * The artwork we send to Prodigi is a handful of convex polygons on a
 * transparent field, so pulling in a native image library (sharp, resvg,
 * node-canvas) would buy us nothing and cost us a fragile build. Instead we
 * scan-convert the polygons directly and emit an 8-bit grey+alpha PNG with
 * Node's built-in zlib.
 */

import { deflateSync } from 'node:zlib';
import type { Polygon } from './glyphs';

/** Vertical supersampling factor. Horizontal coverage is computed exactly. */
const SUBSAMPLES = 4;

/**
 * Scan-converts convex polygons into an 8-bit alpha coverage mask.
 *
 * Each polygon is handled independently over its own bounding box, so cost
 * scales with the inked area rather than the canvas area. Convexity means a
 * scanline crosses the outline exactly twice, which lets us fill a single
 * span per sub-scanline and compute horizontal coverage analytically.
 */
export function rasterise(polygons: Polygon[], width: number, height: number): Uint8Array {
  const alpha = new Uint8Array(width * height);

  for (const poly of polygons) {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const [x, y] of poly) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }

    const rowStart = Math.max(0, Math.floor(minY));
    const rowEnd = Math.min(height - 1, Math.ceil(maxY));
    const colStart = Math.max(0, Math.floor(minX));
    const colEnd = Math.min(width - 1, Math.ceil(maxX));
    if (rowStart > rowEnd || colStart > colEnd) continue;

    // Coverage for one pixel row, accumulated across its sub-scanlines.
    const span = colEnd - colStart + 1;
    const cov = new Float32Array(span);

    for (let py = rowStart; py <= rowEnd; py++) {
      cov.fill(0);
      let touched = false;

      for (let s = 0; s < SUBSAMPLES; s++) {
        const sy = py + (s + 0.5) / SUBSAMPLES;

        // Convex outline => at most two crossings; track the extremes.
        let xa = Infinity;
        let xb = -Infinity;
        for (let i = 0; i < poly.length; i++) {
          const [x1, y1] = poly[i];
          const [x2, y2] = poly[(i + 1) % poly.length];
          if (y1 === y2) continue;
          if (sy < Math.min(y1, y2) || sy >= Math.max(y1, y2)) continue;
          const x = x1 + ((sy - y1) / (y2 - y1)) * (x2 - x1);
          if (x < xa) xa = x;
          if (x > xb) xb = x;
        }
        if (xa >= xb) continue;

        const from = Math.max(colStart, Math.floor(xa));
        const to = Math.min(colEnd, Math.ceil(xb) - 1);
        for (let px = from; px <= to; px++) {
          // Exact horizontal overlap of [xa, xb] with the pixel [px, px+1].
          const overlap = Math.min(xb, px + 1) - Math.max(xa, px);
          if (overlap > 0) {
            cov[px - colStart] += overlap / SUBSAMPLES;
            touched = true;
          }
        }
      }

      if (!touched) continue;
      const base = py * width;
      for (let i = 0; i < span; i++) {
        const c = cov[i];
        if (c <= 0) continue;
        const idx = base + colStart + i;
        const v = alpha[idx] + c * 255;
        alpha[idx] = v > 255 ? 255 : v;
      }
    }
  }

  return alpha;
}

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const COLOUR_TYPE_GREY_ALPHA = 4;
const INCHES_PER_METRE = 39.3701;

/**
 * Encodes an alpha mask as a grey+alpha PNG in a single solid `grey` tone.
 * Two bytes per pixel keeps the intermediate buffer a quarter the size of
 * RGBA, which matters at print resolution.
 */
export function encodePng(
  alpha: Uint8Array,
  width: number,
  height: number,
  grey: number,
  dpi: number,
): Buffer {
  const stride = width * 2;
  const raw = Buffer.alloc(height * (stride + 1));

  for (let y = 0; y < height; y++) {
    const rowOffset = y * (stride + 1);
    raw[rowOffset] = 0; // filter type: None
    const src = y * width;
    let w = rowOffset + 1;
    for (let x = 0; x < width; x++) {
      raw[w++] = grey;
      raw[w++] = alpha[src + x];
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = COLOUR_TYPE_GREY_ALPHA;
  ihdr[10] = 0; // deflate
  ihdr[11] = 0; // adaptive filtering
  ihdr[12] = 0; // no interlace

  // pHYs advertises the intended print resolution to the print pipeline.
  const perMetre = Math.round(dpi * INCHES_PER_METRE);
  const phys = Buffer.alloc(9);
  phys.writeUInt32BE(perMetre, 0);
  phys.writeUInt32BE(perMetre, 4);
  phys[8] = 1; // unit: metres

  return Buffer.concat([
    PNG_SIGNATURE,
    chunk('IHDR', ihdr),
    chunk('pHYs', phys),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
