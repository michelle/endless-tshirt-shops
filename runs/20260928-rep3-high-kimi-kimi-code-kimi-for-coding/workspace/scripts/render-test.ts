// Renders sample designs for visual inspection.
// Run: node scripts/render-test.mjs  (after `node_modules/.bin/esbuild` exists)
import { buildDesignSvg, PRINT_W, PRINT_H } from "../lib/design.ts";
import { renderSvgToPng } from "../lib/render.ts";
import fs from "node:fs";

const scenarios = [
  {
    name: "reykjavik-night",
    p: { placeLabel: "Reykjavík, Iceland", lat: 64.1466, lon: -21.9426, timeMs: Date.parse("2021-12-24T23:45:00Z"), tz: "Atlantic/Reykjavik", caption: "the night we said yes", dark: true },
  },
  {
    name: "nyc-golden",
    p: { placeLabel: "New York, USA", lat: 40.7128, lon: -74.006, timeMs: Date.parse("2023-07-15T00:10:00Z"), tz: "America/New_York", caption: "where we met", dark: true },
  },
  {
    name: "sydney-day",
    p: { placeLabel: "Sydney, Australia", lat: -33.8688, lon: 151.2093, timeMs: Date.parse("2019-11-02T02:30:00Z"), tz: "Australia/Sydney", caption: "she said hello at noon", dark: false },
  },
  {
    name: "paris-day-darkshirt",
    p: { placeLabel: "Paris, France", lat: 48.8566, lon: 2.3522, timeMs: Date.parse("2024-05-01T13:00:00Z"), tz: "Europe/Paris", caption: "our first morning", dark: true },
  },
];

for (const { name, p } of scenarios) {
  const svg = buildDesignSvg(p);
  fs.writeFileSync(`/tmp/design-${name}.svg`, svg);
  const bg = p.dark ? "#22222a" : "#e8e4da";
  const png = renderSvgToPng(svg, 0.32, bg); // small, composited on shirt-ish background
  fs.writeFileSync(`/tmp/design-${name}.png`, png);
  console.log(name, (png.length / 1024).toFixed(0) + "KB", `${PRINT_W}x${PRINT_H}`);
}

// full-size render for byte-size measurement
const full = renderSvgToPng(buildDesignSvg(scenarios[0].p), 1);
fs.writeFileSync("/tmp/design-full.png", full);
console.log("full-size night PNG:", (full.length / 1024 / 1024).toFixed(2) + "MB");
const full2 = renderSvgToPng(buildDesignSvg(scenarios[2].p), 1);
console.log("full-size day PNG:", (full2.length / 1024 / 1024).toFixed(2) + "MB");
