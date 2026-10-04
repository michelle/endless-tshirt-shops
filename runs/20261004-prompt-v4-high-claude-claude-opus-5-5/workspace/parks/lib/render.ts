import fs from "node:fs";
import path from "node:path";
import { Resvg, initWasm } from "@resvg/resvg-wasm";

// WASM build of resvg: identical output locally and on Vercel (no native binaries).
let ready: Promise<void> | null = null;
function init() {
  if (!ready) {
    const wasm = fs.readFileSync(path.join(process.cwd(), "node_modules/@resvg/resvg-wasm/index_bg.wasm"));
    ready = initWasm(wasm);
  }
  return ready;
}

export async function svgToPng(svg: string, width?: number) {
  await init();
  const r = new Resvg(svg, width ? { fitTo: { mode: "width", value: width } } : undefined);
  const png = r.render().asPng();
  r.free();
  return png;
}
