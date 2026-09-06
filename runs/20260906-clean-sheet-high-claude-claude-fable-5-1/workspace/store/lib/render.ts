import "server-only";
import path from "node:path";
import { Resvg } from "@resvg/resvg-js";
import { designSvg, ART_W, type DesignOptions } from "./design";

const FONT_DIR = path.join(process.cwd(), "assets", "fonts");
const FONT_FILES = [path.join(FONT_DIR, "JetBrainsMono-ExtraBold.ttf"), path.join(FONT_DIR, "JetBrainsMono-Regular.ttf")];

/**
 * Renders the design to a PNG. `width` defaults to the full 4665px print width
 * (300dpi for the 15.5" print area); pass a smaller width for previews/mockups.
 */
export async function renderPng(opts: Omit<DesignOptions, "fontFamily" | "rootAttrs"> & { width?: number }): Promise<Buffer> {
  const svg = designSvg({ ...opts, fontFamily: "JetBrains Mono" });
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: opts.width ?? ART_W },
    font: { fontFiles: FONT_FILES, defaultFontFamily: "JetBrains Mono", loadSystemFonts: false },
    background: opts.background ?? undefined,
  });
  return Buffer.from(resvg.render().asPng());
}
