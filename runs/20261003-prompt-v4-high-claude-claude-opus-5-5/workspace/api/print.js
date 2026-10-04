import { getStripe } from '../lib/config.js';
import { verifyId } from '../lib/sign.js';
import { unpackDesign } from '../public/js/design.js';
import { renderPrintPNG } from '../lib/render.js';

// GET /print/<session_id>.<sig>.png — the file Prodigi downloads and prints.
export async function GET(request) {
  const file = new URL(request.url).searchParams.get('file') || '';
  const m = /^(cs_(?:test|live)_[A-Za-z0-9]+)\.([A-Za-z0-9_-]+)\.png$/.exec(file);
  if (!m || !verifyId(m[1], m[2])) return new Response('Not found', { status: 404 });
  let session;
  try {
    session = await getStripe().checkout.sessions.retrieve(m[1]);
  } catch {
    return new Response('Not found', { status: 404 });
  }
  if (session.metadata?.kind !== 'transit-tee') return new Response('Not found', { status: 404 });
  const png = await renderPrintPNG(unpackDesign(session.metadata), session.metadata.garment);
  return new Response(png, {
    headers: {
      'content-type': 'image/png',
      'content-length': String(png.length),
      'cache-control': 'public, max-age=31536000, immutable',
      'content-disposition': `inline; filename="${m[1]}.png"`,
    },
  });
}
