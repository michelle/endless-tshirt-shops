#!/usr/bin/env node
/**
 * Local visual QA: bundle the shared chart library with esbuild, render a
 * sample spec to SVG + PNG, and write them to /tmp for inspection.
 *
 *   node scripts/render-sample.mjs ["navy blue"|"white"] [out.json-of-spec]
 */
import { build } from "esbuild";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const tmp = "/tmp/skyborn-qa";
mkdirSync(tmp, { recursive: true });

// 1. bundle the browser-safe library (no next/react imports)
await build({
  entryPoints: [path.join(root, "src/lib/starmap.ts")],
  bundle: true,
  format: "esm",
  platform: "node",
  outfile: path.join(tmp, "starmap.mjs"),
  logLevel: "silent",
});

const { starmapSvg } = await import(path.join(tmp, "starmap.mjs"));

const spec = process.argv[3] && process.argv[3].endsWith(".json")
  ? JSON.parse(readFileSync(process.argv[3], "utf8"))
  : {
      v: 1,
      date: process.argv[3] ? JSON.parse(process.argv[3]).date : "1990-07-20",
      time: "22:30",
      tz: "America/New_York",
      lat: 40.713,
      lng: -74.006,
      place: "New York, United States",
      name: "Elowen Grace",
      title: "The Night You Were Born",
      message: "For Elowen — with all our love",
      color: process.argv[2] ?? "navy blue",
      size: "m",
    };

const svg = starmapSvg(spec);
const color = (spec.color ?? "navy").replace(/[^a-z0-9]/g, "");
writeFileSync(path.join(tmp, `sample-${color}.svg`), svg);
console.log("wrote", path.join(tmp, `sample-${color}.svg`), `(${(svg.length / 1024).toFixed(0)} KB)`);

// 2. rasterize with the same wasm renderer the API route uses
const require = createRequire(import.meta.url);
const { initWasm, Resvg } = require("@resvg/resvg-wasm");
const wasm = readFileSync(path.join(root, "node_modules/@resvg/resvg-wasm/index_bg.wasm"));
await initWasm(wasm);
const fontFiles = ["Cinzel-400.ttf", "Cinzel-600.ttf", "CormorantGaramond-500.ttf",
  "CormorantGaramond-500i.ttf", "CormorantGaramond-600.ttf"]
  .map(f => readFileSync(path.join(root, "src/lib/assets/fonts", f)));
const resvg = new Resvg(svg, {
  fitTo: { mode: "width", value: 1240 },
  font: {
    fontBuffers: fontFiles.map(b => new Uint8Array(b)),
    loadSystemFonts: false,
    defaultFontFamily: "Cinzel",
  },
  background: process.env.QA_BG ?? undefined,
});
const png = resvg.render().asPng();
writeFileSync(path.join(tmp, `sample-${color}.png`), png);
console.log("wrote", path.join(tmp, `sample-${color}.png`), `(${(png.length / 1024).toFixed(0)} KB)`);
