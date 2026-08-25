import { NextRequest } from 'next/server';
import { renderArtwork, PRINT_WIDTH } from '@/lib/artwork';
import { isValidTimestamp } from '@/lib/catalog';

export const runtime = 'nodejs';

/**
 * The print-ready artwork for a single moment in time.
 *
 * Deterministic and public by design: Prodigi's print pipeline fetches this URL
 * itself, so it cannot be authenticated, and the same `ts` must always produce
 * the same bytes (Prodigi md5s the asset). Nothing sensitive is exposed — a
 * timestamp is not a secret, and the endpoint has no side effects.
 */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const ts = Number(params.get('ts'));

  if (!isValidTimestamp(ts)) {
    return new Response('Invalid or missing `ts` (unix milliseconds)', {
      status: 400,
    });
  }

  const requested = Number(params.get('w'));
  const width =
    Number.isFinite(requested) && requested >= 100 && requested <= PRINT_WIDTH
      ? Math.round(requested)
      : PRINT_WIDTH;

  const image = renderArtwork({
    timestamp: ts,
    width,
    debugBackground: params.get('debug') === '1',
  });

  // Immutable: (ts, w) fully determines the output.
  const headers = new Headers(image.headers);
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  headers.set('Content-Type', 'image/png');
  return new Response(image.body, { status: 200, headers });
}
