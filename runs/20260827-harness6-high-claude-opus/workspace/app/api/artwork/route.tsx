import { ImageResponse } from 'next/og';
import { type NextRequest } from 'next/server';

import { parseTimestamp } from '@/lib/catalog';
import { chivoBold } from '@/lib/fonts';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * The design itself.
 *
 * `print=1` renders the press-ready asset Prodigi downloads: white type on a
 * transparent canvas. Prodigi is told to `fitPrintArea`, which scales the *whole*
 * image (padding included) into the ~11.7in-wide chest area — so the padding is
 * load-bearing. It is what makes the number land about 9in wide with a sane
 * margin instead of running off the seams.
 *
 * The canvas is sized from the digit count rather than fixed, so the design keeps
 * its proportions when timestamps gain a digit (roughly the year 2286).
 */
const PRINT_FONT_SIZE = 340;
const PRINT_LETTER_SPACING = 10;
/** Measured advance of a Chivo Bold digit, as a fraction of font size. */
const DIGIT_ADVANCE = 0.61;
/** Fraction of the canvas width the number should occupy. */
const TEXT_WIDTH_RATIO = 0.72;

function printSpec(digits: number) {
  const textWidth = digits * (DIGIT_ADVANCE * PRINT_FONT_SIZE + PRINT_LETTER_SPACING);
  return {
    width: Math.round(textWidth / TEXT_WIDTH_RATIO),
    height: Math.round(PRINT_FONT_SIZE * 2.2),
    fontSize: PRINT_FONT_SIZE,
    letterSpacing: PRINT_LETTER_SPACING,
  };
}

const PREVIEW = { width: 1200, height: 630, fontSize: 132, letterSpacing: 4 };

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const ts = parseTimestamp(params.get('ts'));
  if (ts === null) {
    return new Response('Bad or missing `ts` parameter', { status: 400 });
  }

  const digits = String(ts);
  const isPrint = params.get('print') === '1';
  const spec = isPrint ? printSpec(digits.length) : PREVIEW;
  const font = await chivoBold();

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          // Transparent for print so the shirt colour shows through; the preview
          // gets the same near-black the site uses.
          background: isPrint ? 'transparent' : '#0b0b0c',
          fontFamily: 'Chivo',
        }}
      >
        {!isPrint && (
          <div style={{ color: '#6f7683', fontSize: 30, letterSpacing: 6, marginBottom: 34 }}>
            DATETIME.STORE
          </div>
        )}
        <div
          style={{
            color: '#ffffff',
            fontSize: spec.fontSize,
            letterSpacing: spec.letterSpacing,
            lineHeight: 1.2,
            display: 'flex',
          }}
        >
          {digits}
        </div>
        {!isPrint && (
          <div style={{ color: '#6f7683', fontSize: 26, letterSpacing: 2, marginTop: 36 }}>
            we sell a t-shirt with the current datetime
          </div>
        )}
      </div>
    ),
    {
      width: spec.width,
      height: spec.height,
      fonts: [{ name: 'Chivo', data: font, weight: 700, style: 'normal' }],
      headers: {
        // Immutable: a given `ts` always renders the same pixels, and Prodigi may
        // re-fetch the asset days later when the order reaches the press.
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Disposition': `inline; filename="datetime-${ts}.png"`,
      },
    },
  );
}
