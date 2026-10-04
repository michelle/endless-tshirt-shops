/**
 * SVG → PNG using the WebAssembly build of resvg. WASM avoids per-platform
 * native binaries, which makes serverless deploys (Vercel/Lambda) reliable.
 */
import fs from "node:fs";
import path from "node:path";
import { initWasm, Resvg, type ResvgRenderOptions } from "@resvg/resvg-wasm";

let ready: Promise<void> | null = null;

function locateWasm(): string {
  // Built without a string literal import so webpack does not try to bundle the binary;
  // next.config.ts traces the file into the serverless bundle instead.
  const rel = ["node_modules", "@resvg", "resvg-wasm", "index_bg.wasm"];
  const candidates = [
    path.join(process.cwd(), ...rel),
    path.join(process.cwd(), ".next", "server", ...rel),
    path.join(__dirname, ...rel),
  ];
  for (const c of candidates) if (fs.existsSync(c)) return c;
  throw new Error(`resvg wasm not found; looked in: ${candidates.join(", ")}`);
}

export function ensureResvg(): Promise<void> {
  if (!ready) {
    ready = initWasm(fs.readFileSync(locateWasm())).catch((e: unknown) => {
      if (/already/i.test(String(e))) return; // initialised by a previous warm invocation
      ready = null;
      throw e;
    });
  }
  return ready;
}

export async function svgToPng(svg: string, opts: ResvgRenderOptions = {}): Promise<Uint8Array> {
  await ensureResvg();
  const r = new Resvg(svg, { fitTo: { mode: "original" }, ...opts });
  const img = r.render();
  const png = img.asPng();
  img.free();
  r.free();
  return png;
}
