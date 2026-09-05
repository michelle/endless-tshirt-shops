import { ImageResponse } from 'next/og';
import { parseTimestamp } from '@/lib/catalog';
import {
  ART_HEIGHT,
  ART_TEXT_TOP_FRACTION,
  ART_WIDTH,
  artFontSizeFor,
} from '@/lib/artwork';
import { chivoBold } from '@/lib/font';

// Node runtime: we read the font off disk rather than bundling it into an edge
// function, and these renders are large enough to want the extra memory.
export const runtime = 'nodejs';
export const dynamic = 'force-static';
export const revalidate = false;

/**
 * The print-ready asset: white type on transparent, full-bleed at the front
 * print area's aspect ratio. Prodigi fetches this URL directly.
 *
 * The route is deterministic in the timestamp — the same URL always yields the
 * same bytes — which is what lets us skip artwork storage entirely.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const ts = parseTimestamp(slug.replace(/\.png$/i, ''));
  if (ts === null) {
    return new Response('Not found', { status: 404 });
  }

  const text = String(ts);
  const fontSize = artFontSizeFor(text);

  return new ImageResponse(
    (
      <div
        style={{
          width: ART_WIDTH,
          height: ART_HEIGHT,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          paddingTop: Math.round(ART_HEIGHT * ART_TEXT_TOP_FRACTION),
          // Transparent: DTG lays down only the white ink for the glyphs.
          background: 'transparent',
        }}
      >
        <div
          style={{
            fontFamily: 'Chivo',
            fontSize,
            color: '#ffffff',
            letterSpacing: fontSize * 0.01,
            lineHeight: 1,
            whiteSpace: 'nowrap',
          }}
        >
          {text}
        </div>
      </div>
    ),
    {
      width: ART_WIDTH,
      height: ART_HEIGHT,
      fonts: [{ name: 'Chivo', data: await chivoBold(), weight: 700, style: 'normal' }],
    },
  );
}
