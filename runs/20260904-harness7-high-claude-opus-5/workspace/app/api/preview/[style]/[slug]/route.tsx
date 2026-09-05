import { ImageResponse } from 'next/og';
import { parseStyle, parseTimestamp } from '@/lib/catalog';
import { chivoBold } from '@/lib/font';
import { SHIRT_PATHS } from '@/lib/shirt-path';

export const runtime = 'nodejs';
// Fully determined by the path, so it can be rendered once and cached forever.
// (Style lives in the path rather than a query string precisely because
// `force-static` routes do not see search params.)
export const dynamic = 'force-static';
export const revalidate = false;

const SIZE = 900;

/**
 * A shop-facing mockup of the shirt: black garment, white timestamp.
 *
 * The print asset itself is white-on-transparent and therefore invisible on a
 * white page, so this is what we hand to Stripe Checkout for the line item
 * image and show on the confirmation screen.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ style: string; slug: string }> },
) {
  const { style: rawStyle, slug } = await params;
  const ts = parseTimestamp(slug.replace(/\.png$/i, ''));
  const style = parseStyle(rawStyle);
  if (ts === null || !style) return new Response('Not found', { status: 404 });

  const text = String(ts);

  return new ImageResponse(
    (
      <div
        style={{
          width: SIZE,
          height: SIZE,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f6f9fc',
          position: 'relative',
        }}
      >
        <svg width={SIZE * 0.84} height={SIZE * 0.84} viewBox="0 0 100 104">
          <path d={SHIRT_PATHS[style]} fill="#111111" fillRule="evenodd" clipRule="evenodd" />
        </svg>
        <div
          style={{
            position: 'absolute',
            // Matches the print placement: ~21% down the garment.
            top: SIZE * 0.34,
            width: SIZE,
            display: 'flex',
            justifyContent: 'center',
            fontFamily: 'Chivo',
            fontSize: 38,
            color: '#ffffff',
            letterSpacing: 0.5,
          }}
        >
          {text}
        </div>
      </div>
    ),
    {
      width: SIZE,
      height: SIZE,
      fonts: [{ name: 'Chivo', data: await chivoBold(), weight: 700, style: 'normal' }],
    },
  );
}
