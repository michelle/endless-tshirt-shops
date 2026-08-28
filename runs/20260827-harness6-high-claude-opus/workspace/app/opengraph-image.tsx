import { ImageResponse } from 'next/og';

import { chivoBold } from '@/lib/fonts';

export const runtime = 'nodejs';
// Rendered per request so the card always shows a live-looking timestamp.
export const dynamic = 'force-dynamic';
export const alt = 'datetime.store — we sell a t-shirt with the current datetime';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** Social card. Regenerated per request so the number is always "now"-ish. */
export default async function Image() {
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
          background: '#0b0b0c',
          fontFamily: 'Chivo',
        }}
      >
        <div style={{ color: '#6f7683', fontSize: 30, letterSpacing: 6, marginBottom: 34 }}>
          DATETIME.STORE
        </div>
        <div style={{ color: '#fff', fontSize: 128, letterSpacing: 4, display: 'flex' }}>
          {String(Date.now())}
        </div>
        <div style={{ color: '#6f7683', fontSize: 26, marginTop: 36 }}>
          we sell a t-shirt with the current datetime
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: 'Chivo', data: font, weight: 700, style: 'normal' }] },
  );
}
