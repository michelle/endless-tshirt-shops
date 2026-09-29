import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { designSvg, parseDesign } from '@/lib/store';
import { stripeClient, verifySession } from '@/lib/server';
export const runtime = 'nodejs';
export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams;
    let design;
    let width: number;
    if (q.get('preview') === '1') {
      design = parseDesign(Object.fromEntries(q.entries()));
      width = 700;
    } else {
      const id = q.get('session') || '';
      const sig = q.get('sig') || '';
      if (!id.startsWith('cs_') || !verifySession(id, sig)) return new NextResponse('Unauthorized', { status: 401 });
      const session = await stripeClient().checkout.sessions.retrieve(id);
      if (session.payment_status !== 'paid') return new NextResponse('Payment required', { status: 402 });
      design = parseDesign(session.metadata);
      width = 3600;
    }
    const png = await sharp(Buffer.from(designSvg(design))).resize({width}).png().toBuffer();
    return new NextResponse(new Uint8Array(png), { headers: { 'Content-Type': 'image/png', 'Cache-Control': q.get('preview') === '1' ? 'public, max-age=60' : 'public, max-age=31536000, immutable' } });
  } catch (err) { console.error('Artwork error', err); return new NextResponse('Artwork unavailable', { status: 400 }); }
}
