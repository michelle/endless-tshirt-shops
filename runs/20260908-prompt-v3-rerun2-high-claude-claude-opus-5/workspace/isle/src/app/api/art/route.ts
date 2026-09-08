import { NextResponse } from 'next/server';
import { decodeSpec, verifyPayload } from '@/lib/spec';
import { renderPng } from '@/lib/render';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

/**
 * The print file. Prodigi's press fetches this URL after payment, so it must be
 * publicly reachable — and therefore only serves payloads signed by this server.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const d = url.searchParams.get('d') || '';
  const sig = url.searchParams.get('sig') || '';

  if (!d || !verifyPayload(d, sig)) {
    return NextResponse.json({ error: 'bad signature' }, { status: 403 });
  }

  let spec;
  try {
    spec = decodeSpec(d);
  } catch {
    return NextResponse.json({ error: 'bad payload' }, { status: 400 });
  }

  const width = Math.min(3600, Math.max(600, Number(url.searchParams.get('w')) || 3120));
  const png = await renderPng(spec, width);

  return new NextResponse(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Content-Length': String(png.length),
      // Deterministic output for a given signed payload, so it can cache forever.
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
