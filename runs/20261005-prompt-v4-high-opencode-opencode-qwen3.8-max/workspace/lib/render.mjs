// Server-side high-resolution rendering: SVG → PNG via resvg.
// Bundled fonts only (no system fonts) so output is deterministic everywhere.
import { Resvg } from '@resvg/resvg-js';
import { readdirSync, existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

let cachedFonts = null;
function fontFiles() {
  if (cachedFonts) return cachedFonts;
  const candidates = [
    join(here, 'fonts'),
    join(here, '..', 'lib', 'fonts'),
    '/tmp/heliogram-fonts',
  ];
  for (const dir of candidates) {
    if (existsSync(dir)) {
      const files = readdirSync(dir).filter((f) => f.endsWith('.ttf')).map((f) => join(dir, f));
      if (files.length) { cachedFonts = files; return files; }
    }
  }
  throw new Error('no bundled fonts found');
}

// On some serverless runtimes the traced font files can be read-only-packed;
// fall back to unpacking into /tmp if resvg cannot read them in place.
function ensureReadableFonts() {
  const files = fontFiles();
  try {
    for (const f of files) readFileSync(f).length;
    return files;
  } catch {
    mkdirSync('/tmp/heliogram-fonts', { recursive: true });
    return files.map((f) => {
      const dest = join('/tmp/heliogram-fonts', f.split('/').pop());
      if (!existsSync(dest)) writeFileSync(dest, readFileSync(f));
      return dest;
    });
  }
}

/**
 * @param {string} svg
 * @param {number} width target width in px (4677 = 300dpi print size)
 * @returns {Buffer} PNG
 */
export function renderSVGtoPNG(svg, width = 4677, background = 'rgba(255, 255, 255, 0)') {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: width },
    font: {
      fontFiles: ensureReadableFonts(),
      loadSystemFonts: false,
      defaultFontFamily: 'IBM Plex Mono',
    },
    background,
  });
  return Buffer.from(resvg.render().asPng());
}
