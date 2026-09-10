import { NextRequest } from 'next/server';
import { decodeDesign, designErrors } from '@/lib/design';
import { renderPng, PRINT_WIDTH } from '@/lib/render';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * The print file. Prodigi fetches this URL directly when the order reaches the
 * press, so it must stay public, stable for a given token, and dimensioned to
 * the garment's print area.
 *
 *   /api/artwork?d=<design token>          -> 4665x5844 transparent PNG
 *   /api/artwork?d=<token>&w=1200          -> smaller proof
 *   /api/artwork?d=<token>&garment=1       -> proof with the shirt colour behind
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('d');
  if (!token) return new Response('Missing design token', { status: 400 });

  const design = decodeDesign(token);
  if (!design || designErrors(design).length) {
    return new Response('Invalid design token', { status: 400 });
  }

  const requested = Number(req.nextUrl.searchParams.get('w'));
  const width = Number.isFinite(requested) && requested > 0
    ? Math.min(PRINT_WIDTH, Math.max(200, Math.round(requested)))
    : PRINT_WIDTH;
  const withGarment = req.nextUrl.searchParams.get('garment') === '1';

  try {
    const png = await renderPng(design, { width, withGarment });
    return new Response(new Uint8Array(png), {
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': String(png.length),
        // Tokens are content-addressed, so this can be cached hard.
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Disposition': `inline; filename="flora-personalis-${width}.png"`,
      },
    });
  } catch (err) {
    console.error('artwork render failed', err);
    return new Response('Render failed', { status: 500 });
  }
}
