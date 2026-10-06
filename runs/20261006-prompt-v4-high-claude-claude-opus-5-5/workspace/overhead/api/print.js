// Renders the print file (transparent 4680×5790 PNG @300 DPI) for Prodigi, or a small
// product preview on a shirt-coloured background for Stripe Checkout (&preview=<colour>).
import { decodeDesign, verify } from '../lib/design-token.js';
import { renderSVG, validateDesign, SHIRTS } from '../public/shared/render.js';
import { getFonts } from '../lib/fonts.js';
import { svgToPng } from '../lib/raster.js';

export async function GET(request) {
  const q = new URL(request.url).searchParams;
  const token = q.get('d') || '';
  if (!verify(token, q.get('s'))) return new Response('Invalid signature', { status: 403 });
  let design;
  try {
    design = validateDesign(decodeDesign(token), getFonts());
  } catch (e) {
    return new Response(e.message, { status: 400 });
  }
  const preview = SHIRTS[q.get('preview')];
  const { svg } = preview
    ? renderSVG(design, getFonts(), { crop: true, background: preview.hex, width: 760, height: 880 })
    : renderSVG(design, getFonts());
  const png = await svgToPng(svg);
  return new Response(png, {
    headers: {
      'content-type': 'image/png',
      'content-length': String(png.length),
      // Design tokens are immutable: cache hard at the edge.
      'cache-control': 'public, max-age=31536000, immutable',
      ...(preview ? {} : { 'content-disposition': 'inline; filename="overhead-print.png"' }),
    },
  });
}
