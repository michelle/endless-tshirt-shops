/**
 * Browser-side print artwork renderer.
 *
 * Draws the frozen epoch millisecond as white type on transparency at print
 * resolution. The original store screenshotted the small on-screen preview
 * canvas; rendering a dedicated high-resolution canvas instead means what goes
 * to the printer is crisp rather than a 200px upscale.
 */

import { ARTWORK_HEIGHT_PX, ARTWORK_WIDTH_PX } from './artwork';

const FALLBACK_FAMILY = 'ui-monospace, monospace';

/**
 * The family name next/font generates, read off the document at call time. The
 * custom property is only there once the font stylesheet has applied, so give
 * it a moment before settling for a fallback face.
 */
async function printFamily(): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const family = getComputedStyle(document.documentElement)
      .getPropertyValue('--font-chivo')
      .trim();
    if (family) return family;
    await new Promise((r) => setTimeout(r, 50));
  }
  return FALLBACK_FAMILY;
}

export async function renderArtwork(epochMs: number): Promise<string> {
  const family = await printFamily();

  // Canvas silently falls back to a default face if the webfont has not
  // arrived, so wait for it before drawing something we are going to print.
  try {
    await document.fonts.load(`700 200px ${family}`);
    await document.fonts.ready;
  } catch {
    // Fall through: a fallback face is better than no shirt.
  }

  const canvas = document.createElement('canvas');
  canvas.width = ARTWORK_WIDTH_PX;
  canvas.height = ARTWORK_HEIGHT_PX;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('This browser cannot render the print artwork.');

  const text = String(epochMs);

  // Size the type to fill the printable width, with a little breathing room.
  const targetWidth = ARTWORK_WIDTH_PX * 0.94;
  let fontSize = 420;
  ctx.font = `700 ${fontSize}px ${family}`;
  const measured = ctx.measureText(text).width;
  if (measured > 0) {
    fontSize = Math.floor(fontSize * (targetWidth / measured));
  }
  fontSize = Math.min(fontSize, ARTWORK_HEIGHT_PX * 0.8);

  ctx.font = `700 ${fontSize}px ${family}`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.letterSpacing = '4px';
  ctx.fillText(text, ARTWORK_WIDTH_PX / 2, ARTWORK_HEIGHT_PX / 2);

  return canvas.toDataURL('image/png');
}
