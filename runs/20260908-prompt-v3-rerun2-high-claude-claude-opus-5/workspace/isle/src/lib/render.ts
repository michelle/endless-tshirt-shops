import fs from 'node:fs';
import path from 'node:path';
import { initWasm, Resvg } from '@resvg/resvg-wasm';
import { renderChart, CANVAS, type Spec } from './chart';

const ASSETS = path.join(process.cwd(), 'assets');
const FONT_FILES = [
  'IMFellEnglish-Regular.ttf',
  'IMFellEnglish-Italic.ttf',
  'IMFellEnglishSC-Regular.ttf',
];

let ready: Promise<void> | null = null;
let fonts: Uint8Array[] | null = null;

function init(): Promise<void> {
  if (!ready) {
    ready = initWasm(fs.readFileSync(path.join(ASSETS, 'resvg.wasm'))).catch((err) => {
      // A second initWasm() on a warm lambda throws; that is a success, not a failure.
      if (String(err?.message || err).includes('already been initialized')) return;
      ready = null;
      throw err;
    });
  }
  return ready;
}

/**
 * Rasterise a customer's chart to a transparent PNG for DTG.
 *
 * Transparent, not white: on a Gildan 64000 the unprinted areas are the garment
 * itself, which is what makes the two-ink palette work on the dark colourways.
 */
export async function renderPng(spec: Spec, width: number): Promise<Buffer> {
  await init();
  if (!fonts) fonts = FONT_FILES.map((f) => fs.readFileSync(path.join(ASSETS, 'fonts', f)));

  const svg = renderChart(spec);
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: Math.round(width) },
    font: {
      fontBuffers: fonts,
      defaultFontFamily: 'IM Fell English',
      loadSystemFonts: false,
    },
    background: 'rgba(0,0,0,0)',
  });
  return Buffer.from(resvg.render().asPng());
}

/** Print-file geometry, quoted on the product page and sent to Prodigi. */
export const PRINT = {
  widthPx: 3120,
  heightPx: Math.round((3120 * CANVAS.h) / CANVAS.w),
  inchesWide: 15.6,
  dpi: Math.round(3120 / 15.6),
};
