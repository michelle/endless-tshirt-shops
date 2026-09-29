// Server-only: rasterises the design SVG to a print-ready PNG with resvg.
// The TTFs are read from disk (they are traced into the serverless bundle via
// outputFileTracingIncludes in next.config.mjs) and handed to resvg explicitly,
// so rendering never depends on system fonts.
import path from 'node:path';
import { Resvg } from '@resvg/resvg-js';

const FONT_FILES = [
  'Cinzel-Regular.ttf',
  'Cinzel-SemiBold.ttf',
  'Cinzel-Bold.ttf',
  'CormorantGaramond-Medium.ttf',
  'CormorantGaramond-SemiBold.ttf',
  'CormorantGaramond-Italic.ttf',
  'CormorantGaramond-MediumItalic.ttf',
];

let fontCache: string[] | null = null;

function fonts(): string[] {
  if (!fontCache) {
    fontCache = FONT_FILES.map((f) =>
      path.join(process.cwd(), 'public', 'fonts', f)
    );
  }
  return fontCache;
}

export function rasterizePng(svg: string): Buffer {
  const resvg = new Resvg(svg, {
    background: 'rgba(0, 0, 0, 0)',
    font: {
      loadSystemFonts: false,
      fontFiles: fonts(),
    },
  });
  return Buffer.from(resvg.render().asPng());
}
