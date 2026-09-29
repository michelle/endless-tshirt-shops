// Renders shirt mockup previews for visual inspection.
import { buildDesignSvg } from "../lib/design.ts";
import { buildShirtSvg, SHIRT_COLORS } from "../lib/preview.ts";
import { renderSvgToPng } from "../lib/render.ts";
import fs from "node:fs";

const p = { placeLabel: "Reykjavík, Iceland", lat: 64.1466, lon: -21.9426, timeMs: Date.parse("2021-12-24T23:45:00Z"), tz: "Atlantic/Reykjavik", caption: "the night we said yes", dark: true };
const artwork = renderSvgToPng(buildDesignSvg(p), 0.22).toString("base64");

for (const c of SHIRT_COLORS) {
  const svg = buildShirtSvg(artwork, c.hex);
  const png = renderSvgToPng(svg, 1, "#f0efec");
  fs.writeFileSync(`/tmp/shirt-${c.prodigi.replace(/\s+/g, "-")}.png`, png);
}
console.log("done", SHIRT_COLORS.length);
