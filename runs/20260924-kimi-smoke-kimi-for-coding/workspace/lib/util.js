'use strict';
const crypto = require('crypto');

// ---------- deterministic seeding ----------
function hashSeed(str) {
  return crypto.createHash('sha256').update(String(str)).digest();
}

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function rngFrom(parts) {
  return mulberry32(hashSeed(parts.join('|')).readUInt32BE(0));
}

// ---------- moon phase (real astronomy) ----------
const SYNODIC = 29.530588853; // days
const KNOWN_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14); // 2000-01-06 18:14 UTC

function moonPhase(dateInput) {
  const t = new Date(dateInput).getTime();
  if (Number.isNaN(t)) return null;
  let p = ((t - KNOWN_NEW_MOON) / 86400000) % SYNODIC;
  if (p < 0) p += SYNODIC;
  const frac = p / SYNODIC; // 0 = new, 0.5 = full
  const illumination = (1 - Math.cos(2 * Math.PI * frac)) / 2;
  const names = [
    [0.0339, 'NEW'], [0.2164, 'WAXING CRESCENT'], [0.2836, 'FIRST QUARTER'],
    [0.4661, 'WAXING GIBBOUS'], [0.5339, 'FULL'], [0.7164, 'WANING GIBBOUS'],
    [0.7836, 'LAST QUARTER'], [0.9661, 'WANING CRESCENT'], [1.01, 'NEW'],
  ];
  const label = names.find((n) => frac <= n[0])[1];
  return { fraction: frac, illumination, label, waxing: frac <= 0.5 };
}

// ---------- zodiac ----------
const SIGNS = [
  { name: 'CAPRICORN', until: [1, 19] }, { name: 'AQUARIUS', until: [2, 18] },
  { name: 'PISCES', until: [3, 20] }, { name: 'ARIES', until: [4, 19] },
  { name: 'TAURUS', until: [5, 20] }, { name: 'GEMINI', until: [6, 20] },
  { name: 'CANCER', until: [7, 22] }, { name: 'LEO', until: [8, 22] },
  { name: 'VIRGO', until: [9, 22] }, { name: 'LIBRA', until: [10, 22] },
  { name: 'SCORPIO', until: [11, 21] }, { name: 'SAGITTARIUS', until: [12, 21] },
  { name: 'CAPRICORN', until: [12, 31] },
];

function zodiacSign(dateInput) {
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return null;
  const m = d.getUTCMonth() + 1, day = d.getUTCDate();
  for (const s of SIGNS) {
    if (m < s.until[0] || (m === s.until[0] && day <= s.until[1])) return s.name;
  }
  return 'CAPRICORN';
}

// Stylized asterisms: normalized [x, y] star positions + line pairs (indices).
const CONSTELLATIONS = {
  ARIES:     { stars: [[.2, .7], [.45, .55], [.62, .6], [.85, .32]], lines: [[0, 1], [1, 2], [2, 3]] },
  TAURUS:    { stars: [[.15, .3], [.35, .45], [.5, .3], [.72, .42], [.88, .25], [.62, .72]], lines: [[0, 1], [1, 2], [2, 3], [3, 4], [1, 5]] },
  GEMINI:    { stars: [[.3, .2], [.3, .8], [.7, .2], [.7, .8], [.3, .5], [.7, .5]], lines: [[0, 1], [2, 3], [4, 5]] },
  CANCER:    { stars: [[.3, .35], [.42, .62], [.62, .6], [.74, .34], [.5, .48]], lines: [[0, 1], [1, 2], [2, 3], [0, 4], [3, 4]] },
  LEO:       { stars: [[.18, .62], [.36, .5], [.5, .58], [.62, .4], [.8, .48], [.88, .7]], lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [1, 3]] },
  VIRGO:     { stars: [[.2, .3], [.34, .5], [.5, .38], [.66, .55], [.82, .4], [.5, .78]], lines: [[0, 1], [1, 2], [2, 3], [3, 4], [1, 5]] },
  LIBRA:     { stars: [[.28, .35], [.28, .75], [.5, .5], [.72, .35], [.72, .75]], lines: [[0, 2], [2, 4], [1, 2], [2, 3]] },
  SCORPIO:   { stars: [[.12, .25], [.26, .38], [.4, .32], [.52, .48], [.62, .66], [.74, .72], [.88, .6]], lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6]] },
  SAGITTARIUS:{ stars: [[.2, .78], [.38, .6], [.55, .44], [.72, .28], [.85, .18], [.62, .7], [.8, .55]], lines: [[0, 1], [1, 2], [2, 3], [3, 4], [1, 5], [5, 6], [2, 6]] },
  CAPRICORN: { stars: [[.18, .4], [.34, .6], [.5, .5], [.66, .66], [.82, .45], [.5, .24]], lines: [[0, 1], [1, 2], [2, 3], [3, 4], [2, 5]] },
  AQUARIUS:  { stars: [[.15, .5], [.32, .4], [.5, .52], [.68, .38], [.85, .5], [.32, .72], [.68, .72]], lines: [[0, 1], [1, 2], [2, 3], [3, 4], [1, 5], [3, 6]] },
  PISCES:    { stars: [[.2, .3], [.4, .5], [.6, .4], [.8, .6], [.34, .74], [.72, .2]], lines: [[0, 1], [1, 2], [2, 3], [1, 4], [2, 5]] },
};

// ---------- formatting ----------
function formatDateLong(dateInput) {
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return String(dateInput).toUpperCase();
  const wd = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'][d.getUTCDay()];
  const mo = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'][d.getUTCMonth()];
  return `${wd} · ${mo} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

function formatCoords(lat, lng) {
  const la = Math.abs(lat).toFixed(4), lo = Math.abs(lng).toFixed(4);
  return `${la}° ${lat >= 0 ? 'N' : 'S'}  ·  ${lo}° ${lng >= 0 ? 'E' : 'W'}`;
}

const escapeXml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));

module.exports = { rngFrom, hashSeed, mulberry32, moonPhase, zodiacSign, CONSTELLATIONS, formatDateLong, formatCoords, escapeXml };
