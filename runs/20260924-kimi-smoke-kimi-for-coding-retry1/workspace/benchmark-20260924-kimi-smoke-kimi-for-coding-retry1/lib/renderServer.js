// Server-side renderer using @napi-rs/canvas (Skia). Shares drawArtwork with
// the browser preview so the print file and the preview always agree.
// Fonts are embedded (lib/fonts.js) so rendering is identical on any host.

import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { computeScene } from './scene.js';
import { drawArtwork } from './renderCanvas.js';
import { FONT_FILES } from './fonts.js';

let fontsRegistered = false;
function ensureFonts() {
  if (fontsRegistered) return;
  fontsRegistered = true;
  for (const [buf, alias] of FONT_FILES) {
    try {
      GlobalFonts.register(buf, alias);
    } catch (e) {
      console.error('font registration failed', alias, e.message);
    }
  }
}

const SERVER_FONTS = {
  regular: 'SkySerif',
  semibold: 'SkySerif SemiBold',
  italic: 'SkySerif Italic',
};

// Renders the print artwork (transparent background) at the given size.
export function renderArtworkPng(design, W, H) {
  ensureFonts();
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  const scene = computeScene(design, W, H);
  drawArtwork(ctx, scene, { fonts: SERVER_FONTS });
  return canvas.toBuffer('image/png');
}
