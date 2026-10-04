const { visibleStars, DEG } = require('./astro');
const stars = require('../data/stars.json');

// Print canvas: Prodigi Gildan 64000 front print area
const W = 4665;
const H = 5844;

const CX = W / 2;
const CY = 1950;
const R_RING = 1520;   // outer decorative ring
const R_SKY = 1430;    // star field radius

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Map B-V color index to a printed ink tint (cream base for dark shirts)
function starColor(bv) {
  if (bv < 0.05) return { c: '#d8e6ff', g: 'gBlue' };
  if (bv < 0.35) return { c: '#eef1ff', g: 'gWhiteBlue' };
  if (bv < 0.7) return { c: '#fff7ea', g: 'gWhite' };
  if (bv < 1.1) return { c: '#ffeccb', g: 'gWarm' };
  if (bv < 1.6) return { c: '#ffd9a3', g: 'gOrange' };
  return { c: '#ffc285', g: 'gRed' };
}

function starRadius(mag) {
  return Math.max(2.6, 16.5 - 2.9 * mag);
}

// Lit portion of the moon as an SVG path (phase p: 0 new, 0.5 full)
function moonLitPath(cx, cy, r, p) {
  const c = Math.cos(2 * Math.PI * p);
  const rx = Math.max(0.5, Math.abs(c) * r);
  const sweepOuter = p <= 0.5 ? 1 : 0;
  const sweepTerm = c < 0 ? (p <= 0.5 ? 1 : 0) : (p <= 0.5 ? 0 : 1);
  return `M ${cx} ${cy - r} A ${r} ${r} 0 0 ${sweepOuter} ${cx} ${cy + r} A ${rx} ${r} 0 0 ${sweepTerm} ${cx} ${cy - r} Z`;
}

function fmtDate(d) {
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  return `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function fmtCoords(lat, lon) {
  const la = `${Math.abs(lat).toFixed(2)}° ${lat >= 0 ? 'N' : 'S'}`;
  const lo = `${Math.abs(lon).toFixed(2)}° ${lon >= 0 ? 'E' : 'W'}`;
  return `${la}  ·  ${lo}`;
}

function project(alt, az) {
  const r = R_SKY * (1 - alt / 90);
  const a = az * DEG;
  return [CX + r * Math.sin(a), CY - r * Math.cos(a)];
}

// Build the full-shirt SVG. opts: { when: ISO string, lat, lon, place, caption, ink }
function buildDesignSvg(opts) {
  const when = new Date(opts.when);
  const lat = Number(opts.lat);
  const lon = Number(opts.lon);
  const ink = opts.ink || '#f2ead8';
  const { stars: vis, moon } = visibleStars(stars, when, lat, lon);

  const defs = [];
  for (const g of ['gBlue','gWhiteBlue','gWhite','gWarm','gOrange','gRed']) {
    const col = { gBlue:'#d8e6ff', gWhiteBlue:'#eef1ff', gWhite:'#fff7ea', gWarm:'#ffeccb', gOrange:'#ffd9a3', gRed:'#ffc285' }[g];
    defs.push(`<radialGradient id="${g}"><stop offset="0%" stop-color="${col}" stop-opacity="0.55"/><stop offset="45%" stop-color="${col}" stop-opacity="0.12"/><stop offset="100%" stop-color="${col}" stop-opacity="0"/></radialGradient>`);
  }

  const sky = [];
  // faint altitude grid (30° / 60° elevation circles)
  sky.push(`<circle cx="${CX}" cy="${CY}" r="${R_SKY / 3}" fill="none" stroke="${ink}" stroke-opacity="0.13" stroke-width="3"/>`);
  sky.push(`<circle cx="${CX}" cy="${CY}" r="${(R_SKY * 2) / 3}" fill="none" stroke="${ink}" stroke-opacity="0.13" stroke-width="3"/>`);

  // stars
  for (const s of vis) {
    const [x, y] = project(s.alt, s.az);
    const r = starRadius(s.mag);
    const { c, g } = starColor(s.bv);
    if (s.mag < 1.6) {
      sky.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(r * 3.1).toFixed(1)}" fill="url(#${g})"/>`);
    }
    const op = s.mag > 3.8 ? 0.8 : 0.95;
    sky.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${c}" fill-opacity="${op}"/>`);
  }

  // moon
  if (moon) {
    const [mx, my] = project(Math.max(moon.alt, 1), moon.az);
    const mr = 74;
    sky.push(`<circle cx="${mx.toFixed(1)}" cy="${my.toFixed(1)}" r="${mr * 2.2}" fill="url(#gWhite)"/>`);
    sky.push(`<circle cx="${mx.toFixed(1)}" cy="${my.toFixed(1)}" r="${mr}" fill="${ink}" fill-opacity="0.35"/>`);
    sky.push(`<path d="${moonLitPath(mx, my, mr, moon.phase)}" fill="#fff7ea"/>`);
  }

  const overlay = [];
  // ring + ticks
  overlay.push(`<circle cx="${CX}" cy="${CY}" r="${R_RING}" fill="none" stroke="${ink}" stroke-width="9"/>`);
  for (let i = 0; i < 72; i++) {
    const a = i * 5 * DEG;
    const long = i % 6 === 0;
    const r1 = R_RING + 16;
    const r2 = R_RING + (long ? 74 : 44);
    const x1 = CX + r1 * Math.sin(a), y1 = CY - r1 * Math.cos(a);
    const x2 = CX + r2 * Math.sin(a), y2 = CY - r2 * Math.cos(a);
    overlay.push(`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${ink}" stroke-width="${long ? 7 : 4}"/>`);
  }
  // cardinal letters
  const cardinals = [['N', 0], ['E', 90], ['S', 180], ['W', 270]];
  for (const [letter, deg] of cardinals) {
    const a = deg * DEG;
    const rr = R_RING + 190;
    const x = CX + rr * Math.sin(a), y = CY - rr * Math.cos(a);
    overlay.push(`<text x="${x}" y="${y}" font-family="Lato" font-weight="400" font-size="104" letter-spacing="6" fill="${ink}" text-anchor="middle" dominant-baseline="central">${letter}</text>`);
  }

  // caption block
  const capY = 4150;
  const caption = (opts.caption || '').trim();
  if (caption) {
    overlay.push(`<text x="${CX}" y="${capY}" font-family="PT Serif" font-style="italic" font-size="196" fill="${ink}" text-anchor="middle">${esc(caption)}</text>`);
  }
  const meta1 = `${(opts.place || '').toUpperCase()}${opts.place ? '   ·   ' : ''}${fmtDate(when).toUpperCase()}`;
  const meta2 = fmtCoords(lat, lon).toUpperCase();
  const m1y = caption ? capY + 260 : capY;
  overlay.push(`<text x="${CX}" y="${m1y}" font-family="Lato" font-weight="700" font-size="86" letter-spacing="16" fill="${ink}" text-anchor="middle">${esc(meta1)}</text>`);
  overlay.push(`<text x="${CX}" y="${m1y + 170}" font-family="Lato" font-weight="400" font-size="72" letter-spacing="14" fill="${ink}" fill-opacity="0.85" text-anchor="middle">${esc(meta2)}</text>`);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>${defs.join('')}</defs>
<clipPath id="sky"><circle cx="${CX}" cy="${CY}" r="${R_SKY}"/></clipPath>
<g clip-path="url(#sky)">${sky.join('')}</g>
${overlay.join('')}
</svg>`;
}

module.exports = { buildDesignSvg, W, H };
