// ASCII view: downsample a rendered PNG to a character grid, so the
// composition can be sanity-checked without a screen.
import { readFileSync } from 'node:fs';
import { PNG } from 'pngjs';

const file = process.argv[2];
const COLS = Number(process.argv[3] || 72);
const png = PNG.sync.read(readFileSync(file));
const { width: W, height: H, data } = png;
const ROWS = Math.round((COLS * H) / W / 2); // chars are ~2x tall
let out = '';
for (let r = 0; r < ROWS; r++) {
  for (let c = 0; c < COLS; c++) {
    let hit = 0, n = 0;
    const y0 = Math.floor((r * H) / ROWS), y1 = Math.floor(((r + 1) * H) / ROWS);
    const x0 = Math.floor((c * W) / COLS), x1 = Math.floor(((c + 1) * W) / COLS);
    for (let y = y0; y < Math.max(y1, y0 + 1); y += 2) {
      for (let x = x0; x < Math.max(x1, x0 + 1); x += 2) {
        const i = (y * W + x) * 4;
        n++;
        if (data[i + 3] > 8) hit++;
      }
    }
    const d = hit / n;
    out += d === 0 ? ' ' : d < 0.06 ? '·' : d < 0.15 ? ':' : d < 0.3 ? '+' : d < 0.55 ? '*' : '#';
  }
  out += '\n';
}
console.log(out);
