import { NextRequest, NextResponse } from 'next/server';
import { decodeDesignParams } from '@/lib/design-params';
import { renderDesign } from '@/lib/design';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/design?d=<base64url(json)>
// Renders the custom moon-phase design as a PNG. Deterministic: the same
// query always yields the same image, so Prodigi can download it later.
export async function GET(req: NextRequest) {
  const d = req.nextUrl.searchParams.get('d');
  if (!d) {
    return NextResponse.json({ error: 'missing d parameter' }, { status: 400 });
  }

  let params;
  try {
    params = decodeDesignParams(d);
  } catch {
    return NextResponse.json({ error: 'invalid d parameter' }, { status: 400 });
  }

  if (params.ink !== 'light' && params.ink !== 'dark') {
    return NextResponse.json({ error: 'invalid ink' }, { status: 400 });
  }
  if (!params.date || !/^\d{4}-\d{2}-\d{2}$/.test(params.date)) {
    return NextResponse.json({ error: 'invalid date' }, { status: 400 });
  }

  try {
    const png = renderDesign(params);
    return new NextResponse(png, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'render failed', detail: String(err) },
      { status: 500 },
    );
  }
}
