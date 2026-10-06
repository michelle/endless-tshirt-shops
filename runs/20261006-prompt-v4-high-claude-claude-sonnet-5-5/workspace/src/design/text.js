'use strict';
const fs = require('fs');
const path = require('path');
const opentype = require('opentype.js');

const DIR = path.join(__dirname, '..', '..', 'fonts');
const cache = new Map();

function load(file) {
  if (!cache.has(file)) {
    const b = fs.readFileSync(path.join(DIR, file));
    cache.set(file, opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)));
  }
  return cache.get(file);
}

const stacks = {
  displayItalic: () => [load('cormorant-garamond-latin-600-italic.woff'), load('cormorant-garamond-latin-ext-600-italic.woff')],
  display: () => [load('cormorant-garamond-latin-600-normal.woff'), load('cormorant-garamond-latin-ext-600-normal.woff')],
  caps: () => [load('jost-latin-500-normal.woff'), load('jost-latin-ext-500-normal.woff')],
  mono: () => [load('ibm-plex-mono-latin-500-normal.woff'), load('ibm-plex-mono-latin-ext-500-normal.woff')],
};

function stack(name) { return stacks[name](); }

function pick(fonts, ch) {
  for (const f of fonts) if (f.charToGlyphIndex(ch) > 0) return f;
  return null;
}

// True when every printable character can be drawn by the font stacks used for user text.
function canPrint(text) {
  const all = [stack('displayItalic'), stack('caps'), stack('mono')];
  return [...text].every((ch) => ch === ' ' || all.every((s) => pick(s, ch)));
}

function layout(fonts, text, size, tracking = 0) {
  const items = [];
  let x = 0;
  let prev = null;
  for (const ch of [...text]) {
    const font = pick(fonts, ch) || fonts[0];
    const glyph = font.charToGlyph(ch);
    const scale = size / font.unitsPerEm;
    if (prev && prev.font === font) x += font.getKerningValue(prev.glyph, glyph) * scale;
    const adv = glyph.advanceWidth * scale;
    items.push({ glyph, font, x, adv });
    x += adv + tracking;
    prev = { font, glyph };
  }
  const width = items.length ? x - tracking : 0;
  return { items, width, size };
}

function capHeight(fonts, size) {
  const f = fonts[0];
  const os2 = f.tables && f.tables.os2;
  const cap = os2 && os2.sCapHeight ? os2.sCapHeight : f.ascender * 0.7;
  return (cap / f.unitsPerEm) * size;
}

function fitSize(fonts, text, size, tracking, maxWidth) {
  const w = layout(fonts, text, size, tracking).width;
  if (w <= maxWidth) return { size, tracking };
  const k = maxWidth / w;
  return { size: size * k, tracking: tracking * k };
}

const r1 = (n) => Math.round(n * 10) / 10;
const num = (n) => { const v = Math.round(n * 10) / 10; return String(v === 0 ? 0 : v); };

// opentype.js 2.x toPathData() can emit NaN, so serialise the commands ourselves.
function toD(p) {
  let d = '';
  for (const c of p.commands) {
    if (c.type === 'Z') d += 'Z';
    else if (c.type === 'M' || c.type === 'L') d += `${c.type}${num(c.x)} ${num(c.y)}`;
    else if (c.type === 'Q') d += `Q${num(c.x1)} ${num(c.y1)} ${num(c.x)} ${num(c.y)}`;
    else if (c.type === 'C') d += `C${num(c.x1)} ${num(c.y1)} ${num(c.x2)} ${num(c.y2)} ${num(c.x)} ${num(c.y)}`;
  }
  return d;
}

function straightPath(lay, x0, y) {
  return lay.items.map((it) => toD(it.glyph.getPath(x0 + it.x, y, lay.size))).join('');
}

function centeredPath(fonts, text, size, tracking, cx, y, maxWidth) {
  const fit = maxWidth ? fitSize(fonts, text, size, tracking, maxWidth) : { size, tracking };
  const lay = layout(fonts, text, fit.size, fit.tracking);
  return straightPath(lay, cx - lay.width / 2, y);
}

// Text bent around a circle centred on (cx, cy). Returns an array of <path> strings.
function arcPaths(fonts, text, size, tracking, cx, cy, radius, where, attrs = '') {
  const lay = layout(fonts, text, size, tracking);
  const cap = capHeight(fonts, size);
  const out = [];
  for (const it of lay.items) {
    const s = it.x + it.adv / 2 - lay.width / 2;
    const d = toD(it.glyph.getPath(-it.adv / 2, 0, size));
    if (!d) continue;
    let phi, rot, rr;
    if (where === 'top') {
      phi = s / radius; rr = radius; rot = (phi * 180) / Math.PI;
    } else {
      phi = Math.PI - s / radius; rr = radius + cap; rot = (phi * 180) / Math.PI - 180;
    }
    const px = cx + rr * Math.sin(phi);
    const py = cy - rr * Math.cos(phi);
    out.push(`<path ${attrs}transform="translate(${r1(px)} ${r1(py)}) rotate(${r1(rot)})" d="${d}"/>`);
  }
  return { paths: out, capHeight: cap };
}

module.exports = { stack, canPrint, layout, straightPath, centeredPath, arcPaths, capHeight, fitSize };
