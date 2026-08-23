import { renderArtworkPng } from '@/lib/artwork';

/**
 * The exact PNG we send to the printer, so the confirmation page can show the
 * customer their artwork rather than a re-drawn approximation of it.
 */

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get('t');
  const timestampMs = Number(raw);

  if (!raw || !Number.isSafeInteger(timestampMs) || timestampMs <= 0 || timestampMs > 4e12) {
    return new Response('Bad timestamp', { status: 400 });
  }

  const { png } = renderArtworkPng(timestampMs);

  return new Response(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      // The artwork for a given timestamp never changes.
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Content-Disposition': `inline; filename="datetime-${timestampMs}.png"`,
    },
  });
}
