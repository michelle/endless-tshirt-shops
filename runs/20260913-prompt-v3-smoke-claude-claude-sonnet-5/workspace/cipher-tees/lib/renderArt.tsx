import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import fs from "node:fs";
import path from "node:path";
import DesignArt from "@/components/DesignArt";
import type { DesignSpec } from "./types";

// Print-file rasterizer. Runs server-side only (Node runtime — resvg has a
// native binary and satori needs real font bytes, neither works on Edge).
//
// Fonts are read from the filesystem with a statically-analyzable literal
// path so Next's build tracer (@vercel/nft) bundles them into the
// serverless function output automatically.

let fontCache: { regular: Buffer; bold: Buffer } | null = null;

function loadFonts() {
  if (fontCache) return fontCache;
  const dir = path.join(process.cwd(), "public", "fonts");
  fontCache = {
    regular: fs.readFileSync(path.join(dir, "SpaceMono-Regular.ttf")),
    bold: fs.readFileSync(path.join(dir, "SpaceMono-Bold.ttf")),
  };
  return fontCache;
}

// Matches the aspect ratio of Prodigi's GLOBAL-TEE-GIL-64000 front print
// area (4665x5844 ≈ 0.798) at a print-quality resolution.
export const PRINT_WIDTH = 3000;
export const PRINT_HEIGHT = 3760;

export async function renderArtPng(spec: DesignSpec): Promise<Buffer> {
  const fonts = loadFonts();
  const svg = await satori(
    <DesignArt spec={spec} width={PRINT_WIDTH} height={PRINT_HEIGHT} />,
    {
      width: PRINT_WIDTH,
      height: PRINT_HEIGHT,
      fonts: [
        { name: "Space Mono", data: fonts.regular, weight: 400, style: "normal" },
        { name: "Space Mono", data: fonts.bold, weight: 700, style: "normal" },
      ],
    }
  );
  const resvg = new Resvg(svg, { fitTo: { mode: "width", value: PRINT_WIDTH } });
  const rendered = resvg.render();
  return Buffer.from(rendered.asPng());
}
