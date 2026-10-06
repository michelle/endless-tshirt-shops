'use strict';
const { renderPng } = require('./_lib/design');
const { verify } = require('./_lib/token');
const { validateDesign } = require('./_lib/spec');
const { parseBody } = require('./_lib/http');

module.exports = async (req, res) => {
  try {
    // POST = low-resolution designer preview (unsigned, capped).
    if (req.method === 'POST') {
      const body = parseBody(req);
      const v = validateDesign(body);
      if (!v.ok) return res.status(400).json({ error: v.errors.join(' '), errors: v.errors });
      const width = Math.min(1100, Math.max(320, Number(body.width) || 760));
      const png = await renderPng(v.spec, width);
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).send(png);
    }

    // GET = print-resolution asset for Prodigi, authenticated by signed token.
    const token = (req.query && req.query.t) || '';
    const spec = verify(token);
    let width = 4677;
    if (req.query && req.query.w) {
      width = Math.min(4677, Math.max(200, Number(req.query.w)));
    }
    const png = await renderPng(spec, width);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return res.status(200).send(png);
  } catch (e) {
    console.error('design error', e);
    return res.status(400).json({ error: 'Could not render design.' });
  }
};
