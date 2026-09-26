import { NextRequest, NextResponse } from 'next/server';
import { decodeDesign } from '@/lib/design';
import { RENDER_WIDTHS, renderDesignPng } from '@/lib/render-server';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * GET /api/render?d=<base64url design>&w=<width>
 *
 * Renders the artwork PNG. Deterministic: identical parameters always
 * produce identical pixels, so responses are cached at the CDN as immutable.
 * The same endpoint serves browser previews (w=700/830) and the print file
 * Prodigi downloads at fulfilment time (w=2490).
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const d = url.searchParams.get('d') ?? '';
  const w = Number(url.searchParams.get('w') ?? '830');

  const design = decodeDesign(d);
  if (!design) {
    return NextResponse.json({ error: 'Invalid or missing design parameter "d".' }, { status: 400 });
  }
  if (!RENDER_WIDTHS.includes(w as (typeof RENDER_WIDTHS)[number])) {
    return NextResponse.json({ error: 'Invalid width.' }, { status: 400 });
  }

  try {
    const png = await renderDesignPng(design, w);
    return new NextResponse(new Uint8Array(png), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': String(png.length),
        'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable',
      },
    });
  } catch (e) {
    const msg = (e as Error).message ?? 'render failed';
    console.error('render error', msg, { d: d.slice(0, 64), w });
    const status = msg.includes('terrain') ? 503 : 500;
    return NextResponse.json(
      { error: status === 503 ? 'Terrain data temporarily unavailable. Please try again.' : 'Render failed.' },
      { status, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
