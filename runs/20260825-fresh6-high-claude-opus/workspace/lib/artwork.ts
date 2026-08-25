import { ImageResponse } from 'next/og';
import { CHIVO_400_BASE64 } from './chivo-400';
import { CHIVO_700_BASE64 } from './chivo-700';

/**
 * Prodigi's front print area for both garments we sell is 2490 x 3510 px
 * (~8.3 x 11.7 in at 300 dpi). We render the artwork at exactly that aspect
 * ratio with everything but the timestamp transparent, then submit it with
 * `fitPrintArea`. That way placement is decided here, in code we control,
 * rather than by Prodigi's auto-scaling.
 */
export const PRINT_WIDTH = 2490;
export const PRINT_HEIGHT = 3510;
export const PRINT_ASPECT = PRINT_HEIGHT / PRINT_WIDTH;

/** How far down the print area the timestamp sits — upper chest, below the collar. */
const TOP_FRACTION = 0.14;
/** Fraction of the print-area width the timestamp spans. */
const TEXT_WIDTH_FRACTION = 0.9;

function decode(base64: string): ArrayBuffer {
  const buf = Buffer.from(base64, 'base64');
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}

let fonts: Array<{ name: string; data: ArrayBuffer; weight: 400 | 700; style: 'normal' }> | null =
  null;

function chivo() {
  if (!fonts) {
    fonts = [
      { name: 'Chivo', data: decode(CHIVO_400_BASE64), weight: 400, style: 'normal' },
      { name: 'Chivo', data: decode(CHIVO_700_BASE64), weight: 700, style: 'normal' },
    ];
  }
  return fonts;
}

/**
 * Chivo's digits are tabular at roughly 0.6em advance. Deriving the font size
 * from the digit count keeps a 13-digit millisecond stamp and a hypothetical
 * 10-digit one both filling the same share of the shirt.
 */
function fontSizeFor(text: string, width: number): number {
  const DIGIT_ADVANCE = 0.6;
  const LETTER_SPACING = 0.03;
  const perChar = DIGIT_ADVANCE + LETTER_SPACING;
  return (width * TEXT_WIDTH_FRACTION) / (text.length * perChar);
}

export type ArtworkOptions = {
  timestamp: number;
  /** Rendered pixel width; height follows the print-area aspect ratio. */
  width?: number;
  /**
   * Print assets are white-on-transparent for direct-to-garment printing on a
   * black shirt. A checkered/dark backdrop is only useful for eyeballing it.
   */
  debugBackground?: boolean;
};

export function renderArtwork({
  timestamp,
  width = PRINT_WIDTH,
  debugBackground = false,
}: ArtworkOptions): ImageResponse {
  const height = Math.round(width * PRINT_ASPECT);
  const text = String(timestamp);
  const fontSize = fontSizeFor(text, width);

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          background: debugBackground ? '#111111' : 'transparent',
        }}
      >
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            top: Math.round(height * TOP_FRACTION),
            left: 0,
            width: '100%',
            justifyContent: 'center',
          }}
        >
          <span
            style={{
              fontFamily: 'Chivo',
              fontWeight: 400,
              fontSize,
              lineHeight: 1,
              color: '#ffffff',
              letterSpacing: `${fontSize * 0.03}px`,
              whiteSpace: 'nowrap',
            }}
          >
            {text}
          </span>
        </div>
      </div>
    ),
    { width, height, fonts: chivo() },
  );
}
