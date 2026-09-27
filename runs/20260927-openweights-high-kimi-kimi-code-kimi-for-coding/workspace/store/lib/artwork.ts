// Server-only artwork rendering (native resvg + embedded OFL fonts).
import fs from "fs";
import path from "path";
import { Resvg } from "@resvg/resvg-js";
import { PLAYFAIR_400, PLAYFAIR_700, PLAYFAIR_ITALIC } from "./fonts-data";
import { buildArtworkSvg } from "./artwork-svg";

export { buildArtworkSvg, buildMockupSvg, artworkQueryString } from "./artwork-svg";

const RENDER_W = 3510; // ~225dpi effective, plenty for DTG

let fontPaths: string[] | null = null;
function getFontPaths(): string[] {
  if (fontPaths) return fontPaths;
  const dir = path.join("/tmp", "definingme-fonts");
  fs.mkdirSync(dir, { recursive: true });
  const files: Array<[string, Buffer]> = [
    ["playfair-400.ttf", PLAYFAIR_400],
    ["playfair-700.ttf", PLAYFAIR_700],
    ["playfair-italic.ttf", PLAYFAIR_ITALIC],
  ];
  fontPaths = files.map(([name, buf]) => {
    const p = path.join(dir, name);
    if (!fs.existsSync(p)) fs.writeFileSync(p, buf);
    return p;
  });
  return fontPaths;
}

export function renderArtworkPng(svg: string): Buffer {
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: RENDER_W },
    background: "rgba(0,0,0,0)",
    font: {
      fontFiles: getFontPaths(),
      loadSystemFonts: false,
      defaultFontFamily: "Playfair Display",
    },
    logLevel: "error",
  });
  return resvg.render().asPng();
}
