// GET /api/print/[token]?s=<base64url spec> — FULL print-resolution artwork
// (4680 × 5790 px = the exact 300 dpi front print area of the Bella+Canvas 3001).
// This URL is what we hand to Prodigi as the print asset. Content-addressed & verified.
const { renderDesign } = require('../../lib/render');
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

  const { buffer } = renderDesign(design);
  res.writeHead(200, {
    'Content-Type': 'image/png',
    'Cache-Control': 'public, max-age=604800, immutable',
    'Content-Length': buffer.length,
  });
  res.end(buffer);
};
