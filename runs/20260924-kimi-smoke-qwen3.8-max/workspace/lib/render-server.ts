/**
 * Server-side rendering pipeline: terrain + fonts + @napi-rs/canvas.
 */
import path from 'node:path';
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import type { Design } from './design';
import { fetchTerrain } from './terrain';
import { renderDesign, PRINT_W, PRINT_H } from './render';

let fontsReady = false;

function ensureFonts(): void {
  if (fontsReady) return;
  const dir = path.join(process.cwd(), 'public', 'fonts');
  GlobalFonts.registerFromPath(path.join(dir, 'Spectral-SemiBold.ttf'), 'SpectralSB');
  GlobalFonts.registerFromPath(path.join(dir, 'Spectral-Regular.ttf'), 'Spectral');
  GlobalFonts.registerFromPath(path.join(dir, 'Spectral-Italic.ttf'), 'SpectralIt');
  GlobalFonts.registerFromPath(path.join(dir, 'SpaceMono-Regular.ttf'), 'SpaceMono');
  GlobalFonts.registerFromPath(path.join(dir, 'SpaceMono-Bold.ttf'), 'SpaceMonoBold');
  fontsReady = true;
}

export const RENDER_WIDTHS = [400, 700, 830, 1245, 2490] as const;

export async function renderDesignPng(design: Design, width: number): Promise<Buffer> {
  const terrain = await fetchTerrain(design.lat, design.lon, design.radiusKm);
  ensureFonts();
  const height = Math.round((width * PRINT_H) / PRINT_W);
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  renderDesign(ctx, design, terrain, width, (w, h) => createCanvas(w, h));
  return canvas.toBuffer('image/png');
}
