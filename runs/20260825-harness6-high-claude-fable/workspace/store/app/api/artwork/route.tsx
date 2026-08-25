import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { isValidTimestamp } from '@/lib/products';

export const runtime = 'edge';

// Renders the print-ready artwork for a given epoch-ms timestamp:
// white Chivo digits on a transparent background (DTG print on a black tee).
// 2000px wide ≈ 250 DPI at the 8-inch print width. `preview=1` adds a black
// background so the image is visible in Stripe Checkout and link previews.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const ts = searchParams.get('ts');
  const preview = searchParams.get('preview') === '1';

  if (!isValidTimestamp(ts)) {
    return new Response('ts must be a 13-digit epoch-milliseconds value', {
      status: 400,
    });
  }

  const font = await fetch(
    new URL('../../../assets/Chivo-Bold.ttf', import.meta.url)
  ).then((r) => r.arrayBuffer());

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: preview ? '#111111' : 'transparent',
          color: '#ffffff',
          fontFamily: 'Chivo',
          fontSize: 236,
          letterSpacing: 4,
        }}
      >
        {ts}
      </div>
    ),
    {
      width: 2000,
      height: 460,
      fonts: [{ name: 'Chivo', data: font, weight: 700, style: 'normal' }],
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    }
  );
}
