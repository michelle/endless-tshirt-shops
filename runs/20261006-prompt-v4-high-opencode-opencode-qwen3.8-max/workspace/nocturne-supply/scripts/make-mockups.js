// Composites rendered artwork onto flat-lay t-shirt mockups for visual review
// (and reused by the storefront preview). Usage: node scripts/make-mockups.js
const fs = require('fs');
const path = require('path');
const { renderPNG } = require('../lib/design');

const SAMPLES = path.join(__dirname, '..', 'samples');

// Flat-lay unisex tee, viewBox 0 0 800 900
const TEE_PATH =
  'M310,95 C345,68 455,68 490,95 L628,148 C662,163 690,196 705,240 L718,296 C722,312 714,327 699,333 L613,364 C600,369 586,363 580,350 L566,318 ' +
  'C563,311 557,307 550,308 L556,756 C556,776 542,790 522,790 L278,790 C258,790 244,776 244,756 L250,308 C243,307 237,311 234,318 L220,350 ' +
  'C214,363 200,369 187,364 L101,333 C86,327 78,312 82,296 L95,240 C110,196 138,163 172,148 Z';

const SHIRT_HEX = {
  black: '#1b1b1f',
  'navy blue': '#20293f',
  'dark heather grey': '#4b4b52',
  burgundy: '#57242f',
  army: '#3f4632',
  white: '#f5f3ee',
  cream: '#f0ead9',
};

function mockupSVG(artworkPngB64, shirtColor) {
  const hex = SHIRT_HEX[shirtColor] || '#1b1b1f';
  const dark = shirtColor !== 'white' && shirtColor !== 'cream';
  // chest print area: ~41% of body width, positioned mid-chest
  const px = 236, py = 236, pw = 328;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1800" viewBox="0 0 800 900">
  <defs>
    <linearGradient id="shade" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#000" stop-opacity="0.16"/>
      <stop offset="18%" stop-color="#000" stop-opacity="0.03"/>
      <stop offset="50%" stop-color="#fff" stop-opacity="0.05"/>
      <stop offset="82%" stop-color="#000" stop-opacity="0.03"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0.16"/>
    </linearGradient>
    <clipPath id="tee"><path d="${TEE_PATH}"/></clipPath>
  </defs>
  <rect width="800" height="900" fill="#e9e5dd"/>
  <path d="${TEE_PATH}" fill="${hex}"/>
  <g clip-path="url(#tee)">
    <rect width="800" height="900" fill="url(#shade)"/>
    <image href="data:image/png;base64,${artworkPngB64}" x="${px}" y="${py}" width="${pw}" height="${pw}" preserveAspectRatio="xMidYMid meet"/>
  </g>
  <path d="M310,95 C345,130 455,130 490,95" fill="none" stroke="${dark ? '#00000055' : '#00000022'}" stroke-width="7"/>
  <path d="${TEE_PATH}" fill="none" stroke="${dark ? '#00000040' : '#00000028'}" stroke-width="2.5"/>
</svg>`;
}

if (require.main === module) {
  for (const f of fs.readdirSync(SAMPLES).filter((f) => f.endsWith('.png') && fs.existsSync(path.join(SAMPLES, f.replace('.png', '.json'))))) {
    const shirt = JSON.parse(
      fs.readFileSync(path.join(SAMPLES, f.replace('.png', '.json')), 'utf8')
    ).shirtColor;
    const b64 = fs.readFileSync(path.join(SAMPLES, f)).toString('base64');
    const svg = mockupSVG(b64, shirt);
    const png = renderPNG(svg, 1600);
    fs.writeFileSync(path.join(SAMPLES, f.replace('.png', '-mockup.png')), png);
    console.log('mockup:', f.replace('.png', '-mockup.png'));
  }
}

module.exports = { mockupSVG, TEE_PATH, SHIRT_HEX };
