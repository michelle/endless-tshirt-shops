import { Resvg, initWasm } from '@resvg/resvg-wasm';
import fs from 'node:fs';
import path from 'node:path';

let wasmInitPromise: Promise<void> | null = null;

export async function ensureWasmInitialized(origin?: string): Promise<void> {
  if (wasmInitPromise) {
    return wasmInitPromise;
  }

  wasmInitPromise = (async () => {
    const candidatePaths = [
      path.join(process.cwd(), 'public', 'resvg.wasm'),
      path.join(process.cwd(), 'node_modules', '@resvg', 'resvg-wasm', 'index_bg.wasm'),
      path.join(process.cwd(), '.next', 'server', 'public', 'resvg.wasm'),
      path.join(process.cwd(), '.next', 'standalone', 'public', 'resvg.wasm')
    ];

    let wasmBuffer: Buffer | Uint8Array | null = null;
    for (const p of candidatePaths) {
      try {
        if (typeof p === 'string' && fs.existsSync(p)) {
          wasmBuffer = fs.readFileSync(p);
          break;
        }
      } catch (e) {
        // Continue
      }
    }

    if (!wasmBuffer && origin) {
      try {
        const res = await fetch(`${origin}/resvg.wasm`);
        if (res.ok) {
          const ab = await res.arrayBuffer();
          wasmBuffer = new Uint8Array(ab);
        }
      } catch (err) {
        console.warn('Wasm fetch fallback failed:', err);
      }
    }

    if (!wasmBuffer) {
      throw new Error('resvg.wasm binary could not be loaded from filesystem or network.');
    }

    await initWasm(wasmBuffer);
  })();

  return wasmInitPromise;
}

export async function renderSvgToPng(
  svg: string,
  width: number = 4677,
  origin?: string
): Promise<Buffer> {
  await ensureWasmInitialized(origin);
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: width }
  });
  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();
  return Buffer.from(pngBuffer);
}
