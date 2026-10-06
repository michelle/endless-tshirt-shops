// GET /api/art?d=<urlenc json spec>&sig=<hmac> — the print file Prodigi fetches.
// 4677×5787 px PNG = exactly 300 dpi at Prodigi's Bella+Canvas 3001 print area.
import { verifySpec, b64 } from '../lib/sign.mjs';
import { renderSVGtoPNG } from '../lib/render.mjs';
import { buildDesignSVG, PRINT_W, PRINT_H } from '../public/lib/design.mjs';

export default async function handler(req, res) {
  const url = new URL(req.url, 'http://x');
  const d = url.searchParams.get('d');
  const sig = url.searchParams.get('sig');
  if (!d || !sig) { res.statusCode = 400; return res.end('missing d or sig'); }
  let spec;
  try { spec = b64.decode(d); } catch { res.statusCode = 400; return res.end('bad spec encoding'); }
  if (!verifySpec(spec, sig)) { res.statusCode = 403; return res.end('signature mismatch'); }
  try {
    const svg = buildDesignSVG(spec);
    const png = renderSVGtoPNG(svg, PRINT_W);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('X-Print-Size', `${PRINT_W}x${PRINT_H}@300dpi`);
    res.statusCode = 200;
    res.end(png);
  } catch (e) {
    res.statusCode = 500;
    res.end(`render failed: ${e.message}`);
  }
}
