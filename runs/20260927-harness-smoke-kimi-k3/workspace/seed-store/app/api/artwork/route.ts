import path from 'path';
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import UPNG from 'upng-js';
import { renderSeedArt } from '@/lib/art';
import { getGarment, getPalette, normalizeWord } from '@/lib/catalogue';

export const maxDuration = 60;

// 243 DPI over the 15.6in-wide Bella+Canvas 3001 front print area.
// Palette-quantized PNG keeps the response within serverless size limits
// while staying print-sharp for DTG (which dithers anyway).
const PRINT_W = 3800;
const PRINT_H = 4778;

let fontReady = false;
function ensureFont(): void {
  if (fontReady) return;
  GlobalFonts.registerFromPath(
    path.join(process.cwd(), 'fonts', 'IBMPlexMono-Regular.ttf'),
    'SeedMono',
  );
  fontReady = true;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const word = normalizeWord(url.searchParams.get('word') ?? '');
  const palette = getPalette(url.searchParams.get('palette') ?? '');
  const garment = getGarment(url.searchParams.get('garment') ?? 'black');

  if (!word || !palette || !garment) {
    return Response.json(
      { error: 'Expected ?word=...&palette=...&garment=...' },
      { status: 400 },
    );
  }

  ensureFont();
  const canvas = createCanvas(PRINT_W, PRINT_H);
  const ctx = canvas.getContext('2d');
  renderSeedArt(ctx, {
    word,
    palette,
    darkGarment: garment.dark,
    width: PRINT_W,
    height: PRINT_H,
    captionFont: 'SeedMono',
    detailScale: 1.0,
  });

  const rgba = ctx.getImageData(0, 0, PRINT_W, PRINT_H);
  const png = UPNG.encode(
    [rgba.data.buffer as ArrayBuffer],
    PRINT_W,
    PRINT_H,
    256,
  );

  return new Response(Buffer.from(png) as unknown as BodyInit, {
    headers: {
      'Content-Type': 'image/png',
      // Deterministic for a given query string: cache aggressively.
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
