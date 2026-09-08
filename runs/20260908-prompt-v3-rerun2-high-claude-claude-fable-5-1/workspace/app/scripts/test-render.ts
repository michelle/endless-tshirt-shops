import { writeFileSync } from "node:fs";
import { Resvg } from "@resvg/resvg-js";
import path from "node:path";
import { toHorizon, lstDegrees } from "../src/lib/astro";
import { zonedTimeToUtc } from "../src/lib/timezone";
import { DEFAULT_DESIGN } from "../src/lib/design";
import { starMapSvg, computeSky } from "../src/lib/starmap";
import { renderPrintPng } from "../src/lib/render";

// 1. Polaris altitude ~= latitude
const utc = zonedTimeToUtc(DEFAULT_DESIGN.date, DEFAULT_DESIGN.time, DEFAULT_DESIGN.tz);
console.log("UTC:", new Date(utc).toISOString(), "(expect 2019-06-21T22:30Z)");
const lst = lstDegrees(utc, DEFAULT_DESIGN.lon);
const polaris = toHorizon(37.95, 89.26, DEFAULT_DESIGN.lat, lst);
console.log("Polaris alt", polaris.alt.toFixed(2), "az", polaris.az.toFixed(1), "(expect alt ~38.7, az ~0)");
const vega = toHorizon(279.23, 38.78, DEFAULT_DESIGN.lat, lst);
console.log("Vega alt", vega.alt.toFixed(1), "az", vega.az.toFixed(1), "(expect high in the east, az ~ 60-90, alt ~ 50-60)");
// J2000 check: 2000-01-01 12:00 UTC GMST = 280.46 deg
console.log("GMST J2000", lstDegrees(Date.UTC(2000, 0, 1, 12), 0).toFixed(3), "(expect 280.461)");
// DST edge check: New York 2024-03-10 02:30 (nonexistent) shouldn't throw
console.log("NY DST", new Date(zonedTimeToUtc("2024-03-10", "02:30", "America/New_York")).toISOString());
console.log("Sydney", new Date(zonedTimeToUtc("2024-01-15", "21:00", "Australia/Sydney")).toISOString(), "(expect 10:00Z)");

const sky = computeSky(DEFAULT_DESIGN);
console.log("visible stars", sky.visibleStars, "segments", sky.segments.length);

// 2. Render full print PNG and time it
const t = Date.now();
const png = renderPrintPng(DEFAULT_DESIGN);
console.log("print png bytes", png.length, "ms", Date.now() - t);
writeFileSync("/tmp/print-full.png", png);

// 3. Small preview on a black background for eyeballing
const svg = starMapSvg(DEFAULT_DESIGN, { fullCanvas: false });
const FONT_DIR = path.join(process.cwd(), "public", "fonts");
const r = new Resvg(svg, { fitTo: { mode: "width", value: 900 }, background: "#141414", font: { fontFiles: ["Marcellus-Regular.ttf","Lato-Light.ttf","Lato-Regular.ttf","Lato-Bold.ttf"].map(f=>path.join(FONT_DIR,f)), loadSystemFonts: false, defaultFontFamily: "Lato" } });
writeFileSync("/tmp/preview-dark.png", r.render().asPng());
const svg2 = starMapSvg({ ...DEFAULT_DESIGN, color: "white", title: "Born under these stars", subtitle: "Olivia Rose · 7lb 4oz", place: "Melbourne, Australia", lat: -37.8136, lon: 144.9631, tz: "Australia/Melbourne", date: "2023-11-04", time: "04:12" }, { fullCanvas: false });
const r2 = new Resvg(svg2, { fitTo: { mode: "width", value: 900 }, background: "#f7f7f5", font: { fontFiles: ["Marcellus-Regular.ttf","Lato-Light.ttf","Lato-Regular.ttf","Lato-Bold.ttf"].map(f=>path.join(FONT_DIR,f)), loadSystemFonts: false, defaultFontFamily: "Lato" } });
writeFileSync("/tmp/preview-light.png", r2.render().asPng());
console.log("svg length", svg.length);
