// Local render test: node test/render-test.js
const fs = require('fs');
const { buildDesignSvg, W } = require('../lib/design');
const { renderPng } = require('../lib/render');

const svg = buildDesignSvg({
  when: '2022-06-14T22:30:00Z',
  lat: 48.8566,
  lon: 2.3522,
  place: 'Paris, France',
  caption: 'The night we met',
});
fs.writeFileSync('/tmp/design.svg', svg);
const preview = renderPng(svg, 900, '#101418');
fs.writeFileSync('/tmp/design-preview.png', preview);
console.log('preview bytes:', preview.length);
