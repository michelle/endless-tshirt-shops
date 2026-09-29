import { Resvg } from "@resvg/resvg-js";
import path from "node:path";
import fs from "node:fs";

const FONT_DIR = path.join(process.cwd(), "assets", "fonts");
let _fontFiles: string[] | null = null;

export function fontFiles(): string[] {
  if (_fontFiles) return _fontFiles;
  try {
    _fontFiles = fs
      .readdirSync(FONT_DIR)
      .filter((f) => f.endsWith(".ttf"))
      .map((f) => path.join(FONT_DIR, f));
  } catch {
    _fontFiles = [];
  }
  return _fontFiles;
}

export function renderSvgToPng(svg: string, scale = 1, background?: string): Buffer {
  const resvg = new Resvg(svg, {
    fitTo: { mode: "zoom", value: scale },
    background,
    font: {
      fontFiles: fontFiles(),
      loadSystemFonts: false,
      defaultFontFamily: "IBM Plex Mono",
    },
    logLevel: "error",
  });
  return resvg.render().asPng();
}
