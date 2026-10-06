// GET signed print file. Full-resolution transparent PNG for Prodigi, or a small
// on-shirt-colour preview (preview=1) used as the Stripe Checkout product image.
import { send, query } from '../lib/http.js';
import { verifyPrintParams } from '../lib/sign.js';
import { renderPNG } from '../lib/render.js';
import { shirtColor, validateDesign } from '../public/catalog.js';

export default async function handler(req, res) {
  const q = query(req);
  const raw = verifyPrintParams(q);
  const shirt = shirtColor(q.shirt);
  if (!raw || !shirt) return send(res, 403, { error: 'Invalid or unsigned print URL' });
  const { ok, design } = validateDesign(raw);
  if (!ok) return send(res, 422, { error: 'Design no longer valid' });

  const preview = q.preview === '1';
  const png = await renderPNG(design, {
    dark: shirt.dark,
    background: preview ? shirt.hex : null,
    width: preview ? 900 : undefined,
  });
  send(res, 200, png, {
    'Content-Type': 'image/png',
    'Cache-Control': 'public, max-age=31536000, immutable',
    'Content-Disposition': `inline; filename="lifeline-${shirt.id}${preview ? '-preview' : ''}.png"`,
  });
}
