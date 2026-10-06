import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import { readFileSync } from "node:fs";
import { renderDesign, PRINT } from "../src/render.js";

GlobalFonts.registerFromPath("fonts/Cinzel.ttf", "Cinzel");
GlobalFonts.registerFromPath("fonts/Jost.ttf", "Jost");
const stardata = {
  stars: JSON.parse(readFileSync("data/stars.json", "utf8")),
  lines: JSON.parse(readFileSync("data/lines.json", "utf8")),
};
const base = {
  place: "Manarola, Italy", dateStr: "2021-06-14", timeStr: "21:34",
  tz: "Europe/Paris", lat: 48.8566, lon: 2.3522, showLines: true,
};

// 1. Edge cases must render without throwing
const cases = [
  { ...base, title: "", message: "", color: "black" }, // minimal
  { ...base, title: "OUR WEDDING NIGHT IN MANAROLA", message: "you are my universe, my love", color: "navy blue" }, // max lengths
  { ...base, title: "THE NIGHT WE MET", message: "", place: "A VERY VERY LONG PLACE NAME SOMEWHERE ON EARTH XXXXXXXXX", color: "white" },
  { ...base, title: "A", message: "x", place: "A", dateStr: "1999-12-31", timeStr: "23:59", tz: "Pacific/Kiritimati", lat: 1.87, lon: -157.4, color: "black" },
];
for (const c of cases) {
  const small = createCanvas(400, Math.round(400 * PRINT.h / PRINT.w));
  renderDesign(small.getContext("2d"), { ...c, width: 400, height: small.height, stardata });
  console.log("render OK:", JSON.stringify(c.title), c.place?.slice(0, 20));
}

// 2. Text metrics at full print size: longest strings must fit within margins
const canvas = createCanvas(PRINT.w, PRINT.h);
const ctx = canvas.getContext("2d");
const measure = (text, fontPx, font, spacingEm) => {
  ctx.font = `400 ${fontPx}px ${font}`;
  const spacing = fontPx * spacingEm;
  let w = 0;
  for (const ch of text) w += ctx.measureText(ch).width + spacing;
  return w - spacing;
};
const maxTitle = "OUR WEDDING NIGHT IN MANAROLA"; // 28 chars ~ max 30
console.log("title width px:", Math.round(measure(maxTitle, 196, "Cinzel", 0.26)), "max allowed:", Math.round(PRINT.w * 0.82));
console.log("sub width px:", Math.round(measure("A VERY VERY LONG PLACE NAME SOMEWHERE ON EARTH X · 14 JUNE 2021 · 21:34", 112, "Jost", 0.16)), "canvas:", PRINT.w);

// 3. Full-res render of longest case + PNG integrity + ink coverage sanity
const t0 = Date.now();
renderDesign(ctx, { ...cases[1], width: PRINT.w, height: PRINT.h, stardata });
const buf = canvas.toBuffer("image/png");
console.log("full render:", `${Date.now() - t0}ms`, (buf.length / 1048576).toFixed(2) + "MB",
  buf[0] === 0x89 && buf[1] === 0x50 ? "PNG magic OK" : "NOT A PNG!");
const data = ctx.getImageData(0, 0, PRINT.w, PRINT.h).data;
let opaque = 0;
for (let i = 3; i < data.length; i += 400) if (data[i] > 16) opaque++;
console.log("inked-pixel sample fraction:", (opaque / (data.length / 400)).toFixed(3), "(transparent shirt shows through elsewhere — DTG friendly)");
