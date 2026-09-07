import { renderArtwork, validSignature } from '@/lib/artwork';
import { selectionSchema } from '@/lib/catalog';
export const runtime = 'nodejs';
export const maxDuration = 30;
export async function GET(request: Request) {
  const p = new URL(request.url).searchParams;
  const s = selectionSchema.safeParse({
    timestamp: Number(p.get('timestamp')),
    fit: p.get('fit'),
    size: 'M',
  });
  if (
    !s.success ||
    !validSignature(s.data.timestamp, s.data.fit, p.get('signature') || '')
  )
    return new Response('Not found', { status: 404 });
  const png = await renderArtwork(s.data.timestamp, s.data.fit);
  return new Response(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Content-Disposition': `inline; filename="datetime-${s.data.timestamp}.png"`,
    },
  });
}
