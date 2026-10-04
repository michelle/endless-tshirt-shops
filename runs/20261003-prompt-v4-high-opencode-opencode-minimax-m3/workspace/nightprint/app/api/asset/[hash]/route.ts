/**
 * /api/asset/[hash] - Serves the SVG file for a given design.
 * Prodigi fetches this URL when it begins production.
 *
 * The hash is a 32-char SHA-256 prefix of the SVG content, so identical
 * designs re-use the same URL and the same file.
 *
 * NOTE: in a real production app you would upload the SVG to S3 / R2 and
 * issue Prodigi a CDN URL. For this demo we keep it on the app server and
 * rely on Vercel's HTTPS-fronted /api routes.
 */
import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { hash: string } }) {
  const raw = decodeURIComponent(params.hash).replace(/[^a-z0-9.]/gi, '');
  if (!/^[a-f0-9]{32}\.(svg|png)$/i.test(raw)) {
    return NextResponse.json({ error: 'invalid hash' }, { status: 400 });
  }
  const dir = process.env.UPLOAD_DIR || path.join(process.cwd(), '.data');
  const file = path.join(dir, raw);

  try {
    const buf = await fs.readFile(file);
    const contentType = raw.endsWith('.svg') ? 'image/svg+xml; charset=utf-8' : 'image/png';
    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
}
