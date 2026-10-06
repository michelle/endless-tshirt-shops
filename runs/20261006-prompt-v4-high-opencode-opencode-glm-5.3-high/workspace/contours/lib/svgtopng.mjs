// SVG → PNG via resvg (wasm), with the store's bundled TTF fonts loaded so
// print files render identically everywhere.

import { initWasm, Resvg } from '@resvg/resvg-wasm';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const WASM_PATH = require.resolve('@resvg/resvg-wasm/index_bg.wasm');

const FONT_DIR = path.resolve(process.cwd(), 'public/fonts');
const FONT_FILES = [
  path.join(FONT_DIR, 'CormorantGaramond-SemiBold.ttf'),
  path.join(FONT_DIR, 'CormorantGaramond-MediumItalic.ttf'),
  path.join(FONT_DIR, 'Jost-Regular.ttf'),
  path.join(FONT_DIR, 'Jost-Medium.ttf'),
];

let ready = null;
export function rasterizerReady() {
  if (!ready) {
    ready = initWasm(readFileSync(WASM_PATH)).catch((e) => {
      ready = null;
      throw e;
    });
  }
  return ready;
}

// renderSvgToPng(svg, { width?, background? }) → Buffer
export async function renderSvgToPng(svg, opts = {}) {
  await rasterizerReady();
  const resvg = new Resvg(svg, {
    fitTo: opts.width ? { mode: 'width', value: opts.width } : undefined,
    background: opts.background, // 'rgba(...)' or CSS colour; default = transparent
    font: {
      fontBuffers: FONT_FILES.map((f) => new Uint8Array(readFileSync(f))),
      defaultFontFamily: 'Jost',
    },
    logLevel: 'error',
  });
  return Buffer.from(resvg.render().asPng());
}
