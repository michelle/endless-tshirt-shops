import { initWasm, Resvg } from "@resvg/resvg-wasm";
import { FONT_SERIF_ITALIC, FONT_SERIF_REGULAR } from "./data/fonts";

let wasmReady: Promise<void> | null = null;
let fontBuffers: Uint8Array[] | null = null;

/** Load the resvg WebAssembly once per server process, from our own origin. */
function ensureWasm(origin: string): Promise<void> {
  if (!wasmReady) {
    wasmReady = (async () => {
      const response = await fetch(new URL("/resvg.wasm", origin));
      if (!response.ok) throw new Error(`Could not load rasteriser (${response.status})`);
      await initWasm(await response.arrayBuffer());
    })().catch((error) => {
      wasmReady = null;
      throw error;
    });
  }
  return wasmReady;
}

function fonts(): Uint8Array[] {
  if (!fontBuffers) {
    fontBuffers = [
      new Uint8Array(Buffer.from(FONT_SERIF_REGULAR, "base64")),
      new Uint8Array(Buffer.from(FONT_SERIF_ITALIC, "base64")),
    ];
  }
  return fontBuffers;
}

/**
 * Rasterise an SVG string to a PNG. Pass `width` for a scaled preview (used by
 * the storefront and Stripe); omit it for the full print-resolution asset.
 */
export async function svgToPng(svg: string, origin: string, width?: number): Promise<Uint8Array> {
  await ensureWasm(origin);
  const renderer = new Resvg(svg, {
    font: {
      fontBuffers: fonts(),
      loadSystemFonts: false,
      defaultFontFamily: "Instrument Serif",
      serifFamily: "Instrument Serif",
    },
    fitTo: width && width > 0 ? { mode: "width", value: Math.min(width, 4000) } : { mode: "original" },
  });
  try {
    return renderer.render().asPng();
  } finally {
    renderer.free();
  }
}
