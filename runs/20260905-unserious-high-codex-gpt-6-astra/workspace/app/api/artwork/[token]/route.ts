import { verifyMoment } from '@/lib/server';
import { renderArtwork } from '@/lib/artwork';
export const runtime = 'nodejs';
export const maxDuration = 30;
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  let moment;
  try { moment = verifyMoment(token); } catch { return new Response('Artwork not found', { status: 404 }); }
  const png = await renderArtwork(moment.timestamp);
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png', 'Content-Disposition': `inline; filename="datetime-${moment.timestamp}.png"`, 'Cache-Control': 'public, max-age=31536000, immutable' } });
}
