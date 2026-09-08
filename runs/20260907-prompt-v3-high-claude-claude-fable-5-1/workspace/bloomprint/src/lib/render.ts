import "server-only";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Resvg } from "@resvg/resvg-js";
import * as embedded from "@/fonts/embedded";
import { generatePlantSvg, PlantInput, VIEW_W } from "./botanical/generator";

/** Print resolution of the Bella+Canvas 3001 front print area (Prodigi). */
export const PRINT_WIDTH = 4680;
export const PREVIEW_WIDTH = 900;

let fontFiles: string[] | null = null;

/** Fonts are embedded in the bundle and written once to tmp so resvg can load them. */
function ensureFonts(): string[] {
  if (fontFiles) return fontFiles;
  const dir = path.join(os.tmpdir(), "bloomprint-fonts");
  fs.mkdirSync(dir, { recursive: true });
  const files: string[] = [];
  for (const [name, b64] of Object.entries(embedded)) {
    const file = path.join(dir, `CormorantGaramond-${name}.ttf`);
    if (!fs.existsSync(file)) fs.writeFileSync(file, Buffer.from(b64, "base64"));
    files.push(file);
  }
  fontFiles = files;
  return files;
}

export function renderPlantPng(input: PlantInput, width: number): Buffer {
  const { svg } = generatePlantSvg(input);
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: width },
    font: { fontFiles: ensureFonts(), loadSystemFonts: false, defaultFontFamily: "Cormorant Garamond" },
    background: "rgba(0,0,0,0)",
    shapeRendering: 2,
    textRendering: 2,
    imageRendering: 0,
    dpi: Math.round((300 * width) / PRINT_WIDTH * (PRINT_WIDTH / VIEW_W)),
  });
  return Buffer.from(resvg.render().asPng());
}
