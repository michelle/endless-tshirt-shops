// Render the SVG produced by `skygen` to a PNG buffer using sharp.
//
// Prodigi's optimal front-print area for `GLOBAL-TEE-BC-3001` is 4677 x 5787
// px at 300dpi which is far bigger than we need to prove the design renders
// correctly. We render at 3500 x 4422 px (75% of optimal) which keeps the
// serverless function responsive while still printing crisp detail.

import sharp from "sharp";
import { buildSkySvg } from "./skygen";
import type { SkyInput, ShirtSpec } from "./design";

const RENDER_W = 3500;
const RENDER_H = 4424;

export async function renderDesignPng(
  sky: SkyInput,
  publicBaseUrl: string,
): Promise<Buffer> {
  const { svg } = buildSkySvg(sky, publicBaseUrl);
  return sharp(Buffer.from(svg))
    .resize(RENDER_W, RENDER_H, { fit: "fill" })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

export async function renderDesignSvg(
  sky: SkyInput,
  publicBaseUrl?: string,
): Promise<string> {
  return buildSkySvg(sky, publicBaseUrl).svg;
}

/** A tiny helper used by the order page to know what we actually rendered. */
export function describeDesign(sky: SkyInput, shirt: ShirtSpec) {
  return {
    ...sky,
    shirt,
    canvas: { width: RENDER_W, height: RENDER_H },
  };
}
