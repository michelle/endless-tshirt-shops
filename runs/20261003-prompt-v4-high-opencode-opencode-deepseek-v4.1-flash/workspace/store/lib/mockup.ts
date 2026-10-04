// Composes the shirt mockup with the generated design for a realistic preview.
import { buildDesignSvg, type DesignParams } from './design-svg';
import { getShirt } from './theme';
import {
  COLLAR_PATH,
  DESIGN_BOX,
  FOLD_PATHS,
  SHIRT_PATH,
  SHIRT_VIEWBOX,
  isLightColor,
  stripSvgWrapper,
} from './shirt';
import { outlineTextRenderer } from './text-outline';
import { rasterizeSvg } from './rasterize';

export function buildMockupSvg(params: DesignParams): string {
  const design = buildDesignSvg(params, outlineTextRenderer);
  const inner = stripSvgWrapper(design);
  const color = getShirt(params.shirt).hex;
  const light = isLightColor(color);
  const stroke = light ? 'rgba(0,0,0,0.22)' : 'rgba(255,255,255,0.16)';
  const shade = light ? 'rgba(0,0,0,0.10)' : 'rgba(0,0,0,0.55)';
  const highlight = light ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.07)';
  const b = DESIGN_BOX;
  const folds = FOLD_PATHS.map(
    (d, i) => `<path d="${d}" fill="none" stroke="${shade}" stroke-width="${i < 2 ? 6 : 5}" opacity="${i < 2 ? 0.24 : 0.2}" stroke-linecap="round"/>`,
  ).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="600" height="700" viewBox="${SHIRT_VIEWBOX}">
  <defs>
    <linearGradient id="fabric" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${highlight}"/>
      <stop offset="45%" stop-color="rgba(0,0,0,0)"/>
      <stop offset="100%" stop-color="${shade}"/>
    </linearGradient>
    <radialGradient id="fabricShade" cx="50%" cy="34%" r="72%">
      <stop offset="0%" stop-color="rgba(255,255,255,0.10)"/>
      <stop offset="60%" stop-color="rgba(0,0,0,0)"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0.35)"/>
    </radialGradient>
    <clipPath id="shirtClip"><path d="${SHIRT_PATH}"/></clipPath>
  </defs>
  <rect width="600" height="700" fill="#0a0c12"/>
  <path d="${SHIRT_PATH}" fill="${color}" stroke="${stroke}" stroke-width="2.5"/>
  <g clip-path="url(#shirtClip)">
    <g transform="translate(${b.x} ${b.y}) scale(${(b.width / 4677).toFixed(6)} ${(b.height / 5787).toFixed(6)})">
      ${inner}
    </g>
  </g>
  <path d="${SHIRT_PATH}" fill="url(#fabric)"/>
  <path d="${SHIRT_PATH}" fill="url(#fabricShade)"/>
  <path d="${COLLAR_PATH}" fill="none" stroke="${stroke}" stroke-width="9" stroke-linecap="round" opacity="0.55"/>
  ${folds}
</svg>`;
}

export async function renderMockupPng(params: DesignParams, width = 900): Promise<Buffer> {
  return rasterizeSvg(buildMockupSvg(params), width);
}
