import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/design-token';
import { renderDesignPng, renderDesignPreview } from '@/lib/render-design';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('t');
  const params = verifyToken(token);
  if (!params) {
    return new NextResponse('Invalid or missing design token.', { status: 400 });
  }

  const widthParam = Number(searchParams.get('w') || '0');
  const previewWidth = Number.isFinite(widthParam) && widthParam > 0 ? Math.min(widthParam, 2000) : 0;

  try {
    const png = previewWidth ? await renderDesignPreview(params, previewWidth) : await renderDesignPng(params);
    return new NextResponse(new Uint8Array(png), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': String(png.length),
        // Deterministic output for a given token — cache aggressively.
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (err) {
    console.error('design render error:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
