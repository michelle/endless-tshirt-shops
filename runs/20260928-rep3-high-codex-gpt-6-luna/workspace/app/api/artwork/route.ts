import { makeArtwork, cleanCustomization, openCustomization, sealCustomization } from '@/lib/artwork';
import { NextResponse } from 'next/server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(req: Request) {
  try {
    const customization = cleanCustomization(await req.json());
    if (!customization.name || !customization.place) return NextResponse.json({error:'Add a name and a place to grow your preview.'},{status:400});
    return NextResponse.json({token:sealCustomization(customization)},{headers:{'Cache-Control':'no-store'}});
  } catch { return NextResponse.json({error:'Artwork preview is unavailable.'},{status:503}); }
}
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('token') || '';
  const customization = openCustomization(token);
  if (!customization) return new Response('Artwork expired or unavailable', {status:404});
  const png = makeArtwork(customization);
  return new Response(new Uint8Array(png), { headers: { 'Content-Type':'image/png', 'Cache-Control':'public, max-age=300, s-maxage=3600', 'Content-Disposition':'inline; filename="little-night-garden.png"' } });
}
