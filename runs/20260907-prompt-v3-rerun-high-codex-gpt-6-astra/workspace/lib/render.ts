import sharp, { type OverlayOptions } from "sharp";
import path from "node:path";
import { readFileSync } from "node:fs";
import * as opentype from "opentype.js";
import { palettes, type Design } from "./design";
let font: opentype.Font;
function getFont() {
  if (!font) {
    const data = readFileSync(
      path.join(process.cwd(), "public/assets/PrintLettering.ttf"),
    );
    font = opentype.parse(
      data.buffer.slice(
        data.byteOffset,
        data.byteOffset + data.byteLength,
      ) as ArrayBuffer,
    );
    delete font.tables.gsub;
  }
  return font;
}
function pathData(shape: opentype.Path) {
  return shape.commands
    .map((c) => {
      const keys =
        c.type === "C"
          ? ["x1", "y1", "x2", "y2", "x", "y"]
          : c.type === "Q"
            ? ["x1", "y1", "x", "y"]
            : c.type === "Z"
              ? []
              : ["x", "y"];
      return (
        c.type +
        keys
          .map((k) => {
            const v = (c as unknown as Record<string, number>)[k];
            if (!Number.isFinite(v)) throw new Error("Invalid glyph");
            return v.toFixed(3);
          })
          .join(" ")
      );
    })
    .join(" ");
}
export async function renderDesign(design: Design, width: number) {
  const scale = width / 1200,
    height = Math.round((width * 5881) / 4677),
    p = palettes[design.palette];
  const s = (n: number) => Math.round(n * scale);
  const layers: OverlayOptions[] = [];
  const line = async (
    text: string,
    top: number,
    w: number,
    h: number,
    color = p.ink,
  ) => {
    const shape = getFont().getPath(text, 0, 0, 100);
    const box = shape.getBoundingBox();
    const factor = Math.min(s(w) / (box.x2 - box.x1), s(h) / (box.y2 - box.y1));
    const input = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${s(h) + 2}"><g transform="translate(${(width - (box.x2 - box.x1) * factor) / 2},0) scale(${factor}) translate(${-box.x1},${-box.y1})" fill="${color}"><path d="${pathData(shape)}"/></g></svg>`,
    );
    layers.push({ input, left: 0, top: s(top) });
  };
  await line("FIELD NOTES CLUB  /  PERSONAL PARK", 65, 760, 30);
  await line(design.place.toUpperCase(), 132, 1050, 128);
  await line(
    design.name.toUpperCase() + "  •  EST. " + design.year,
    294,
    980,
    43,
  );
  const art = await sharp(
    path.join(process.cwd(), "public/assets/landscape.png"),
  )
    .resize(s(1070), s(850), { fit: "cover", position: "centre" })
    .modulate({ hue: p.hue })
    .png()
    .toBuffer();
  layers.push({ input: art, left: s(65), top: s(395) });
  await line(design.phrase.toUpperCase(), 1299, 1020, 54);
  await line("A PLACE TO CALL YOUR OWN", 1410, 740, 25);
  return sharp({ create: { width, height, channels: 4, background: p.paper } })
    .composite(layers)
    .withMetadata({ density: 300 })
    .png({ compressionLevel: 9 })
    .toBuffer();
}
