const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

const FONT_DIR = path.join(__dirname, '..', 'assets', 'fonts');
const fontFiles = ['Lato-Regular.ttf', 'Lato-Bold.ttf', 'PTSerif-Regular.ttf', 'PTSerif-Italic.ttf']
  .map((f) => path.join(FONT_DIR, f));

// Render an SVG string to a PNG buffer. background: null => transparent
function renderPng(svg, width, background = null) {
  const opts = {
    fitTo: { mode: 'width', value: width },
    font: {
      fontFiles,
      loadSystemFonts: false,
      defaultFontFamily: 'Lato',
    },
  };
  if (background) opts.background = background;
  const resvg = new Resvg(svg, opts);
  return resvg.render().asPng();
}

module.exports = { renderPng };
