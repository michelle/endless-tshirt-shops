// GET /api/artwork?<design params>&res=print|preview
// Deterministic star-map PNG. Prodigi fetches this URL as the print asset;
// Stripe fetches it (res=preview) as the checkout line-item image.
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import path from 'node:path';
import { renderArtwork, PRINT_ASPECT } from '../../../lib/render';
import { decodeDesign } from '../../../lib/params';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

let fontsReady = false;
function ensureFonts() {
  if (fontsReady) return;
  const dir = path.join(process.cwd(), 'public', 'fonts');
  for (const f of [
    'CormorantGaramond-Medium.otf',
    'CormorantGaramond-SemiBold.otf',
    'CormorantGaramond-MediumItalic.otf',
  ]) {
    GlobalFonts.registerFromPath(path.join(dir, f), f.replace('.otf', ''));
  }
  fontsReady = true;
}

const SIZES = {
  print: 4680, // 15.6in @300dpi (H = 5790 @ 19.3in)
  preview: 936,
};

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const design = decodeDesign(searchParams);
  if (!design) {
    return Response.json({ error: 'invalid design parameters' }, { status: 400 });
  }
  const resName = searchParams.get('res');
  const W = SIZES[resName] || SIZES.print;
  const H = Math.round(W * PRINT_ASPECT);

  ensureFonts();
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  renderArtwork(ctx, W, H, design);
  const png = canvas.toBuffer('image/png');

  return new Response(png, {
    headers: {
      'content-type': 'image/png',
      'content-length': String(png.length),
      'cache-control': 'public, max-age=31536000, immutable',
    },
  });
}
