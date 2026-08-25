import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export async function GET(request: Request) {
  const value = new URL(request.url).searchParams.get('timestamp');
  if (!value || !/^\d{10}$/.test(value)) return new Response('Missing timestamp', {status: 400});
  return new ImageResponse(
    <div style={{width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'transparent', color: 'white'}}>
      <div style={{fontSize: 138, fontFamily: 'monospace', fontWeight: 700, letterSpacing: -8}}>{value}</div>
      <div style={{fontSize: 28, fontFamily: 'sans-serif', letterSpacing: 10, marginTop: 40}}>YOUR MOMENT, PRINTED</div>
    </div>,
    {width: 2100, height: 2400, headers: {'Cache-Control': 'public, max-age=31536000, immutable'}},
  );
}
