import { Resvg } from "@resvg/resvg-js";
import fs from "node:fs";
import { buildDesignSVG, buildMockupSVG } from "../src/lib/render";
import { designSchema, encodeDesign, decodeDesign } from "../src/lib/design";
import { skySnapshot } from "../src/lib/astro";

const cases = [
  { date: "1994-06-14", name: "Amelia", subtitle: "Lisbon, Portugal", shirt: "black", accent: "gold", style: "classic", size: "m" },
  { date: "2000-01-01", name: "The day we met", subtitle: "", shirt: "white", accent: "coral", style: "annotated", size: "l" },
  { date: "2026-10-03", name: "Theodore James Whitfield", subtitle: "7 lb 4 oz · 03:14 AM", shirt: "navy blue", accent: "mint", style: "minimal", size: "s" },
];
for (const [i, c] of cases.entries()) {
  const d = designSchema.parse(c);
  const tok = encodeDesign(d);
  console.log("token", tok.length, JSON.stringify(decodeDesign(tok)) === JSON.stringify(d) ? "roundtrip ok" : "ROUNDTRIP MISMATCH");
  const sky = skySnapshot(d.date);
  console.log(d.date, sky.planets.map(p => `${p.id}:${p.longitude.toFixed(1)}`).join(" "), "moon", sky.moon.name, sky.moon.phase.toFixed(1));
  let t = Date.now();
  const svg = buildDesignSVG(d, { background: true });
  const png = new Resvg(svg, { fitTo: { mode: "width", value: 1000 } }).render().asPng();
  fs.writeFileSync(`tmp/design-${i}.png`, png);
  console.log(" preview png", png.length, "bytes", Date.now() - t, "ms");
  const mock = new Resvg(buildMockupSVG(d), { fitTo: { mode: "width", value: 900 } }).render().asPng();
  fs.writeFileSync(`tmp/mock-${i}.png`, mock);
  if (i === 0) {
    t = Date.now();
    const full = new Resvg(buildDesignSVG(d), { fitTo: { mode: "width", value: 4680 } }).render();
    console.log(" full render", full.width, "x", full.height, Date.now() - t, "ms");
    t = Date.now();
    const fullPng = full.asPng();
    fs.writeFileSync(`tmp/print-${i}.png`, fullPng);
    console.log(" full png encode", fullPng.length, "bytes", Date.now() - t, "ms");
  }
}
