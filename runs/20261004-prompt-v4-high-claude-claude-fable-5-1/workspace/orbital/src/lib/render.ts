import path from "node:path";
import { Resvg } from "@resvg/resvg-js";
import { buildDesignSvg, type Design } from "./design";
import { shirtById } from "./catalog";

const FONT_FILES = [
  "SpaceGrotesk-Regular.ttf",
  "SpaceGrotesk-Medium.ttf",
  "InstrumentSerif-Italic.ttf",
  "InstrumentSerif-Regular.ttf",
].map((f) => path.join(process.cwd(), "public", "fonts", f));

export type RenderOptions = {
  /** output width in px; omit for the native 4665 px print file */
  width?: number;
  /** paint the shirt colour behind the art (previews only) */
  background?: boolean;
};

export function renderDesignPng(design: Design, opts: RenderOptions = {}): Buffer {
  const svg = buildDesignSvg(design);
  const resvg = new Resvg(svg, {
    fitTo: opts.width ? { mode: "width", value: opts.width } : { mode: "original" },
    background: opts.background ? shirtById(design.shirt).hex : undefined,
    font: { fontFiles: FONT_FILES, loadSystemFonts: false, defaultFontFamily: "Space Grotesk" },
  });
  return Buffer.from(resvg.render().asPng());
}
