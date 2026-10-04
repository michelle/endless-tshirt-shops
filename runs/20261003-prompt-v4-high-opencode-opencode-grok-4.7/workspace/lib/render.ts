import { readFileSync } from "fs";
import path from "path";
import { Resvg } from "@resvg/resvg-js";
import { designSvg, PRINT_W } from "./design";
import type { DesignSpec } from "./catalog";

let fontFiles: string[] | null = null;

function fonts(): string[] {
  if (fontFiles) return fontFiles;
  const dir = path.join(process.cwd(), "public", "fonts");
  fontFiles = [
    "InstrumentSerif-Regular.ttf",
    "InstrumentSerif-Italic.ttf",
    "InstrumentSans-Regular.ttf",
    "InstrumentSans-Medium.ttf",
  ].map((name) => path.join(dir, name));
  for (const file of fontFiles) readFileSync(file);
  return fontFiles;
}

export function renderPrintPng(spec: DesignSpec): Buffer {
  const svg = designSvg(spec);
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: PRINT_W },
    font: {
      fontFiles: fonts(),
      loadSystemFonts: false,
      defaultFontFamily: "Instrument Serif",
    },
    shapeRendering: 2,
    textRendering: 1,
  });
  return Buffer.from(resvg.render().asPng());
}
