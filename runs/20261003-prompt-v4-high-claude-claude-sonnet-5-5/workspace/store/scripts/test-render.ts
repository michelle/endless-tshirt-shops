import sharp from "sharp";
import fs from "node:fs";
import { renderDesignSvg, renderMockupSvg } from "../src/lib/sky";
import { parseDesign } from "../src/lib/design";
const cases: Record<string, any> = {
  apollo: { title: "Liftoff", date: "1969-07-16", time: "09:32", place: { name: "Cape Canaveral", cc: "US", lat: 28.396, lon: -80.605, tz: "America/New_York" }, caption: "One small step", shirt: "black", ink: "moonlight", lines: true },
  night: { title: "The night we met", date: "2019-06-14", time: "21:42", place: { name: "Lisbon", cc: "PT", lat: 38.725, lon: -9.15, tz: "Europe/Lisbon" }, caption: "Mia & Jonas", shirt: "white", ink: "midnight", lines: true },
};
(async () => {
  for (const [k, c] of Object.entries(cases)) {
    const d = parseDesign(c)!; console.time(k);
    const svg = renderDesignSvg(d);
    const png = await sharp(Buffer.from(svg), { density: 72 }).png({ compressionLevel: 9 }).toBuffer();
    console.timeEnd(k); const m = await sharp(png).metadata(); console.log(k, m.width, m.height, m.hasAlpha, (png.length/1e6).toFixed(2)+"MB", (svg.length/1e3|0)+"KB svg");
    fs.writeFileSync(`/tmp/out/${k}-print.png`, png);
    // flatten on shirt colour at reduced size to eyeball
    const bg = k === "apollo" ? "#16171a" : "#f6f5f1";
    await sharp(png).resize(1000).flatten({ background: bg }).png().toFile(`/tmp/out/${k}-flat.png`);
    await sharp(Buffer.from(renderMockupSvg(d, { background: true })), { density: 72 }).resize(900).png().toFile(`/tmp/out/${k}-mock.png`);
  }
})();
