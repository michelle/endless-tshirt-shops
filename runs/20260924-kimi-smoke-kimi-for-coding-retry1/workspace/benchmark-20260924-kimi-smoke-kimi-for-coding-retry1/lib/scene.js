// Shared scene computation for SKYWRITER star maps.
// Pure geometry: given a normalized design + output size, produce drawing
// primitives. Used by the client canvas preview and the server SVG renderer
// so both always agree on what the print will look like.

import { lstHours, raDecToAltAz, moonPosition, zonedWallTimeToUtc, formatCaptionDate } from './astronomy.js';
import { stars as starsDataStars } from '../data/stars.js';
import { lines as linesDataLines } from '../data/lines.js';

export const PRINT_W = 4680; // Bella+Canvas 3001 front print area @300dpi
export const PRINT_H = 5790;
export const PREVIEW_W = 1170;
export const PREVIEW_H = 1448;

export const INK = '#F3EEE2';
export const INK_SOFT = 'rgba(243,238,226,';
export const GOLD = '#E7C46A';

export const SHIRT_COLORS = [
  { id: 'black', label: 'Black', hex: '#15161A' },
  { id: 'navy blue', label: 'Navy', hex: '#1B2A4A' },
  { id: 'maroon', label: 'Maroon', hex: '#4A1220' },
  { id: 'burgundy', label: 'Burgundy', hex: '#4E1B2E' },
  { id: 'dark heather grey', label: 'Dark Heather', hex: '#3A3D42' },
  { id: 'military green', label: 'Military Green', hex: '#3B4234' },
  { id: 'brown', label: 'Brown', hex: '#3B2A26' },
  { id: 'purple', label: 'Purple', hex: '#3A2350' },
  { id: 'army', label: 'Army', hex: '#37331F' },
  { id: 'asphalt', label: 'Asphalt', hex: '#4A4C52' },
];

export const SHIRT_SIZES = ['xs', 's', 'm', 'l', 'xl', '2xl', '3xl'];

export function normalizeDesign(input) {
  const d = {
    v: 1,
    date: String(input.date || ''),
    time: String(input.time || ''),
    tz: String(input.tz || 'UTC'),
    lat: Math.max(-89, Math.min(89, Number(input.lat) || 0)),
    lng: ((Number(input.lng) || 0) + 540) % 360 - 180,
    place: String(input.place || '').slice(0, 60).toUpperCase(),
    msg: String(input.msg || '').slice(0, 80),
    color: SHIRT_COLORS.some((c) => c.id === input.color) ? input.color : 'black',
    size: SHIRT_SIZES.includes(input.size) ? input.size : 'm',
    qty: Math.max(1, Math.min(10, Math.round(Number(input.qty) || 1))),
  };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date)) throw new Error('bad date');
  if (!/^\d{2}:\d{2}$/.test(d.time)) throw new Error('bad time');
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: d.tz === 'UTC' ? 'UTC' : d.tz });
  } catch {
    d.tz = 'UTC';
  }
  return d;
}

export function designKey(d) {
  return JSON.stringify([d.v, d.date, d.time, d.tz, +d.lat.toFixed(4), +d.lng.toFixed(4), d.place, d.msg]);
}

function starRadius(mag, R) {
  return R * 0.0065 * Math.pow(1.85, 1.4 - mag);
}

// Project alt/az to canvas coords. North up, east LEFT — the view of someone
// standing under the sky looking up (standard for personalized sky maps).
function project(altDeg, azDeg, cx, cy, R) {
  const r = ((90 - altDeg) / 90) * R;
  const a = azDeg * (Math.PI / 180);
  return { x: cx - r * Math.sin(a), y: cy - r * Math.cos(a), r };
}

