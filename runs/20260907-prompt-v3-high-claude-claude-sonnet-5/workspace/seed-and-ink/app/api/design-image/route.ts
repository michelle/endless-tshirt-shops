import { NextRequest, NextResponse } from 'next/server';
import { createCanvas } from '@napi-rs/canvas';
import { isStyleKey, renderBackMark, renderFrontDesign } from '@/lib/designs';
import { getPalette } from '@/lib/palettes';
import { MAX_SEED_LENGTH } from '@/lib/config';

export const runtime = 'nodejs';

// Renders the exact print-ready PNG for a given seed/style/palette on the
// fly. Because rendering is a pure function of the query params, this
// route needs no database and no upload step: the same URL always
// produces the same bytes, so it's safe to hand straight to Prodigi as
// the asset URL for an order, minutes or days after checkout.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const seedText = (searchParams.get('seed') || 'seed').slice(0, MAX_SEED_LENGTH);
  const styleParam = searchParams.get('style') || 'bloom';
  const style = isStyleKey(styleParam) ? styleParam : 'bloom';
  const palette = getPalette(searchParams.get('palette') || 'midnight');
  const part = searchParams.get('part') === 'back' ? 'back' : 'front';
  const width = Math.min(4000, Math.max(200, Number(searchParams.get('w')) || 3000));
  const height = Math.min(5000, Math.max(200, Number(searchParams.get('h')) || 3750));

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  const opts = { width, height, seedText, style, colors: palette.colors };

  if (part === 'back') {
    renderBackMark(ctx as any, opts);
  } else {
    renderFrontDesign(ctx as any, opts);
  }

  const buffer = await canvas.encode('png');

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
