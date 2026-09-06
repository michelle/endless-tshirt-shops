/**
 * The print file. GET /api/art/{white|black}/{timestamp}.png
 *
 * Prodigi downloads this URL when it fulfils the order, so it must stay
 * publicly reachable and must keep returning the same bytes forever: the
 * customer's shirt is defined by this URL.
 */

import { NextResponse } from 'next/server';
import { isInk, isValidTimestamp, renderArtwork } from '@/lib/artwork';

export const runtime = 'nodejs';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ ink: string; ts: string }> },
) {
  const { ink, ts } = await params;
  const timestamp = ts.replace(/\.png$/i, '');

  if (!isInk(ink) || !isValidTimestamp(timestamp)) {
    return NextResponse.json({ error: 'No such moment.' }, { status: 404 });
  }

  const png = renderArtwork(timestamp, ink);

  return new NextResponse(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Content-Length': String(png.length),
      // The past does not change.
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Content-Disposition': `inline; filename="datetime-${timestamp}-${ink}.png"`,
    },
  });
}
