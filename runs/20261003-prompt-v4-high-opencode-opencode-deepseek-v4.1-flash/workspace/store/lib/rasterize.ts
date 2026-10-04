// Platform-independent SVG -> PNG rasteriser.
// Uses @resvg/resvg-wasm with the WASM binary embedded as base64, so there are
// no native modules and the same code runs locally and on Vercel (linux-arm64).
import { initWasm, Resvg } from '@resvg/resvg-wasm';
import { resvgWasmBase64 } from './resvg-wasm';

let initPromise: Promise<void> | null = null;

async function ensureInit(): Promise<void> {
  if (!initPromise) {
    const bytes = Buffer.from(resvgWasmBase64, 'base64');
    initPromise = initWasm(bytes).catch((err) => {
      initPromise = null;
      throw err;
    });
  }
  return initPromise;
}

export async function rasterizeSvg(svg: string, width?: number): Promise<Buffer> {
  await ensureInit();
  const resvg = new Resvg(svg, {
    fitTo: width ? { mode: 'width', value: width } : { mode: 'original' },
    font: { loadSystemFonts: false },
  });
  return Buffer.from(resvg.render().asPng());
}
