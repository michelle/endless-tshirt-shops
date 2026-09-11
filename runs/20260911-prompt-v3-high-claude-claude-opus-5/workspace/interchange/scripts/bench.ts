import sharp from "sharp";
import { defaultSpec } from "../lib/spec";
import { renderFront, atPixelSize } from "../lib/render";
const spec = defaultSpec();
(async () => {
  for (const [w, h] of [[3510, 4343], [4680, 5790]]) {
    const t0 = Date.now();
    const svg = atPixelSize(renderFront(spec), w, h);
    const buf = await sharp(Buffer.from(svg), { limitInputPixels: false })
      .png({ compressionLevel: 6 }).toBuffer();
    console.log(`${w}x${h}  ${(Date.now() - t0)}ms  ${(buf.length / 1e6).toFixed(2)}MB`);
  }
})();
