import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';
import { isValidTimestamp } from '@/lib/timestamp';
import { chivoBold } from '@/lib/font';
import {
  SCALES,
  isArtworkFormat,
  layout,
  type ArtworkFormat,
} from '@/lib/artwork';

/**
 * Renders a shirt's print asset: white timestamp on a transparent background,
 * sized and positioned for Prodigi's front print area.
 *
 * This endpoint is the artwork "storage" for the whole shop. It is a pure
 * function of the timestamp, so it needs no blob store, is immutable, and can be
 * cached forever — Prodigi fetches it straight from here when it prints.
 */

export const runtime = 'nodejs';
// A given timestamp always renders the same bytes.
export const revalidate = false;

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const timestampMs = Number(params.get('t'));

  if (!isValidTimestamp(timestampMs)) {
    return Response.json(
      { error: 'Query parameter `t` must be a Unix timestamp in milliseconds.' },
      { status: 400 },
    );
  }

  const formatParam = params.get('format') ?? 'print';
  const format: ArtworkFormat = isArtworkFormat(formatParam) ? formatParam : 'print';

  const text = String(timestampMs);
  const box = layout(text, SCALES[format]);
  const font = await chivoBold();

  const image = new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          // Transparent so DTG prints white ink only where the glyphs are.
          backgroundColor: 'transparent',
        }}
      >
        <div
          style={{
            marginTop: box.top,
            display: 'flex',
            color: '#ffffff',
            fontFamily: 'Chivo',
            fontWeight: 700,
            fontSize: box.fontSize,
            letterSpacing: box.letterSpacing,
            lineHeight: 1,
            whiteSpace: 'nowrap',
          }}
        >
          {text}
        </div>
      </div>
    ),
    {
      width: box.width,
      height: box.height,
      fonts: [{ name: 'Chivo', data: font, weight: 700, style: 'normal' }],
    },
  );

  // ImageResponse sets its own short cache header; artwork is immutable, and
  // Prodigi may fetch it long after the order was placed.
  const headers = new Headers(image.headers);
  headers.set('Cache-Control', 'public, immutable, max-age=31536000, s-maxage=31536000');
  headers.set('Content-Disposition', `inline; filename="datetime-${timestampMs}.png"`);

  return new Response(image.body, { status: 200, headers });
}
