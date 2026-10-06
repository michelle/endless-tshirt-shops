import { validateDesign } from '@/lib/design.js';
import { renderPreviewPng } from '@/lib/render.js';

export const runtime = 'nodejs';

export async function GET(request) {
  const q = Object.fromEntries(new URL(request.url).searchParams);
  const v = validateDesign(q);
  if (!v.ok) return Response.json({ error: v.error }, { status: 400 });
  const png = renderPreviewPng(v.design, Math.min(1200, Math.max(300, Number(q.w) || 900)));
  return new Response(png, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400, immutable' } });
}
