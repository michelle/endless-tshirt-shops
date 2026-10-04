const { buildDesignSvg, W } = require('../lib/design');
const { renderPng } = require('../lib/render');
const { cleanDesignParams } = require('../lib/params');

const SHIRTS = {
  black: '#191919',
  navy: '#1d2b4f',
  charcoal: '#3b4149',
};

// GET /api/preview?when&lat&lon&place&caption&color — on-shirt preview for the storefront
module.exports = async (req, res) => {
  try {
    const u = new URL(req.url, 'http://x');
    const params = cleanDesignParams(Object.fromEntries(u.searchParams));
    const color = SHIRTS[String(u.searchParams.get('color') || 'black').toLowerCase()] || SHIRTS.black;
    const svg = buildDesignSvg(params);
    const png = renderPng(svg, 900, color);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.status(200).end(png);
  } catch (e) {
    res.status(400).json({ error: e.message, stack: String(e.stack || '').split('\n').slice(0, 4) });
  }
};
