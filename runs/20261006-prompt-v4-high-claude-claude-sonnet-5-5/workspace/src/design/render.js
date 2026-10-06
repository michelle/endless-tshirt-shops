'use strict';
const { seeded, hashHex } = require('./prng');
const { generate, fieldStars } = require('./constellation');
const text = require('./text');
const { prettyDate } = require('./params');

const W = 4680;
const H = 5790;
const CX = W / 2;
const CY = 1960;
const FIELD_R = 1400;

const INKS = {
  dark: {
    starlight: { main: '#F4F7FF', accent: '#FFE29A' },
    gilt: { main: '#F6D58B', accent: '#FFF3D1' },
    aurora: { main: '#8CF0DC', accent: '#CDBEFF' },
    rose: { main: '#FFB8CC', accent: '#FFE8BD' },
  },
  light: {
    starlight: { main: '#16233F', accent: '#A8700A' },
    gilt: { main: '#7D5300', accent: '#3E2A00' },
    aurora: { main: '#0C6B66', accent: '#463894' },
    rose: { main: '#A3194A', accent: '#62102F' },
  },
};

const n1 = (v) => Math.round(v * 10) / 10;

function sparkle(x, y, R, k) {
  k = k ?? R * 0.13;
  return `M${n1(x)} ${n1(y - R)}Q${n1(x + k)} ${n1(y - k)} ${n1(x + R)} ${n1(y)}Q${n1(x + k)} ${n1(y + k)} ${n1(x)} ${n1(y + R)}Q${n1(x - k)} ${n1(y + k)} ${n1(x - R)} ${n1(y)}Q${n1(x - k)} ${n1(y - k)} ${n1(x)} ${n1(y - R)}Z`;
}

function seedKey(d) {
  return [d.name.toLowerCase(), d.date, d.variant].join('|');
}

function starCount(name) {
  const letters = [...name.normalize('NFD').replace(/[^A-Za-z]/g, '')];
  const unique = letters.length || 5;
  return Math.max(6, Math.min(16, unique));
}

