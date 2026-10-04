import { Resvg } from '@resvg/resvg-js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FONT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'fonts');
const fontFiles = [
  'CormorantGaramond_500Medium.ttf',
  'CormorantGaramond_500Medium_Italic.ttf',
  'CormorantGaramond_600SemiBold.ttf',
  'CormorantGaramond_600SemiBold_Italic.ttf',
  'SpaceMono_400Regular.ttf',
  'SpaceMono_700Bold.ttf',
].map((f) => path.join(FONT_DIR, f));

const baseOpts = { font: { fontFiles, loadSystemFonts: false, defaultFontFamily: 'Cormorant Garamond' } };

export function renderPng(svg, width) {
  const resvg = new Resvg(svg, { ...baseOpts, fitTo: { mode: 'width', value: width } });
  return resvg.render().asPng();
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const cache = new Map();

// Width in px of a single line of text, measured with the real font files.
export function measureText(text, { family, weight = 400, style = 'normal', size, letterSpacing = 0 }) {
  const key = [text, family, weight, style, size, letterSpacing].join('|');
  if (cache.has(key)) return cache.get(key);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="20000" height="2000"><text x="100" y="1000" font-family="${family}" font-weight="${weight}" font-style="${style}" font-size="${size}" letter-spacing="${letterSpacing}">${esc(text)}</text></svg>`;
  const bbox = new Resvg(svg, baseOpts).getBBox();
  const w = bbox ? bbox.width : text.length * size * 0.6;
  if (cache.size > 5000) cache.clear();
  cache.set(key, w);
  return w;
}
