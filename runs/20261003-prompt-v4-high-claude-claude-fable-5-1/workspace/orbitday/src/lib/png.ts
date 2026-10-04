/** Insert (or replace) a PNG pHYs chunk so print operators see the intended DPI. */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export function withPngDpi(png: Uint8Array, dpi: number): Buffer {
  const src = Buffer.from(png.buffer, png.byteOffset, png.byteLength);
  const ppm = Math.round(dpi / 0.0254);
  const data = Buffer.alloc(9);
  data.writeUInt32BE(ppm, 0);
  data.writeUInt32BE(ppm, 4);
  data[8] = 1; // unit: metre
  const typeAndData = Buffer.concat([Buffer.from("pHYs", "ascii"), data]);
  const chunk = Buffer.alloc(4 + typeAndData.length + 4);
  chunk.writeUInt32BE(9, 0);
  typeAndData.copy(chunk, 4);
  chunk.writeUInt32BE(crc32(typeAndData), 4 + typeAndData.length);

  // Walk chunks: drop any existing pHYs, insert ours right after IHDR.
  const out: Buffer[] = [src.subarray(0, 8)];
  let pos = 8;
  let inserted = false;
  while (pos < src.length) {
    const len = src.readUInt32BE(pos);
    const type = src.toString("ascii", pos + 4, pos + 8);
    const end = pos + 12 + len;
    if (type !== "pHYs") out.push(src.subarray(pos, end));
    if (type === "IHDR" && !inserted) {
      out.push(chunk);
      inserted = true;
    }
    pos = end;
  }
  return Buffer.concat(out);
}
