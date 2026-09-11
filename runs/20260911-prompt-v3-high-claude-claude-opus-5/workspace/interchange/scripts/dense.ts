import fs from "node:fs";
import sharp from "sharp";
import { sanitizeSpec, GARMENTS } from "../lib/spec";
import { renderFront, atPixelSize, CANVAS } from "../lib/render";

const spec = sanitizeSpec({
  title: "THE WHOLE DAMN THING",
  subtitle: "MAXIMUM SERVICE - EVERY LINE, EVERY STOP",
  motto: "this is as busy as it gets",
  garment: "black",
  variant: 0,
  lines: Array.from({ length: 4 }, (_, i) => ({
    name: ["The Long Line", "Weekend Service", "Night Bus", "Replacement Rail"][i],
    color: ["#E8453C", "#F2A93B", "#37B98A", "#9B6BE8"][i],
    stations: Array.from({ length: 9 }, (_, j) => ({
      label: ["Kennington", "Elephant & Castle", "Mum", "A Very Long Stop Name", "Bank", "Hoxton", "The Allotment", "Seven Sisters", "Home"][j],
      note: String(1990 + i * 8 + j),
      major: j === 4 && i < 2,
    })),
  })),
});

const svg = renderFront(spec);
fs.writeFileSync("out/dense.svg", svg);
sharp(Buffer.from(atPixelSize(svg, Math.round(CANVAS.w * 0.8), Math.round(CANVAS.h * 0.8))))
  .flatten({ background: GARMENTS[spec.garment].hex })
  .png()
  .toFile("out/dense.png")
  .then(() => console.log("wrote out/dense.png"));