// design: normalized design params; tone: 'dark' | 'light' (shirt fabric); animate: preview-only twinkle/draw-in.
function renderSvg(design, { tone = 'dark', animate = false, drawIn = false, idp = '' } = {}) {
  idp = String(idp).replace(/[^A-Za-z0-9]/g, '').slice(0, 12);
  const ink = INKS[tone === 'light' ? 'light' : 'dark'][design.palette];
  const seed = seedKey(design);
  const rng = seeded(seed);
  const n = starCount(design.name);
  const figure = generate(rng, n, FIELD_R);
  const letters = [...design.name.normalize('NFD').replace(/[^A-Za-z]/g, '').toUpperCase()];
  const glow = tone !== 'light';

  const fieldRng = seeded(seed + '|field');
  const field = fieldStars(fieldRng, FIELD_R, figure, 230, 78, 150);

  const sizeRng = seeded(seed + '|size');
  const radii = figure.stars.map((_, i) => (i === 0 ? 74 : 26 + Math.pow(sizeRng(), 1.5) * 30));

  const parts = [];
  const defs = [];
  if (glow) {
    defs.push(`<radialGradient id="${idp}gl"><stop offset="0" stop-color="${ink.main}" stop-opacity=".42"/><stop offset=".45" stop-color="${ink.main}" stop-opacity=".12"/><stop offset="1" stop-color="${ink.main}" stop-opacity="0"/></radialGradient>`);
    defs.push(`<radialGradient id="${idp}gla"><stop offset="0" stop-color="${ink.accent}" stop-opacity=".5"/><stop offset=".45" stop-color="${ink.accent}" stop-opacity=".14"/><stop offset="1" stop-color="${ink.accent}" stop-opacity="0"/></radialGradient>`);
  }

  // Frame: field ring, tick ring.
  const ring = [];
  ring.push(`<circle cx="${CX}" cy="${CY}" r="${FIELD_R + 40}" fill="none" stroke="${ink.main}" stroke-opacity=".55" stroke-width="7"/>`);
  const ticks = [];
  for (let a = 0; a < 360; a += 5) {
    const major = a % 30 === 0;
    const r0 = FIELD_R + 78;
    const r1 = r0 + (major ? 52 : 24);
    const rad = (a * Math.PI) / 180;
    ticks.push(`M${n1(CX + r0 * Math.sin(rad))} ${n1(CY - r0 * Math.cos(rad))}L${n1(CX + r1 * Math.sin(rad))} ${n1(CY - r1 * Math.cos(rad))}`);
  }
  ring.push(`<path d="${ticks.join('')}" fill="none" stroke="${ink.main}" stroke-opacity=".7" stroke-width="7"/>`);
  parts.push(`<g>${ring.join('')}</g>`);

  // Arc text in a band outside the tick ring.
  const caps = text.stack('caps');
  const bandR = FIELD_R + 190;
  const arcAttrs = `fill="${ink.main}" fill-opacity=".92" `;
  const top = text.arcPaths(caps, 'A NEWLY CATALOGUED CONSTELLATION', 80, 30, CX, CY, bandR, 'top', arcAttrs);
  const catalogue = `${hashHex(seed).slice(0, 4)}-${hashHex(seed + '|b').slice(0, 4)}`;
  const bottom = text.arcPaths(caps, `ONE OF ONE  ·  CATALOGUE ${catalogue}`, 80, 30, CX, CY, bandR, 'bottom', arcAttrs);
  parts.push(`<g>${top.paths.join('')}${bottom.paths.join('')}</g>`);
  const sideR = bandR + top.capHeight / 2;
  for (const side of [-1, 1]) {
    parts.push(`<path d="${sparkle(CX + side * sideR, CY, 46)}" fill="${ink.accent}"/>`);
  }

  // Field stars.
  const fieldPaths = [];
  const sparkPaths = [];
  const dots = [];
  field.forEach((s, i) => {
    const x = CX + s.x, y = CY + s.y;
    if (s.spark) sparkPaths.push(`<path d="${sparkle(x, y, 40, 5)}" fill="${ink.main}" fill-opacity="${n1(s.op)}"/>`);
    else dots.push(`<circle cx="${n1(x)}" cy="${n1(y)}" r="${n1(s.rad)}" fill="${ink.main}" fill-opacity="${n1(s.op * 100) / 100}"${animate && i % 3 === 0 ? ` class="tw" style="animation-delay:${(i % 11) * 0.37}s"` : ''}/>`);
  });
  fieldPaths.push(...dots, ...sparkPaths);
  parts.push(`<g>${fieldPaths.join('')}</g>`);

  // Lines, trimmed so they stop short of each star.
  const lines = [];
  figure.edges.forEach(([a, b], idx) => {
    const A = figure.stars[a], B = figure.stars[b];
    const dx = B.x - A.x, dy = B.y - A.y;
    const len = Math.hypot(dx, dy);
    const ux = dx / len, uy = dy / len;
    const g0 = radii[a] * 1.55 + 22, g1 = radii[b] * 1.55 + 22;
    const x1 = CX + A.x + ux * g0, y1 = CY + A.y + uy * g0;
    const x2 = CX + B.x - ux * g1, y2 = CY + B.y - uy * g1;
    lines.push(`<path d="M${n1(x1)} ${n1(y1)}L${n1(x2)} ${n1(y2)}"${animate && drawIn ? ` pathLength="1" class="ln" style="animation-delay:${(0.25 + idx * 0.09).toFixed(2)}s"` : ''}/>`);
  });
  parts.push(`<g fill="none" stroke="${ink.main}" stroke-opacity=".92" stroke-width="10" stroke-linecap="round">${lines.join('')}</g>`);

  // Stars and optional letter labels.
  const starParts = [];
  const labelParts = [];
  const mono = text.stack('mono');
  figure.stars.forEach((s, i) => {
    const x = CX + s.x, y = CY + s.y;
    const r = radii[i];
    const col = i === 0 ? ink.accent : ink.main;
    if (glow) starParts.push(`<circle cx="${n1(x)}" cy="${n1(y)}" r="${n1(r * (i === 0 ? 4.6 : 3.6))}" fill="url(#${idp}${i === 0 ? 'gla' : 'gl'})"/>`);
    const spike = r * (i === 0 ? 3.1 : 2.5);
    starParts.push(`<path d="${sparkle(x, y, spike, spike * 0.1)}" fill="${col}"/>`);
    if (i === 0) starParts.push(`<path d="${sparkle(x, y, spike * 0.62, spike * 0.1)}" fill="${col}" transform="rotate(45 ${n1(x)} ${n1(y)})"/>`);
    starParts.push(`<circle cx="${n1(x)}" cy="${n1(y)}" r="${n1(r * 0.62)}" fill="${col}"${animate && i % 2 === 0 ? ' class="tw2"' : ''}/>`);

    if (design.labels && letters[i]) {
      const nb = figure.edges.filter(([a, b]) => a === i || b === i).map(([a, b]) => figure.stars[a === i ? b : a]);
      let vx = 0, vy = 0;
      for (const q of nb) { const d = Math.hypot(q.x - s.x, q.y - s.y) || 1; vx += (q.x - s.x) / d; vy += (q.y - s.y) / d; }
      let m = Math.hypot(vx, vy);
      if (m < 0.2) { vx = 0.7; vy = -0.7; m = 1; }
      const off = spike + 54;
      const lx = x - (vx / m) * off, ly = y - (vy / m) * off;
      const lay = text.layout(mono, letters[i], 96, 0);
      labelParts.push(`<path fill="${ink.main}" fill-opacity=".85" d="${text.straightPath(lay, lx - lay.width / 2, ly + 34)}"/>`);
    }
  });
  parts.push(`<g>${starParts.join('')}</g>`);
  if (labelParts.length) parts.push(`<g>${labelParts.join('')}</g>`);

  // Title block under the ring.
  const italic = text.stack('displayItalic');
  const ink2 = ink.main;
  const maxW = 3500;
  const eyebrow = text.centeredPath(caps, 'THE CONSTELLATION OF', 86, 44, CX, 3990, maxW);
  parts.push(`<path fill="${ink2}" fill-opacity=".92" d="${eyebrow}"/>`);

  const display = design.name;
  const nameFit = text.fitSize(italic, display, 600, 4, maxW);
  const nameLay = text.layout(italic, display, nameFit.size, nameFit.tracking);
  const nameBase = 4520;
  parts.push(`<path fill="${ink2}" d="${text.straightPath(nameLay, CX - nameLay.width / 2, nameBase)}"/>`);

  // Divider ornament.
  const dy = nameBase + nameFit.size * 0.34 + 80;
  parts.push(`<path d="M${CX - 760} ${dy}H${CX - 110}M${CX + 110} ${dy}H${CX + 760}" stroke="${ink.accent}" stroke-width="7" fill="none" stroke-linecap="round"/>`);
  parts.push(`<path d="${sparkle(CX, dy, 62, 8)}" fill="${ink.accent}"/>`);

  // Date / place line.
  const dateTxt = prettyDate(design.date);
  const placeTxt = design.place.toUpperCase();
  let line = '';
  if (dateTxt && placeTxt) line = `DISCOVERED IN ${placeTxt}  ·  ${dateTxt}`;
  else if (dateTxt) line = `DISCOVERED ${dateTxt}`;
  else if (placeTxt) line = `DISCOVERED IN ${placeTxt}`;
  let y = dy + 200;
  if (line) {
    parts.push(`<path fill="${ink2}" fill-opacity=".92" d="${text.centeredPath(caps, line, 92, 34, CX, y, maxW)}"/>`);
    y += 250;
  }
  if (design.message) {
    const msg = design.message;
    const lay = text.layout(italic, msg, 170, 1);
    const fit = lay.width > maxW ? 170 * (maxW / lay.width) : 170;
    const fl = text.layout(italic, msg, fit, 1);
    parts.push(`<path fill="${ink.accent}" d="${text.straightPath(fl, CX - fl.width / 2, y)}"/>`);
  }

  const style = animate
    ? `<style>.ln{stroke-dasharray:1;stroke-dashoffset:1;animation:dr 1.1s ease-out forwards}@keyframes dr{to{stroke-dashoffset:0}}.tw{animation:tw 3.4s ease-in-out infinite}@keyframes tw{50%{opacity:.25}}.tw2{transform-box:fill-box;transform-origin:center;animation:tp 4.2s ease-in-out infinite}@keyframes tp{50%{transform:scale(1.18)}}</style>`
    : '';

  const out = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><title>The constellation of ${design.name.replace(/&/g, '&amp;')}</title>${style}<defs>${defs.join('')}</defs>${parts.join('')}</svg>`;
  if (/NaN|undefined|Infinity/.test(out)) throw new Error('Design rendering produced invalid geometry');
  return out;
}

module.exports = { renderSvg, W, H, catalogueId: (d) => hashHex(seedKey(d)) };
