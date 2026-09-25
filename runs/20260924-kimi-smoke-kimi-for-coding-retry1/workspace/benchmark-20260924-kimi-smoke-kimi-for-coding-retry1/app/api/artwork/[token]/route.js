import { verifyPayload } from '@/lib/artworkSig';
import { renderArtworkPng } from '@/lib/renderServer';
import { normalizeDesign, PREVIEW_W, PREVIEW_H, PRINT_W, PRINT_H } from '@/lib/scene';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Statelessly regenerates the print artwork from a signed payload.
// Prodigi (and our own UI) fetch print-ready PNGs from here — no storage needed.
export async function GET(req, { params }) {
  const token = decodeURIComponent(params.token).replace(/\.png$/i, '');
  const payload = verifyPayload(token);
  if (!payload || !payload.d) {
    return new Response('invalid artwork token', { status: 403 });
  }

  let design;
  try {
    design = normalizeDesign(payload.d);
  } catch {
    return new Response('invalid design', { status: 400 });
  }

  const full = payload.f === 1;
  const W = full ? PRINT_W : PREVIEW_W;
  const H = full ? PRINT_H : PREVIEW_H;

  const url = new URL(req.url);
  const rawW = Number(url.searchParams.get('w'));
  const requested = Number.isFinite(rawW) && rawW > 0 ? Math.min(2400, Math.max(64, rawW)) : 0;
  const targetW = requested || W;
  const targetH = Math.round((targetW * H) / W);

  try {
    const png = renderArtworkPng(design, targetW, targetH);
    return new Response(new Uint8Array(png), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (e) {
    console.error('artwork render failed', e);
    return new Response('render failed', { status: 500 });
  }
}
