// Fetches an artwork PNG and reports the bounding box of visible pixels,
// so we can check the number lands where the original put it (8in wide, 3in down).
import { PNG } from "pngjs";

const url = process.argv[2] || "http://localhost:3000/api/artwork/1757100000000.png";
const t0 = Date.now();
const res = await fetch(url);
const buf = Buffer.from(await res.arrayBuffer());
const ms = Date.now() - t0;
if (!res.ok) {
  console.error("HTTP", res.status, buf.toString().slice(0, 300));
  process.exit(1);
}
const png = PNG.sync.read(buf);
let minX = png.width, minY = png.height, maxX = -1, maxY = -1;
for (let y = 0; y < png.height; y++) {
  for (let x = 0; x < png.width; x++) {
    const a = png.data[(y * png.width + x) * 4 + 3];
    if (a > 40) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
}
const dpi = png.width / 15.6;
console.log(JSON.stringify({
  status: res.status,
  contentType: res.headers.get("content-type"),
  cacheControl: res.headers.get("cache-control"),
  bytes: buf.length,
  fetchMs: ms,
  size: `${png.width}x${png.height}`,
  bbox: { minX, minY, maxX, maxY },
  textWidthIn: +((maxX - minX + 1) / dpi).toFixed(2),
  textHeightIn: +((maxY - minY + 1) / dpi).toFixed(2),
  topOffsetIn: +(minY / dpi).toFixed(2),
  centerOffsetPx: Math.round((minX + maxX) / 2 - png.width / 2),
}, null, 2));
