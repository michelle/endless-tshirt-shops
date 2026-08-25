import fs from 'node:fs';
import path from 'node:path';

import { ImageResponse } from 'next/og';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'datetime.store — we sell a t-shirt with the current datetime.';

export default async function OpengraphImage() {
  const chivo = fs.readFileSync(path.join(process.cwd(), 'assets', 'Chivo-Bold.ttf'));
  // A build-time-ish sample so the card always shows a plausible stamp.
  const sample = String(Date.now());

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          background: '#16181d',
          color: '#fff',
          padding: 80,
          fontFamily: 'Chivo',
        }}
      >
        <div style={{ fontSize: 76, letterSpacing: -1 }}>{sample}</div>
        <div style={{ fontSize: 34, marginTop: 24, color: '#a4d5ff' }}>datetime.store</div>
        <div style={{ fontSize: 28, marginTop: 8, color: '#949aa6' }}>
          we sell a t-shirt with the current datetime.
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: 'Chivo', data: chivo, style: 'normal', weight: 700 }],
    },
  );
}
