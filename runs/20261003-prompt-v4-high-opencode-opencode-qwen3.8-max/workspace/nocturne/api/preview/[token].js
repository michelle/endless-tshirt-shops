// GET /api/preview/[token]?s=<base64url spec> — rendered chart preview (~1200 px wide).
// Content-addressed: the `s` param is verified against the token, so URLs are safe to
// cache immutably at the CDN. Falls back to KV when the query spec is absent.
const { renderPreview } = require('../../lib/render');
const { normalizeDesign } = require('../../lib/design');
const { json, kvGet } = require('../../lib/server');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'GET only' });
  const url = new URL(req.url, 'http://x');
  const token = (url.pathname.split('/').pop() || '').replace(/\.png$/, '');

  let design = null;
  const s = url.searchParams.get('s');
  if (s) {
    try {
      const spec = JSON.parse(Buffer.from(s, 'base64url').toString('utf8'));
      const norm = normalizeDesign(spec);
      if (norm.token === token && !norm.errors.length) design = norm.design;
    } catch { /* fall through to KV */ }
  }
  if (!design) {
    design = await kvGet(`design:${token}`).catch(() => null);
    if (design) {
      const norm = normalizeDesign(design);
      if (norm.token !== token || norm.errors.length) design = null;
    }
  }
  if (!design) return json(res, 404, { error: 'unknown design token' });

  const buffer = await renderPreview(design, 1400);
  res.writeHead(200, {
    'Content-Type': 'image/png',
    'Cache-Control': 'public, max-age=604800, immutable',
    'Content-Length': buffer.length,
  });
  res.end(buffer);
};
