// WASM build of resvg: no native binaries, so it runs anywhere Vercel builds or deploys.
import { initWasm, Resvg } from '@resvg/resvg-wasm';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { renderSVG } from '../public/js/design.js';

const require = createRequire(import.meta.url);
const fontDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'fonts');
const FONTS = ['Barlow-Medium', 'Barlow-SemiBold', 'Barlow-Bold', 'BarlowCondensed-Bold', 'BarlowCondensed-ExtraBold'];

let ready;
function init() {
  ready ??= (async () => {
    await initWasm(readFileSync(require.resolve('@resvg/resvg-wasm/index_bg.wasm')));
    return FONTS.map((f) => new Uint8Array(readFileSync(path.join(fontDir, `${f}.ttf`))));
  })();
  return ready;
}

/** Renders the full-resolution, transparent print PNG for a normalized design. */
export async function renderPrintPNG(design, garment, { width, background } = {}) {
  const fontBuffers = await init();
  let svg = renderSVG(design, garment);
  if (background) svg = svg.replace(/(<svg[^>]*>)/, `$1<rect width="100%" height="100%" fill="${background}"/>`);
  const resvg = new Resvg(svg, {
    font: { fontBuffers, defaultFontFamily: 'Barlow' },
    fitTo: width ? { mode: 'width', value: width } : { mode: 'original' },
    shapeRendering: 2,
    textRendering: 1,
  });
  const png = resvg.render().asPng();
  resvg.free();
  return png;
}
