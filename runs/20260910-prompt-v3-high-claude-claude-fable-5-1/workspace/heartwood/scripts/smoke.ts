import { writeFileSync } from "node:fs";
import { parseDesign, renderRings } from "../lib/rings";
import { renderPrintPng, renderPreviewPng } from "../lib/render";
import { signDesign, verifyDesignToken } from "../lib/token";

process.env.DESIGN_SECRET ||= "smoke";
const d = parseDesign({
  name: "Michelle",
  born: "1988-04-12",
  milestones: [
    { year: 2006, label: "Left for college" },
    { year: 2011, label: "Met Sam" },
    { year: 2015, label: "Moved to Portland" },
    { year: 2019, label: "Juniper was born" },
    { year: 2023, label: "First marathon" },
  ],
  palette: process.argv[2] || "oak",
  grain: "classic",
});
const t0 = Date.now();
const r = renderRings(d, { onDark: true });
writeFileSync("/tmp/hw-preview.svg", r.svg);
console.log("rings", r.rings, "svg bytes", r.svg.length, "ms", Date.now() - t0);
const t1 = Date.now();
const prev = renderPreviewPng(d, "#1b1b1d", true, 720);
writeFileSync("/tmp/hw-preview.png", prev);
console.log("preview png bytes", prev.length, "ms", Date.now() - t1);
const t2 = Date.now();
const png = renderPrintPng(d, true);
writeFileSync("/tmp/hw-print.png", png);
console.log("print png bytes", png.length, "ms", Date.now() - t2);
const tok = signDesign(d);
console.log("token len", tok.length, "roundtrip ok", verifyDesignToken(tok).name === d.name);
