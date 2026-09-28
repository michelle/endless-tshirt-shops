import sharp from 'sharp';
import { INKS, STYLES, TEXT_RE, type StyleId } from '@/lib/catalog';
import { designToPrintSvg, PRINT_HEIGHT, PRINT_WIDTH } from '@/lib/print-svg';
import { verifySignature } from '@/lib/sign';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const text = (params.get('text') ?? '').trim();
  const style = params.get('style') ?? '';
  const ink = params.get('ink') ?? '';
  const sig = params.get('sig') ?? '';

  if (!TEXT_RE.test(text)) return Response.json({ error: 'Invalid text' }, { status: 400 });
  if (!STYLES.includes(style as StyleId)) return Response.json({ error: 'Invalid style' }, { status: 400 });
  if (!INKS[ink]) return Response.json({ error: 'Invalid ink' }, { status: 400 });
  if (!verifySignature(text, style, ink, sig)) {
    return Response.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const svg = designToPrintSvg(text, style as StyleId, INKS[ink].hex);
  const png = await sharp(Buffer.from(svg), { limitInputPixels: false })
    .resize(PRINT_WIDTH, PRINT_HEIGHT)
    .png()
    .toBuffer();

  return new Response(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
