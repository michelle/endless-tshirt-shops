import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { designSvg, normalizeDesign } from '@/lib/design';
import { stripeClient } from '@/lib/stripe';
export const runtime = 'nodejs';
export const maxDuration = 60;
export async function GET(_request: NextRequest, context: { params: Promise<{ sessionId: string }> }) {
  try {
    const { sessionId } = await context.params;
    if (!/^cs_(test_)?[A-Za-z0-9]+$/.test(sessionId)) return new NextResponse('Invalid session.', { status: 400 });
    const session = await stripeClient().checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== 'paid') return new NextResponse('Print art is available after payment.', { status: 403 });
    const design = normalizeDesign(session.metadata);
    const png = await sharp(Buffer.from(designSvg(design))).png({ compressionLevel: 8 }).toBuffer();
    return new NextResponse(new Uint8Array(png), { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400', 'Content-Disposition': 'inline; filename="our-orbit-print.png"' } });
  } catch (error) {
    console.error('Print render error', error);
    return new NextResponse('Print art unavailable.', { status: 500 });
  }
}
