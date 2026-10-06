'use strict';
const fs = require('fs');
const path = require('path');

let cache = null;

function dataDir() {
  return path.join(__dirname, '..', '_assets', 'data');
}

function load() {
  if (cache) return cache;
  const dir = dataDir();
  const stars = JSON.parse(fs.readFileSync(path.join(dir, 'stars.6.json'), 'utf8'));
  const lines = JSON.parse(
    fs.readFileSync(path.join(dir, 'constellations.lines.json'), 'utf8')
  );
  // Pre-flatten to plain arrays for speed: [raDeg, decDeg, mag, bv]
  const flat = [];
  for (const f of stars.features) {
    const c = f.geometry.coordinates;
    flat.push([c[0], c[1], f.properties.mag, f.properties.bv]);
  }
  const segs = [];
  for (const f of lines.features) {
    for (const multi of f.geometry.coordinates) {
      for (let i = 1; i < multi.length; i++) {
        segs.push([multi[i - 1], multi[i]]);
      }
    }
  }
  cache = { flat, segs, stars, lines };
  return cache;
}

module.exports = { load };
