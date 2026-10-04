const { buildDesignSvg, W } = require('../lib/design');
const { renderPng } = require('../lib/render');
const { cleanDesignParams } = require('../lib/params');
const { verify } = require('../lib/sign');

// GET /api/design?when&lat&lon&place&caption&sig — full-resolution transparent
// print file (4665x5844 @ 300dpi). This is the URL handed to Prodigi as the print asset.
// Signature prevents arbitrary third-party use of the render endpoint.
module.exports = async (req, res) => {
  try {
    const u = new URL(req.url, 'http://x');
    const q = Object.fromEntries(u.searchParams);
    const params = cleanDesignParams(q);
    if (!verify(params, q.sig)) {
      res.status(403).json({ error: 'bad signature' });
      return;
    }
    const svg = buildDesignSvg(params);
    const png = renderPng(svg, W); // full print resolution, transparent background
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.status(200).end(png);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};
