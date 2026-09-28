import { NextRequest } from 'next/server';
import sharp from 'sharp';
import { buildDesignSVG, decodeDesign, PRINT_H, PRINT_W } from '@/lib/design';
import { loadFont } from '@/lib/textpath';
import { inkById } from '@/lib/shirts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Deterministic, stateless print-file renderer.
 *   GET /api/design.png?d=<encoded design>&ink=<ink id>[&w=<px>]
 * Prodigi fetches this URL (full 4680x5790 resolution) after payment; smaller
 * widths power previews. Output is cached forever because the URL fully
 * determines the artwork.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const design = decodeDesign(sp.get('d') || '');
  if (!design) return new Response('invalid design parameters', { status: 400 });

  const ink = inkById(sp.get('ink') || 'starlight');
  if (!ink) return new Response('invalid ink', { status: 400 });

  let w = parseInt(sp.get('w') || '', 10);
  if (!Number.isFinite(w)) w = PRINT_W;
  w = Math.max(64, Math.min(PRINT_W, Math.round(w)));
  const h = Math.round((w * PRINT_H) / PRINT_W);

  try {
    const font = loadFont();
    const svg = buildDesignSVG(design, ink.hex, font).replace(
      '<svg ',
      `<svg width="${w}" height="${h}" `
    );
    const png = await sharp(Buffer.from(svg))
      .png({ palette: true, colours: 256, compressionLevel: 9 })
      .toBuffer();
    return new Response(new Uint8Array(png), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (e) {
    return new Response(`render failed: ${(e as Error).message}`, { status: 500 });
  }
}
