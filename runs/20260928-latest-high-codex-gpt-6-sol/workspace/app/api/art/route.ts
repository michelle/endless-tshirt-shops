import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { timingSafeEqual } from 'crypto';
import { signArt } from '@/lib/art-signature';
import { artSvg, parseDesign } from '@/lib/design';
export const runtime = 'nodejs';
export async function GET(request: NextRequest) {
  try {
    const encoded = request.nextUrl.searchParams.get('d') || '';
    if (!encoded || encoded.length > 1000) throw new Error('Invalid design');
    const design = parseDesign(JSON.parse(Buffer.from(encoded,'base64url').toString()));
    const format = request.nextUrl.searchParams.get('format');
    if (format === 'png') {
      const sig = request.nextUrl.searchParams.get('sig') || '';
      const expected = signArt(encoded);
      if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return new NextResponse('Forbidden',{status:403});
      const png = await sharp(Buffer.from(artSvg(design)), { density: 180 }).resize(3000,4000).png().toBuffer();
      return new NextResponse(new Uint8Array(png), {headers:{'Content-Type':'image/png','Cache-Control':'public, max-age=31536000, immutable'}});
    }
    return new NextResponse(artSvg(design), {headers:{'Content-Type':'image/svg+xml','Cache-Control':'public, max-age=3600','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; sandbox"}});
  } catch { return new NextResponse('Invalid design', {status:400}); }
}
