/**
 * Renders example print files into out/ using the exact production code
 * path (lib/render.ts). Run via scripts/preview-print.mjs.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseDesignInput, printFileName, weekStats } from "../lib/design";
import { renderPrintPNG } from "../lib/render";
import { md5 } from "../lib/sign";

const examples = [
  { name: "June Carter", born: "1992-06-12", caption: "Make every week count", shirt: "black", size: "m", accent: "ember", qty: 1, asof: "2026-09-28" },
  { name: "Otto Wehrle", born: "1946-02-14", caption: "Still counting", shirt: "natural", size: "xl", accent: "cobalt", qty: 1, asof: "2026-09-28" },
  { name: "Aiko Tanaka", born: "2001-11-30", caption: "", shirt: "navy", size: "s", accent: "gold", qty: 2, asof: "2026-09-28" },
  { name: "Maximilian Fewdot", born: "2026-09-01", caption: "Week one", shirt: "white", size: "m", accent: "teal", qty: 1, asof: "2026-09-28" },
];

const outDir = process.argv[2] ?? "out";
mkdirSync(outDir, { recursive: true });

for (const ex of examples) {
  const design = parseDesignInput(ex);
  if (!design) {
    console.error(`INVALID example: ${JSON.stringify(ex)}`);
    process.exitCode = 1;
    continue;
  }
  const png = renderPrintPNG(design);
  const file = path.join(outDir, printFileName(design));
  writeFileSync(file, png);
  console.log(
    `${file}  ${png.length} bytes  md5=${md5(png)}  weeks=${weekStats(design).lived}`
  );
}
