// SVG -> PNG via resvg compiled to WebAssembly (architecture-independent: works on x64 and arm64 functions).
import fs from 'node:fs';
import path from 'node:path';
import { initWasm, Resvg } from '@resvg/resvg-wasm';

let ready;
export async function svgToPng(svg, options = {}) {
  ready ||= initWasm(fs.readFileSync(path.join(process.cwd(), 'node_modules', '@resvg', 'resvg-wasm', 'index_bg.wasm')));
  await ready;
  return new Resvg(svg, { fitTo: { mode: 'original' }, ...options }).render().asPng();
}
