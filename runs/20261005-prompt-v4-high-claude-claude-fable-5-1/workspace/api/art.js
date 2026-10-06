// Print-ready artwork. GET /art/<spec>/<sig>.png  (rewritten to /api/art?d=&sig=)
// Full size is the exact Prodigi print area (4680x5790 @ ~300 DPI) with a transparent background.
import { decodeSpec, verify } from '../lib/spec.js';
import { fetchDay } from '../lib/weather.js';
import { renderSVG, PRINT_W } from '../public/lib/dayprint.js';
import { svgToPng } from '../lib/render.js';
import { error, query, methodNotAllowed } from '../lib/http.js';

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return methodNotAllowed(res, 'GET, HEAD');
  const q = query(req);
  const d = String(q.d || ''), sig = String(q.sig || '');
  if (!d || !verify(d, sig)) return error(res, 403, 'Invalid or unsigned artwork link');
  let spec;
  try { spec = decodeSpec(d); } catch (e) { return error(res, 400, e.message); }
  const w = q.w ? Math.max(200, Math.min(PRINT_W, Math.round(Number(q.w)) || PRINT_W)) : PRINT_W;
  try {
    const day = await fetchDay({ lat: spec.place.lat, lon: spec.place.lon, date: spec.date, unit: spec.unit, place: spec.place });
    const svg = renderSVG(day, { shirt: spec.shirt, caption: spec.caption });
    const png = await svgToPng(svg, w === PRINT_W ? undefined : w);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Length', String(png.length));
    res.setHeader('Cache-Control', 'public, max-age=31536000, s-maxage=31536000, immutable');
    res.setHeader('Content-Disposition', `inline; filename="dayprint-${spec.date}.png"`);
    res.end(req.method === 'HEAD' ? undefined : png);
  } catch (e) {
    error(res, 502, 'Could not render artwork: ' + e.message);
  }
}
