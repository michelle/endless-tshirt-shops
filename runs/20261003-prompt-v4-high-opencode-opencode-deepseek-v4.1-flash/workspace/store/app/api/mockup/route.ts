import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/design-token';
import { renderMockupPng } from '@/lib/mockup';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const params = verifyToken(searchParams.get('t'));
  if (!params) {
    return new NextResponse('Invalid or missing design token.', { status: 400 });
  }
  const w = Number(searchParams.get('w') || '900');
  const width = Number.isFinite(w) && w > 0 ? Math.min(w, 1600) : 900;
  try {
    const png = await renderMockupPng(params, width);
    return new NextResponse(new Uint8Array(png), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': String(png.length),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (err) {
    console.error('mockup render error:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
