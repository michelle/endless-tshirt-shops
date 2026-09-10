// Server-side rasteriser. The browser previews the very same SVG string, so
// what a customer approves is what the press receives.

import path from 'node:path';
import { buildSpecimen } from './species';
import { plateSvg, CANVAS_W, CANVAS_H } from './draw/plate';
import { COLOR_BY_ID } from './catalog';
import type { Design } from './design';

const FONT_FILES = [
  'EBGaramond-Regular.ttf',
  'EBGaramond-Italic.ttf',
  'CourierPrime-Regular.ttf',
  'CourierPrime-Bold.ttf',
].map((f) => path.join(process.cwd(), 'fonts', f));

export function svgForDesign(
  design: Design,
  opts: { withGarment?: boolean; outWidth?: number; outHeight?: number } = {},
): string {
  const specimen = buildSpecimen({
    name: design.n,
    date: design.d,
    place: design.p,
    paletteId: design.pal,
  });
  const colour = COLOR_BY_ID[design.col];
  return plateSvg(specimen, {
    dark: !!colour?.dark,
    garmentHex: opts.withGarment ? colour?.hex : undefined,
    outWidth: opts.outWidth,
    outHeight: opts.outHeight,
  });
}

export type RenderOpts = {
  /** Output width in pixels. 4665 is the full 300-dpi Gildan 64000 print area. */
  width?: number;
  withGarment?: boolean;
};

export async function renderPng(design: Design, opts: RenderOpts = {}): Promise<Buffer> {
  const { Resvg } = await import('@resvg/resvg-js');
  const width = opts.width ?? CANVAS_W;
  // At full size we pin both dimensions to the press's print area exactly.
  const height = width === PRINT_WIDTH
    ? PRINT_HEIGHT
    : Math.round((width * CANVAS_H) / CANVAS_W);
  const svg = svgForDesign(design, {
    withGarment: opts.withGarment,
    outWidth: width,
    outHeight: height,
  });
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'original' },
    background: opts.withGarment ? undefined : 'rgba(0,0,0,0)',
    font: {
      fontFiles: FONT_FILES,
      loadSystemFonts: false,
      defaultFontFamily: 'EB Garamond',
    },
  });
  return Buffer.from(resvg.render().asPng());
}

export const PRINT_WIDTH = 4665;
export const PRINT_HEIGHT = 5844;
export { CANVAS_W, CANVAS_H };