// Computes all primitives for a design at a given output size.
export function computeScene(design, W = PRINT_W, H = PRINT_H) {
  const d = normalizeDesign(design);
  const utcMs = zonedWallTimeToUtc(d.date, d.time, d.tz);
  const lst = lstHours(utcMs, d.lng);
  const cx = W / 2;
  const cy = W * 0.52;
  const R = W * 0.455;

  const scene = {
    W, H, cx, cy, R,
    circle: { x: cx, y: cy, r: R },
    stars: [],
    segments: [],
    moon: null,
    labels: [],
    ticks: [],
  };

  // decorative rings + spokes
  scene.rings = [0.3333, 0.6667].map((f) => ({ x: cx, y: cy, r: R * f }));
  scene.spokes = [];
  for (let az = 0; az < 360; az += 30) {
    const p = project(0.01, az, cx, cy, R);
    scene.spokes.push({ x1: cx, y1: cy, x2: p.x, y2: p.y });
  }
  // rim degree ticks
  for (let az = 0; az < 360; az += 10) {
    const a = az * (Math.PI / 180);
    const len = az % 30 === 0 ? R * 0.028 : R * 0.014;
    scene.ticks.push({
      x1: cx - (R - len) * Math.sin(a), y1: cy - (R - len) * Math.cos(a),
      x2: cx - R * 0.995 * Math.sin(a), y2: cy - R * 0.995 * Math.cos(a),
      major: az % 30 === 0,
    });
  }
  // cardinal letters
  const cards = [
    { az: 0, ch: 'N' }, { az: 90, ch: 'E' }, { az: 180, ch: 'S' }, { az: 270, ch: 'W' },
  ];
  for (const c of cards) {
    const p = project(-4.5, c.az, cx, cy, R);
    scene.labels.push({ x: p.x, y: p.y, ch: c.ch, size: R * 0.075, kind: 'cardinal' });
  }

  // stars (catalog stores RA in degrees; raDecToAltAz wants hours)
  for (const [ra, dec, mag] of starsDataStars) {
    const { altDeg, azDeg } = raDecToAltAz(ra / 15, dec, d.lat, lst);
    if (altDeg < 1.5) continue;
    const p = project(altDeg, azDeg, cx, cy, R);
    scene.stars.push({
      x: p.x, y: p.y,
      r: starRadius(mag, R),
      mag,
      gold: mag <= 1.1,
      a: Math.min(1, Math.max(0.28, 1.35 - mag * 0.16)),
    });
  }

  // constellation lines (with right-ascension wraparound handled: a segment
  // crossing the 0h meridian must unwrap, not stretch across the sky)
  for (const [[ra1, dec1], [ra2, dec2]] of linesDataLines) {
    let ra2u = ra2;
    if (ra2u - ra1 > 180) ra2u -= 360;
    else if (ra1 - ra2u > 180) ra2u += 360;
    const s1 = raDecToAltAz(ra1 / 15, dec1, d.lat, lst);
    const s2 = raDecToAltAz(ra2u / 15, dec2, d.lat, lst);
    if (s1.altDeg < 3 || s2.altDeg < 3) continue;
    const p1 = project(s1.altDeg, s1.azDeg, cx, cy, R);
    const p2 = project(s2.altDeg, s2.azDeg, cx, cy, R);
    const altMin = Math.min(s1.altDeg, s2.altDeg);
    scene.segments.push({
      x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y,
      a: Math.min(0.26, 0.08 + altMin / 200),
    });
  }

  // moon
  const moon = moonPosition(utcMs);
  const malt = raDecToAltAz(moon.raHours, moon.decDeg, d.lat, lst);
  if (malt.altDeg > -12) {
    const p = project(malt.altDeg, malt.azDeg, cx, cy, R);
    scene.moon = {
      x: p.x, y: p.y, r: R * 0.062,
      age: moon.age, phase: moon.phase,
      k: Math.cos((2 * Math.PI * moon.age) / 29.530588853),
    };
  }

  // caption block
  const { date, time } = formatCaptionDate(d.date, d.time, d.tz);
  const yBase = cy + R + H * 0.085;
  if (d.place) {
    scene.place = { text: d.place, x: cx, y: yBase, size: R * 0.105 };
  }
  scene.when = { text: `THE NIGHT SKY OF ${date} · ${time}`, x: cx, y: yBase + R * 0.105 * 1.5, size: R * 0.052 };
  if (d.msg.trim()) {
    scene.msg = { text: `“${d.msg.trim()}”`, x: cx, y: yBase + R * 0.105 * 2.55, size: R * 0.085 };
  }
  // tiny brand tucked inside the rim at the bottom of the chart
  scene.brand = { text: 'SKYWRITER', x: cx, y: cy + R * 0.94, size: R * 0.036 };
  return scene;
}
