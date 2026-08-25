import fs from 'node:fs';
import path from 'node:path';

import { ImageResponse } from 'next/og';

import {
  DIGITS,
  PRINT_ADVANCE_PX,
  PRINT_FONT_PX,
  PRINT_PX_H,
  PRINT_PX_W,
  PRINT_TOP_PX,
  isRenderableTimestamp,
} from '@/lib/artwork';

export const runtime = 'nodejs';
// A 3600x4800 rasterise is well inside this, but give it room on a cold start.
export const maxDuration = 60;

let cachedFont: Buffer | null = null;

function chivo(): Buffer {
  if (!cachedFont) {
    cachedFont = fs.readFileSync(path.join(process.cwd(), 'assets', 'Chivo-Bold.ttf'));
  }
  return cachedFont;
}

/**
 * The print-ready separation: white digits on transparency, laid out against
 * the full 12x16in front print area at 300 DPI so Prodigi's `fitPrintArea`
 * places them exactly where the on-site preview showed them.
 *
 * The timestamp is in the path, so every URL is immutable and cacheable
 * forever — which matters because Prodigi fetches it asynchronously, possibly
 * long after the customer has closed the tab.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ ts: string }> },
) {
  const { ts } = await context.params;
  const epochMs = Number(ts.replace(/\.png$/i, ''));

  if (!isRenderableTimestamp(epochMs)) {
    return new Response('Not a printable timestamp.', {
      status: 400,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  const digits = String(epochMs).split('');

  return new ImageResponse(
    (
      <div
        style={{
          width: PRINT_PX_W,
          height: PRINT_PX_H,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingTop: PRINT_TOP_PX,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start' }}>
          {digits.map((digit, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                width: PRINT_ADVANCE_PX,
                justifyContent: 'center',
                fontSize: PRINT_FONT_PX,
                fontFamily: 'Chivo',
                color: '#ffffff',
                lineHeight: 1,
              }}
            >
              {digit}
            </div>
          ))}
        </div>
      </div>
    ),
    {
      width: PRINT_PX_W,
      height: PRINT_PX_H,
      fonts: [{ name: 'Chivo', data: chivo(), style: 'normal', weight: 700 }],
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Disposition': `inline; filename="datetime-${epochMs}.png"`,
        'X-Print-Dpi': '300',
        'X-Print-Digits': String(DIGITS),
      },
    },
  );
}
