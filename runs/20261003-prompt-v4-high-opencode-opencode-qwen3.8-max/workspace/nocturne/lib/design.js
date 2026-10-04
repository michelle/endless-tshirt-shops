// NOCTURNE design spec normalization & validation.
// A "design" is the pure, content-addressable description of one custom sky shirt.
'use strict';

const crypto = require('crypto');
const { THEMES } = require('./render');
const astro = require('./astro');

const SIZES = ['xs', 's', 'm', 'l', 'xl', '2xl', '3xl', '4xl'];
const SIZE_LABELS = { xs: 'XS', s: 'S', m: 'M', l: 'L', xl: 'XL', '2xl': '2XL', '3xl': '3XL', '4xl': '4XL' };

const PRICE_USD = 39; // per shirt
const SHIPPING_USD = 6.95; // flat, Standard shipping

function cleanText(s, max) {
  if (typeof s !== 'string') return '';
  // strip control chars, collapse whitespace
  return s.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

// Normalize + validate a raw design request.
// Returns { design, errors, nightIssue } where design is canonical (identical inputs => identical design).
function normalizeDesign(raw) {
  const errors = [];
  const d = {};

  d.title = cleanText(raw && raw.title, 48);
  if (!d.title) errors.push('Give your night a title (e.g. “The night Leo was born”).');

  d.theme = THEMES[raw && raw.theme] ? raw.theme : null;
  if (!d.theme) errors.push('Pick one of the three chart styles.');

  const lat = parseFloat(raw && raw.lat);
  const lng = parseFloat(raw && raw.lng);
  if (!isFinite(lat) || lat < -90 || lat > 90) errors.push('Latitude must be between −90 and 90.');
  if (!isFinite(lng) || lng < -180 || lng > 180) errors.push('Longitude must be between −180 and 180.');
  d.lat = isFinite(lat) ? +lat.toFixed(4) : 0;
  d.lng = isFinite(lng) ? +lng.toFixed(4) : 0;

  const when = new Date(raw && raw.utc);
  if (isNaN(when.getTime()) || when.getUTCFullYear() < 1900 || when.getUTCFullYear() > 2100) {
    errors.push('Pick a date between 1900 and 2100.');
  }
  d.utc = isNaN(when.getTime()) ? null : when.toISOString().replace(/\.\d+Z$/, 'Z');

  const off = parseInt(raw && raw.localOffsetMin, 10);
  d.localOffsetMin = isFinite(off) && off >= -720 && off <= 840 ? off : 0;

  d.place = cleanText(raw && raw.place, 40) || 'EARTH';

  // derived serial: MM DDHH of the local moment (deterministic, no counters)
  if (d.utc) {
    const local = new Date(new Date(d.utc).getTime() + d.localOffsetMin * 60000);
    const mm = String(local.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(local.getUTCDate()).padStart(2, '0');
    const hh = String(local.getUTCHours()).padStart(2, '0');
    d.serial = `${mm} ${dd}${hh}`;
  } else {
    d.serial = '00 0000';
  }

  // night check: the sun must be below the horizon (civil twilight or darker)
  let nightIssue = null;
  if (d.utc && !errors.some((e) => e.includes('Latitude') || e.includes('date'))) {
    try {
      const sky = astro.computeSky({ date: new Date(d.utc), lat: d.lat, lng: d.lng, horizonDeg: -91 });
      if (sky.sun.alt > -3) {
        nightIssue =
          sky.sun.alt > 0
            ? 'The sun was still up at this moment — your sky chart needs night. Pick an evening time (the sun must be below the horizon).'
            : 'Twilight was still glowing at this moment. Pick a slightly later time for a true night sky.';
      }
    } catch (_) {
      /* location errors already reported */
    }
  }
  if (nightIssue) errors.push(nightIssue);

  const token = crypto
    .createHash('sha256')
    .update(JSON.stringify([d.title, d.theme, d.lat, d.lng, d.utc, d.localOffsetMin, d.place]))
    .digest('hex')
    .slice(0, 20);

  return { design: d, token, errors, nightIssue };
}

module.exports = { normalizeDesign, SIZES, SIZE_LABELS, PRICE_USD, SHIPPING_USD };
