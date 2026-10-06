import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";
import { buildSvg, PRINT_W } from "./design.js";

const fontDir = fileURLToPath(new URL("../fonts/", import.meta.url));
const fontFiles = readdirSync(fontDir)
  .filter((name) => /\.(woff|ttf|otf)$/i.test(name))
  .map((name) => join(fontDir, name));

if (!fontFiles.length) {
  throw new Error("No font files found in /fonts");
}

for (const file of fontFiles) {
  readFileSync(file);
}

const cache = new Map();

export function renderPng(spec, width = PRINT_W) {
  const key = JSON.stringify({ spec, width });
  if (cache.has(key)) return cache.get(key);
  const svg = buildSvg(spec);
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: width },
    font: {
      fontFiles,
      loadSystemFonts: false,
      defaultFontFamily: "Cormorant Garamond",
    },
    shapeRendering: 2,
    textRendering: 1,
    imageRendering: 0,
  });
  const png = resvg.render().asPng();
  if (cache.size > 40) {
    const oldest = cache.keys().next().value;
    cache.delete(oldest);
  }
  cache.set(key, png);
  return png;
}
