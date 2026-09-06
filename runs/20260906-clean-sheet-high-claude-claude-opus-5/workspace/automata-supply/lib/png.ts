import { deflateSync } from "zlib";

/**
 * Minimal indexed-colour (PNG colour type 3) encoder.
 *
 * Cellular-automaton art is flat colour on a transparent ground, so an 8-bit
 * palette with a tRNS chunk encodes it exactly and compresses to a few KB even
 * at print resolution. Avoiding a raster dependency also keeps the serverless
 * bundle small and native-binary free.
 */

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

export type Palette = { rgb: [number, number, number]; alpha: number }[];

/**
 * `indices` is a width*height array of palette indices, row-major.
 * `dpi` is written as a pHYs chunk so print services read the physical size.
 */
export function encodeIndexedPng(
  width: number,
  height: number,
  indices: Uint8Array,
  palette: Palette,
  dpi = 300,
): Buffer {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 3; // colour type: indexed
  ihdr[10] = 0; // deflate
  ihdr[11] = 0; // adaptive filtering
  ihdr[12] = 0; // no interlace

  const plte = Buffer.alloc(palette.length * 3);
  palette.forEach((c, i) => {
    plte[i * 3] = c.rgb[0];
    plte[i * 3 + 1] = c.rgb[1];
    plte[i * 3 + 2] = c.rgb[2];
  });
  const trns = Buffer.from(palette.map((c) => c.alpha));

  // pixels-per-metre
  const ppm = Math.round(dpi / 0.0254);
  const phys = Buffer.alloc(9);
  phys.writeUInt32BE(ppm, 0);
  phys.writeUInt32BE(ppm, 4);
  phys[8] = 1; // unit: metre

  // Filter type 0 (None) per scanline. Rows of the art are long runs of one
  // index, which deflate handles better than a per-byte predictor would.
  const raw = Buffer.alloc(height * (width + 1));
  for (let y = 0; y < height; y++) {
    const o = y * (width + 1);
    raw[o] = 0;
    raw.set(indices.subarray(y * width, y * width + width), o + 1);
  }

  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("PLTE", plte),
    chunk("tRNS", trns),
    chunk("pHYs", phys),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
