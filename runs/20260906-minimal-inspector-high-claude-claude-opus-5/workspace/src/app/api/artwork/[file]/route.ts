import { PRINT_DPI, renderArtworkPng } from '@/lib/artwork';
import { MIN_CAPTURED_AT } from '@/lib/product';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_CAPTURED_AT = 4_000_000_000_000; // ~2096

/**
 * The print file for a timestamp, generated on demand.
 *
 * Artwork is a pure function of the epoch milliseconds in the URL, so nothing
 * has to be stored: Prodigi fetches this URL when it prepares the print job,
 * and the same URL still renders the identical file years later.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ file: string }> },
) {
  const { file } = await context.params;
  const match = /^(\d{10,16})\.png$/.exec(file);
  if (!match) {
    return new Response('Not found', { status: 404 });
  }

  const capturedAt = Number(match[1]);
  if (!Number.isSafeInteger(capturedAt) || capturedAt < MIN_CAPTURED_AT || capturedAt > MAX_CAPTURED_AT) {
    return new Response('Not found', { status: 404 });
  }

  const url = new URL(request.url);
  const requestedDpi = Number(url.searchParams.get('dpi'));
  const dpi = Number.isFinite(requestedDpi) && requestedDpi > 0
    ? Math.min(Math.max(Math.round(requestedDpi), 24), PRINT_DPI)
    : PRINT_DPI;
  const background = url.searchParams.get('bg');

  try {
    const png = await renderArtworkPng(capturedAt, {
      dpi,
      background: background ? `#${background.replace(/[^0-9a-fA-F]/g, '').slice(0, 6)}` : null,
    });

    return new Response(new Uint8Array(png), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': String(png.length),
        'Content-Disposition': `inline; filename="datetime-${capturedAt}.png"`,
        'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('[artwork] render failed', capturedAt, error);
    return new Response('Artwork could not be rendered', { status: 500 });
  }
}
