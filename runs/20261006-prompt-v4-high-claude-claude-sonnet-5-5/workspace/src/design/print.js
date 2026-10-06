'use strict';
const sharp = require('sharp');
const { renderSvg, W, H } = require('./render');
const { colorById } = require('../catalog');

const cache = new Map();
const MAX = 6;

// Full-resolution transparent PNG matching the Prodigi front print area (300 dpi).
async function renderPrintPng(design, colorId) {
  const color = colorById(colorId);
  if (!color) throw new Error('Unknown colour');
  const key = JSON.stringify([design, color.tone]);
  if (cache.has(key)) return cache.get(key);
  const svg = renderSvg(design, { tone: color.tone });
  const png = await sharp(Buffer.from(svg), { density: 72 })
    .resize(W, H)
    .png({ compressionLevel: 9 })
    .withMetadata({ density: 300 })
    .toBuffer();
  const meta = await sharp(png).metadata();
  if (meta.width !== W || meta.height !== H || !meta.hasAlpha) throw new Error('Print render has unexpected format');
  cache.set(key, png);
  if (cache.size > MAX) cache.delete(cache.keys().next().value);
  return png;
}

module.exports = { renderPrintPng };
