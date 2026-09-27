/**
 * Local design iteration tool: rasterizes sample artwork to PNGs in preview/.
 * Not part of the deployed app.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Resvg } from "@resvg/resvg-js";
import { buildArtworkSvg } from "../src/lib/design";
import type { DesignSpec } from "../src/lib/params";

const fontDir = join(process.cwd(), "public/fonts/static");
const fontFiles = [
  "CormorantGaramond-Light.ttf",
  "CormorantGaramond-Medium.ttf",
  "CormorantGaramond-SemiBold.ttf",
  "CormorantGaramond-RegularItalic.ttf",
  "CormorantGaramond-MediumItalic.ttf",
  "IBMPlexSans-Regular.ttf",
  "IBMPlexSans-Medium.ttf",
  "IBMPlexSans-SemiBold.ttf",
].map((f) => join(fontDir, f));

export function renderPng(svg: string): Buffer {
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: 4677 },
    font: { fontFiles, loadSystemFonts: false },
  });
  return resvg.render().asPng();
}

const SAMPLES: (DesignSpec & { file: string })[] = [
  { file: "full-black", date: "2026-01-03", hemisphere: "N", garment: "black", line: "for Mira" },
  { file: "waxing-crescent-black", date: "1994-04-11", hemisphere: "N", garment: "black" },
  { file: "first-quarter-navy", date: "2026-09-05", time: "22:41", hemisphere: "N", garment: "navy", line: "Berlin" },
  { file: "gibbous-cream", date: "1971-07-20", hemisphere: "S", garment: "cream" },
  { file: "new-moon-black", date: "2026-09-11", hemisphere: "N", garment: "black" },
];

mkdirSync("preview", { recursive: true });
for (const s of SAMPLES) {
  const { file, ...spec } = s;
  const svg = buildArtworkSvg(spec);
  const png = renderPng(svg);
  const out = join("preview", `${file}.png`);
  writeFileSync(out, png);
  console.log(file, png.length, "bytes ->", out);
}
