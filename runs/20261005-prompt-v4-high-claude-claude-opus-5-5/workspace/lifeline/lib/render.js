// Server-side rasteriser: design → transparent PNG at full print resolution.
// Uses the WASM build of resvg so the same code runs on any serverless platform.
import { initWasm, Resvg } from '@resvg/resvg-wasm';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { renderSVG } from '../public/design.js';

const require = createRequire(import.meta.url);
const fontDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'fonts');
const fontBuffers = ['Medium', 'Bold', 'Black'].map((w) => readFileSync(path.join(fontDir, `InterDisplay-${w}.ttf`)));

let ready;
const init = () => (ready ??= initWasm(readFileSync(require.resolve('@resvg/resvg-wasm/index_bg.wasm'))));

export async function renderPNG(design, { dark, background = null, width } = {}) {
  await init();
  const svg = renderSVG(design, { dark, background });
  const resvg = new Resvg(svg, {
    font: { fontBuffers, loadSystemFonts: false, defaultFontFamily: 'Inter Display' },
    fitTo: width ? { mode: 'width', value: width } : { mode: 'original' },
    shapeRendering: 2,
    textRendering: 1,
  });
  const png = resvg.render().asPng();
  resvg.free();
  return Buffer.from(png);
}
