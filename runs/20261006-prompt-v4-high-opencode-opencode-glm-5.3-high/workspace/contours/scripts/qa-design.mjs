// Visual QA without eyes: measure the rendered PNG's ink coverage,
// bounding boxes, and that each text band actually has ink in it.
import { readFileSync } from 'node:fs';
import { PNG } from 'pngjs';

const file = process.argv[2];
const png = PNG.sync.read(readFileSync(file));
const { width: W, height: H, data } = png;

let ink = 0, minX = W, minY = H, maxX = 0, maxY = 0;
const rowInk = new Uint32Array(H);
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    if (data[i + 3] > 8) {
      ink++;
      rowInk[y]++;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
}
const pct = ((ink / (W * H)) * 100).toFixed(2);
console.log(`${file.split('/').pop()}: ${W}x${H}, ink ${pct}% of canvas`);
console.log(`  ink bbox: x ${minX}-${maxX} (${((maxX - minX) / W * 100).toFixed(1)}% w), y ${minY}-${maxY} (${((maxY - minY) / H * 100).toFixed(1)}% h)`);
console.log(`  margins: L ${(minX / W * 100).toFixed(1)}% R ${((W - maxX) / W * 100).toFixed(1)}% T ${(minY / H * 100).toFixed(1)}% B ${((H - maxY) / H * 100).toFixed(1)}%`);

// expected text bands (user units / VH), scaled to this render
const bands = [
  ['title', 100, 180],
  ['rule', 168, 190],
  ['map', 228, 1024],
  ['place', 1040, 1085],
  ['coords', 1090, 1122],
  ['elev', 1135, 1160],
  ['wordmark', 1172, 1196],
];
const scale = H / 1235.26;
for (const [name, a, b] of bands) {
  const ya = Math.round(a * scale), yb = Math.round(b * scale);
  let c = 0;
  for (let y = ya; y < yb; y++) c += rowInk[y] || 0;
  console.log(`  band ${name.padEnd(8)} y ${String(ya).padStart(5)}-${String(yb).padStart(5)}  ink px ${c}`);
}
