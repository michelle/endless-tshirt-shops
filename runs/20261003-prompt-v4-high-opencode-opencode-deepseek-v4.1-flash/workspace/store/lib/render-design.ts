// Server-only renderer: SVG -> print-ready PNG (platform-independent WASM).
import { buildDesignSvg, type DesignParams } from './design-svg';
import { outlineTextRenderer } from './text-outline';
import { rasterizeSvg } from './rasterize';
import { PRINT_EXPORT_WIDTH } from './theme';

export async function buildDesignSvgString(params: DesignParams): Promise<string> {
  return buildDesignSvg(params, outlineTextRenderer);
}

export async function renderDesignPng(params: DesignParams): Promise<Buffer> {
  const svg = await buildDesignSvgString(params);
  return rasterizeSvg(svg, PRINT_EXPORT_WIDTH);
}

/** Small PNG for previews / OG images. */
export async function renderDesignPreview(params: DesignParams, width = 1000): Promise<Buffer> {
  const svg = await buildDesignSvgString(params);
  return rasterizeSvg(svg, width);
}
