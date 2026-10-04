// GET /api/health — deployment diagnostics
module.exports = async (req, res) => {
  const out = { node: process.version, platform: process.platform, arch: process.arch, checks: {} };
  try {
    require('@resvg/resvg-js');
    out.checks.resvg = 'ok';
  } catch (e) {
    out.checks.resvg = `FAIL: ${e.message}`;
  }
  try {
    const fs = require('fs');
    const path = require('path');
    out.checks.fonts = fs.readdirSync(path.join(__dirname, '..', 'assets', 'fonts'));
  } catch (e) {
    out.checks.fonts = `FAIL: ${e.message}`;
  }
  try {
    const { renderPng } = require('../lib/render');
    const png = renderPng('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="red"/></svg>', 10);
    out.checks.render = `ok ${png.length}b`;
  } catch (e) {
    out.checks.render = `FAIL: ${e.message}`;
  }
  res.status(200).json(out);
};
