import { verify } from '@/lib/sign.js';
import { decodeDesign } from '@/lib/design.js';
import { renderPrintPng } from '@/lib/render.js';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Print-ready artwork for Prodigi. Tokens are only issued after payment has been confirmed.
export async function GET(_request, { params }) {
  const { token } = await params;
  const payload = verify(decodeURIComponent(token).replace(/\.png$/, ''));
  if (!payload || payload.t !== 'print') return new Response('Not found', { status: 404 });
  const v = decodeDesign(payload.design);
  if (!v.ok) return new Response('Not found', { status: 404 });
  const png = renderPrintPng(v.design);
  return new Response(png, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'private, max-age=3600' } });
}
