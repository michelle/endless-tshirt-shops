'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const opentype = require('opentype.js');
const { rngFromString, makeNoise2D, xmur3 } = require('./prng');
const { PALETTES } = require('./palettes');

const CANVAS_W = 1560; // 15.6in print area * 100
const CANVAS_H = 1930; // 19.3in print area * 100

const FONTS = {};
function loadFonts() {
  if (!FONTS.anton) {
    const parse = (p) => {
      const buf = fs.readFileSync(p);
      return opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
    };
    FONTS.anton = parse(path.join(__dirname, '..', 'fonts', 'Anton-Regular.ttf'));
    FONTS.spaceMono = parse(path.join(__dirname, '..', 'fonts', 'SpaceMono-Regular.ttf'));
    FONTS.spaceMonoB64 = fs.readFileSync(path.join(__dirname, '..', 'fonts', 'SpaceMono-Regular.ttf')).toString('base64');
  }
  return FONTS;
}

function sanitizeWord(raw) {
  return String(raw || '')
    .toUpperCase()
    .replace(/[^A-Z0-9 &'.\-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 14);
}

function designKey(word, paletteId) {
  return `${word}::${paletteId}`;
}

function designId(word, paletteId) {
  return crypto.createHash('sha1').update(designKey(word, paletteId)).digest('hex').slice(0, 16);
}

function editionCode(word, paletteId) {
  const h = xmur3(designKey(word, paletteId))();
  const hex = h.toString(16).toUpperCase().padStart(8, '0');
  return `${hex.slice(0, 4)}-${hex.slice(4, 8)}`;
}

// Lay out the word as a single combined glyph path, centered at (cx, cy).
// opentype's toPathData() has a rounding bug (double-exponent NaN), so we
// serialize path commands ourselves.
function serializePath(commands) {
  const r = (v) => {
    const n = Math.round(v * 100) / 100;
    return Object.is(n, -0) ? '0' : String(n);
  };
  return commands
    .map((c) => {
      switch (c.type) {
        case 'M': return `M${r(c.x)} ${r(c.y)}`;
        case 'L': return `L${r(c.x)} ${r(c.y)}`;
        case 'C': return `C${r(c.x1)} ${r(c.y1)} ${r(c.x2)} ${r(c.y2)} ${r(c.x)} ${r(c.y)}`;
        case 'Q': return `Q${r(c.x1)} ${r(c.y1)} ${r(c.x)} ${r(c.y)}`;
        case 'Z': return 'Z';
        default: return '';
      }
    })
    .join('');
}

function wordPath(word, cx, cy, targetW, maxH) {
  const { anton } = loadFonts();
  const upm = anton.unitsPerEm;
  const glyphs = anton.stringToGlyphs(word);
  // measure at scale 1
  let adv = 0;
  const advances = [];
  for (let i = 0; i < glyphs.length; i++) {
    let a = glyphs[i].advanceWidth;
    if (i < glyphs.length - 1) a += anton.getKerningValue(glyphs[i], glyphs[i + 1]);
    advances.push(a);
    adv += a;
  }
  const asc = anton.ascender;
  const desc = anton.descender;
  const naturalH = asc - desc;
  const scale = Math.min(targetW / adv, maxH / naturalH);
  const w = adv * scale;
  const h = naturalH * scale;
  let x = cx - w / 2;
  const yBase = cy - ((asc + desc) / 2) * scale;
  const parts = [];
  for (let i = 0; i < glyphs.length; i++) {
    const p = glyphs[i].getPath(x, yBase, upm * scale);
    parts.push(serializePath(p.commands));
    x += advances[i] * scale;
  }
  return { d: parts.join(' '), w, h };
}

function fmt(n) {
  return Math.round(n * 10) / 10;
}

// Generate one flow-field layer of polylines.
function flowLayer(noise, rand, opts) {
  const { cols, rows, ink, offsetX, offsetY, scale, swirl, stepLen, minSteps, maxSteps, width } = opts;
  const paths = [];
  const cw = CANVAS_W / cols;
  const ch = CANVAS_H / rows;
  for (let gy = 0; gy < rows; gy++) {
    for (let gx = 0; gx < cols; gx++) {
      let x = (gx + 0.15 + rand() * 0.7) * cw;
      let y = (gy + 0.15 + rand() * 0.7) * ch;
      const steps = Math.floor(minSteps + rand() * (maxSteps - minSteps));
      let d = `M${fmt(x)} ${fmt(y)}`;
      let moved = false;
      for (let s = 0; s < steps; s++) {
        const n = noise(x * scale + offsetX, y * scale + offsetY);
        const r = Math.hypot(x - CANVAS_W / 2, y - CANVAS_H / 2);
        const a = n * Math.PI * 2.1 + swirl * Math.sin(r / 340 + offsetX);
        x += Math.cos(a) * stepLen;
        y += Math.sin(a) * stepLen;
        if (x < -20 || x > CANVAS_W + 20 || y < -20 || y > CANVAS_H + 20) break;
        d += `L${fmt(x)} ${fmt(y)}`;
        moved = true;
      }
      if (moved) paths.push(d);
    }
  }
  return `<path d="${paths.join('')}" fill="none" stroke="${ink}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
}

function buildDesignSVG(wordRaw, paletteId) {
  const word = sanitizeWord(wordRaw);
  if (!word) throw new Error('empty word');
  const palette = PALETTES[paletteId];
  if (!palette) throw new Error(`unknown palette: ${paletteId}`);
  loadFonts();

  const seedStr = designKey(word, paletteId);
  const rand = rngFromString(seedStr);
  const noise = makeNoise2D(rngFromString(seedStr + '::noise'));

  const wordW = 1260;
  const wordH = Math.min(380, 900 / Math.max(1, word.length / 6));
  const cy = 830;
  const wordP = wordPath(word, CANVAS_W / 2, cy, wordW, wordH);

  // layers: one per ink, increasing field scale & decreasing line weight
  const layers = palette.inks.map((ink, i) => flowLayer(noise, rand, {
    cols: 30,
    rows: 37,
    ink,
    offsetX: 10 + i * 37.7,
    offsetY: 5 + i * 21.3,
    scale: 0.0009 + i * 0.00035,
    swirl: 0.45 + i * 0.18,
    stepLen: 5,
    minSteps: 10,
    maxSteps: 30 - i * 4,
    width: 3.4 - i * 0.6,
  }));

  const code = editionCode(word, paletteId);
  const captionY = cy + wordP.h / 2 + 96;
  const caption = `EDITION 1 OF 1 — Nº ${code}`;
  const captionBandW = 46 * caption.length + 60;
  const bandX = (CANVAS_W - captionBandW) / 2;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS_W}" height="${CANVAS_H}" viewBox="0 0 ${CANVAS_W} ${CANVAS_H}">
<defs>
<style type="text/css"><![CDATA[
@font-face{font-family:'SpaceMono';src:url(data:font/ttf;base64,${FONTS.spaceMonoB64}) format('truetype');}
]]></style>
<clipPath id="cutout">
<path clip-rule="evenodd" d="M0 0H${CANVAS_W}V${CANVAS_H}H0Z ${wordP.d} M${bandX} ${captionY - 52}h${captionBandW}v86h${-captionBandW}Z"/>
</clipPath>
</defs>
<g clip-path="url(#cutout)" opacity="0.92">
${layers.join('\n')}
</g>
<path d="${wordP.d}" fill="none" stroke="${palette.caption}" stroke-width="7" stroke-linejoin="round" opacity="0.95"/>
<text x="${CANVAS_W / 2}" y="${captionY}" font-family="SpaceMono" font-size="34" letter-spacing="10" text-anchor="middle" fill="${palette.caption}">${caption.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text>
</svg>`;
  return { svg, word, paletteId, edition: code, width: CANVAS_W, height: CANVAS_H };
}

module.exports = { buildDesignSVG, sanitizeWord, designId, editionCode, designKey, CANVAS_W, CANVAS_H };
