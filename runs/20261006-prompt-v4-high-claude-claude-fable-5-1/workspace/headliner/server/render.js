import { Resvg } from '@resvg/resvg-js';
import { FONT_FILES, PRINT_W } from './design.js';

export function svgToPng(svg, width = PRINT_W) {
  const r = new Resvg(svg, {
    fitTo: { mode: 'width', value: width },
    font: { fontFiles: FONT_FILES, loadSystemFonts: false, defaultFontFamily: 'Bebas Neue' },
    shapeRendering: 2,
    textRendering: 2,
    imageRendering: 0,
  });
  return r.render().asPng();
}
