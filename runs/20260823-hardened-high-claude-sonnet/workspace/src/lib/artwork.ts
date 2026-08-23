import "server-only";
import { readFileSync } from "fs";
import path from "path";
import { Resvg } from "@resvg/resvg-js";
import type { ShirtStyle } from "./product";
import { shirtDesignSvg } from "./design";

let cachedFontPaths: string[] | null = null;

function getFontPaths(): string[] {
  if (cachedFontPaths) return cachedFontPaths;
  const dir = path.join(process.cwd(), "src", "lib", "fonts");
  const paths = [
    path.join(dir, "Chivo-Variable.ttf"),
    path.join(dir, "ChivoMono-Variable.ttf"),
  ];
  // Fail fast if fonts are missing from the deployment bundle.
  for (const p of paths) readFileSync(p);
  cachedFontPaths = paths;
  return paths;
}

/** Renders the on-shirt design to a PNG buffer suitable for upload to the print API. */
export function renderArtworkPng(date: Date, style: ShirtStyle): Buffer {
  const svg = shirtDesignSvg(date, style);
  const resvg = new Resvg(svg, {
    font: {
      loadSystemFonts: false,
      fontFiles: getFontPaths(),
      defaultFontFamily: "Chivo",
    },
    background: "#101014",
  });
  return resvg.render().asPng();
}
