/**
 * Server-side PNG rendering: SVG → print-ready PNG via resvg (wasm), with the
 * bundled Cinzel / Cormorant Garamond files so the print matches the preview
 * typography exactly. Runs on Vercel's Node runtime with zero native deps.
 */
import { initWasm, Resvg } from "@resvg/resvg-wasm";
import path from "node:path";
import { readFile } from "node:fs/promises";

const ASSETS = path.join(process.cwd(), "src", "lib", "assets");
const WASM = path.join(ASSETS, "resvg.wasm");
const FONT_FILES = [
  "Cinzel-400.ttf",
  "Cinzel-600.ttf",
  "CormorantGaramond-500.ttf",
  "CormorantGaramond-500i.ttf",
  "CormorantGaramond-600.ttf",
];

let ready: Promise<void> | null = null;

async function ensureInit(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      const wasm = new Uint8Array(await readFile(WASM));
      await initWasm(wasm);
    })();
  }
  return ready;
}

export interface RenderOptions {
  /** Output raster width in px. Default 2480 (300 DPI across an A4 front). */
  width?: number;
}

export async function renderSvgToPng(svg: string, opts: RenderOptions = {}): Promise<Uint8Array> {
  await ensureInit();
  const width = Math.min(4960, Math.max(310, Math.round(opts.width ?? 2480)));
  // The wasm renderer has no filesystem access, so fonts are handed over as
  // raw buffers (fontFiles paths are silently ignored in the wasm build).
  const fontBuffers = await Promise.all(
    FONT_FILES.map(f => readFile(path.join(ASSETS, "fonts", f))),
  );
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: width },
    font: {
      fontBuffers: fontBuffers.map(b => new Uint8Array(b)),
      loadSystemFonts: false,
      defaultFontFamily: "Cinzel",
    },
    background: "rgba(0,0,0,0)",
  });
  return resvg.render().asPng();
}
