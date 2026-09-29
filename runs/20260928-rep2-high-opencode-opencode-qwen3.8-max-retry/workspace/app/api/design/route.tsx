import { ImageResponse } from 'next/og';
import { POSTER_FONTS } from '../../../lib/fonts-data';
import { Poster } from '../../../lib/poster';
import { decodeDesign, validateDesign, ValidationError } from '../../../lib/design';
import { PREVIEW_CANVAS, PRINT_CANVAS, PRINT_POSTER } from '../../../lib/catalog';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * GET  /api/design?d=<payload>&sig=<hmac>&r=print|preview
 *   Signed, permanent artwork URLs. r=print renders the full 4677×5787
 *   transparent print canvas (the URL Prodigi downloads); r=preview renders
 *   just the poster at 700px (Stripe line-item image, order pages).
 * POST /api/design/preview  {date, place, caption, palette}
 *   Unsigned live preview for the studio — validation only, never cached.
 */
export async function GET(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const spec = decodeDesign(searchParams.get('d'), searchParams.get('sig'));
  if (!spec) {
    return Response.json({ error: 'invalid or tampered design payload' }, { status: 400 });
  }
  const render = searchParams.get('r') ?? 'preview';
  if (render === 'print') {
    return new ImageResponse(
      (
        <div style={{ width: PRINT_CANVAS.w, height: PRINT_CANVAS.h, position: 'relative', display: 'flex' }}>
          <div style={{ position: 'absolute', left: PRINT_POSTER.x, top: PRINT_POSTER.y, display: 'flex' }}>
            <Poster spec={spec} width={PRINT_POSTER.w} />
          </div>
        </div>
      ),
      {
        width: PRINT_CANVAS.w,
        height: PRINT_CANVAS.h,
        fonts: POSTER_FONTS,
        headers: { 'Cache-Control': 'public, max-age=31536000, immutable' },
      },
    );
  }
  return new ImageResponse(<Poster spec={spec} width={PREVIEW_CANVAS.w} />, {
    width: PREVIEW_CANVAS.w,
    height: PREVIEW_CANVAS.h,
    fonts: POSTER_FONTS,
    headers: { 'Cache-Control': 'public, max-age=600' },
  });
}

export async function POST(req: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'invalid JSON body' }, { status: 400 });
  }
  let spec;
  try {
    spec = validateDesign(body);
  } catch (err) {
    if (err instanceof ValidationError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    return Response.json({ error: 'invalid design' }, { status: 400 });
  }
  return new ImageResponse(<Poster spec={spec} width={PREVIEW_CANVAS.w} />, {
    width: PREVIEW_CANVAS.w,
    height: PREVIEW_CANVAS.h,
    fonts: POSTER_FONTS,
    headers: { 'Cache-Control': 'no-store' },
  });
}
