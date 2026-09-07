import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET(request) {
  const raw = new URL(request.url).searchParams.get('timestamp') || '';
  const timestamp = /^\d{10,16}$/.test(raw) ? raw : String(Date.now());
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', color: 'white', fontSize: 175, fontFamily: 'monospace', letterSpacing: -14, fontWeight: 500 }}>
      {timestamp}
    </div>,
    { width: 2480, height: 3507, headers: { 'Cache-Control': 'public, max-age=31536000, immutable' } },
  );
}
