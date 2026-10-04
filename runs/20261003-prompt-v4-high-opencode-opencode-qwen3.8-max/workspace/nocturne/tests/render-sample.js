// Renders demo artwork to /tmp for visual QA: node tests/render-sample.js [outPrefix]
'use strict';
const fs = require('fs');
const { renderDesign } = require('../lib/render');

const prefix = process.argv[2] || '/tmp/nocturne-sample';

const samples = [
  {
    title: 'The night Leo was born',
    theme: 'chart-cream',
    utc: '2026-03-15T01:34:00Z',
    localOffsetMin: -240,
    lat: 40.7128, lng: -74.006,
    place: 'New York City',
    serial: '04 2261',
  },
  {
    title: 'Midsummer, under a half moon',
    theme: 'chart-midnight',
    utc: '2026-06-20T22:10:00Z',
    localOffsetMin: 120,
    lat: 48.8566, lng: 2.3522,
    place: 'Paris',
    serial: '06 2148',
  },
  {
    title: 'Our first dance',
    theme: 'chart-sage',
    utc: '2026-01-01T07:30:00Z',
    localOffsetMin: -600,
    lat: 21.3069, lng: -157.8583,
    place: 'Honolulu',
    serial: '12 3101',
  },
];

for (const s of samples) {
  const { buffer, sky } = renderDesign(s);
  const out = `${prefix}-${s.theme}.png`;
  fs.writeFileSync(out, buffer);
  console.log(`${out}: ${(buffer.length / 1024).toFixed(0)} KB, ${sky.stars.length} stars, ${sky.moon.name} ${Math.round(sky.moon.illuminated * 100)}%`);
}
