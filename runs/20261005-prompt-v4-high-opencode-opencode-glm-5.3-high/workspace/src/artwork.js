// Server-side print-file generation. The exact same renderDesign() code draws
// the customer's browser preview and this 300-dpi print file.
import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { renderDesign, PRINT } from "./render.js";

GlobalFonts.registerFromPath("fonts/Cinzel.ttf", "Cinzel");
GlobalFonts.registerFromPath("fonts/Jost.ttf", "Jost");

const stardata = {
  stars: JSON.parse(readFileSync("data/stars.json", "utf8")),
  lines: JSON.parse(readFileSync("data/lines.json", "utf8")),
};

export function renderFor(order) {
  const opts = {
    width: PRINT.w,
    height: PRINT.h,
    color: order.product.color,
    title: order.design.title,
    message: order.design.message,
    place: order.design.place,
    dateStr: order.design.dateStr,
    timeStr: order.design.timeStr,
    tz: order.design.tz,
    lat: order.design.lat,
    lon: order.design.lon,
    showLines: order.design.showLines !== false,
    stardata,
  };
  const canvas = createCanvas(PRINT.w, PRINT.h);
  renderDesign(canvas.getContext("2d"), opts);
  const png = canvas.toBuffer("image/png");

  const PW = 880, PH = Math.round((880 * PRINT.h) / PRINT.w);
  const previewCanvas = createCanvas(PW, PH);
  renderDesign(previewCanvas.getContext("2d"), { ...opts, width: PW, height: PH });
  const preview = previewCanvas.toBuffer("image/png");

  return {
    png,
    md5: createHash("md5").update(png).digest("hex"),
    preview,
    width: PRINT.w,
    height: PRINT.h,
  };
}
