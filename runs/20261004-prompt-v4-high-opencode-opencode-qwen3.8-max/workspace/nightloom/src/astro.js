'use strict';
/**
 * Sky computation for NightLoom.
 *
 * Given an instant (UTC) and a place (lat/lon), computes horizontal positions
 * (altitude/azimuth) of catalog stars, the Moon (with phase), the Sun and the
 * bright planets, and projects everything onto a unit disk with an
 * azimuthal-equidistant (planisphere) projection: zenith at the center,
 * horizon at the rim, north up, east to the left.
 *
 * Star positions: Hipparcos catalog (ESA, van Leeuwen 2007 reduction), J2000.
 * Ephemerides: astronomy-engine (MIT).
 */
const fs = require('fs');
const path = require('path');
const A = require('astronomy-engine');
const config = require('./config');

let CATALOG = null;   // { stars: [[hip, ra, dec, mag, bv], ...], byHip: Map }
let CONSTEL = null;   // { constellations: [...] }

function loadCatalog() {
  if (CATALOG) return CATALOG;
  const d = JSON.parse(fs.readFileSync(path.join(config.ROOT, 'data', 'stars.json'), 'utf8'));
  const byHip = new Map();
  for (let i = 0; i < d.stars.length; i++) byHip.set(d.stars[i][0], i);
  CATALOG = { stars: d.stars, byHip };
  return CATALOG;
}

function loadConstellations() {
  if (CONSTEL) return CONSTEL;
  CONSTEL = JSON.parse(fs.readFileSync(path.join(config.ROOT, 'data', 'constellations.json'), 'utf8'));
  return CONSTEL;
}

const DEG = Math.PI / 180;

/** J2000 equatorial (deg) -> horizontal unit vector {x: north, y: west, z: zenith}. */
function eqToHorizVec(rot, raDeg, decDeg) {
  const ra = raDeg * DEG, dec = decDeg * DEG;
  const cd = Math.cos(dec);
  return A.RotateVector(rot, new A.Vector(cd * Math.cos(ra), cd * Math.sin(ra), Math.sin(dec), 0));
}

function horizToDisk(hv) {
  const alt = Math.asin(Math.max(-1, Math.min(1, hv.z))) / DEG;
  const az = horizAzimuth(hv) * DEG;      // clockwise from north, projected east->right
  const r = (90 - alt) / 90;              // 0 at zenith, 1 at horizon
  return { x: r * Math.sin(az), y: -r * Math.cos(az), alt, az: horizAzimuth(hv), r };
}

/** B-V colour index -> [r,g,b] stellar tint (anchor table, linearly interpolated). */
const BV_ANCHORS = [
  [-0.4, [149, 170, 255]], [0.0, [170, 191, 255]], [0.3, [202, 215, 255]],
  [0.6, [245, 245, 255]], [0.8, [255, 244, 232]], [1.0, [255, 239, 224]],
  [1.2, [255, 229, 214]], [1.5, [255, 213, 198]], [1.8, [255, 196, 183]], [2.4, [255, 178, 168]],
];
function bvToRgb(bv) {
  if (!isFinite(bv)) return [255, 250, 240];
  const t = BV_ANCHORS;
  if (bv <= t[0][0]) return t[0][1];
  if (bv >= t[t.length - 1][0]) return t[t.length - 1][1];
  for (let i = 0; i < t.length - 1; i++) {
    if (bv >= t[i][0] && bv <= t[i + 1][0]) {
      const f = (bv - t[i][0]) / (t[i + 1][0] - t[i][0]);
      const a = t[i][1], b = t[i + 1][1];
      return [Math.round(a[0] + (b[0] - a[0]) * f), Math.round(a[1] + (b[1] - a[1]) * f), Math.round(a[2] + (b[2] - a[2]) * f)];
    }
  }
  return [255, 250, 240];
}

function horizAzimuth(hv) {
  const east = -hv.y, north = hv.x;
  let az = Math.atan2(east, north) / DEG; // clockwise from north
  if (az < 0) az += 360;
  return az;
}

function moonPhaseName(k, waxing) {
  if (k < 0.02) return 'New Moon';
  if (k < 0.48) return waxing ? 'Waxing Crescent' : 'Waning Crescent';
  if (k <= 0.52) return waxing ? 'First Quarter' : 'Last Quarter';
  if (k < 0.98) return waxing ? 'Waxing Gibbous' : 'Waning Gibbous';
  return 'Full Moon';
}

/**
 * Compute the sky for an instant and place.
 * @param {Date} dateUTC
 * @param {number} lat degrees north
 * @param {number} lon degrees east
 * @param {object} opts { magLimit, withConstellations }
 * @returns sky object with disk-projected coordinates (unit disk).
 */
function computeSky(dateUTC, lat, lon, opts = {}) {
  const magLimit = opts.magLimit === undefined ? 7.6 : opts.magLimit;
  const time = A.MakeTime(dateUTC);
  const obs = new A.Observer(lat, lon, 0);
  const rotEQJ = A.Rotation_EQJ_HOR(time, obs);   // J2000 equatorial -> horizontal
  const rotEQD = A.Rotation_EQD_HOR(time, obs);   // equinox-of-date -> horizontal

  const cat = loadCatalog();
  const stars = [];
  const S = cat.stars;
  for (let i = 0; i < S.length; i++) {
    const s = S[i]; // [hip, ra, dec, mag, bv] (sorted brightest first)
    if (s[3] > magLimit) break;
    const hv = eqToHorizVec(rotEQJ, s[1], s[2]);
    if (hv.z < -0.05) continue; // more than ~3 deg below the horizon
    const p = horizToDisk(hv);
    if (p.r > 1.035) continue;
    stars.push({ hip: s[0], x: p.x, y: p.y, mag: s[3], rgb: bvToRgb(s[4]) });
  }

  // Sun
  const sunEq = A.Equator(A.Body.Sun, time, obs, true, false);
  const sunP = horizToDisk(eqToHorizVec(rotEQD, sunEq.ra * 15, sunEq.dec));

  // Moon
  const moonEq = A.Equator(A.Body.Moon, time, obs, true, false);
  const moonP = horizToDisk(eqToHorizVec(rotEQD, moonEq.ra * 15, moonEq.dec));
  const ill = A.Illumination(A.Body.Moon, time);
  // Determine waxing/waning: elongation trend via illumination phase angle & sun-moon geometry.
  // Simpler & robust: compare moon's ecliptic longitude difference from the sun.
  let waxing = true;
  try {
    const eclM = A.Ecliptic(A.GeoVector(A.Body.Moon, time, true));
    const eclS = A.Ecliptic(A.GeoVector(A.Body.Sun, time, true));
    let dlon = eclM.elon - eclS.elon;
    if (dlon < 0) dlon += 360;
    waxing = dlon < 180;
  } catch { /* default waxing */ }
  const moon = {
    x: moonP.x, y: moonP.y, alt: moonP.alt, az: moonP.az,
    k: ill.phase_fraction,
    waxing,
    phaseName: moonPhaseName(ill.phase_fraction, waxing),
    // Direction (in disk space) from moon toward the sun: lit limb faces this angle.
    litAngle: Math.atan2(sunP.y - moonP.y, sunP.x - moonP.x),
    visible: moonP.alt > 0 && ill.phase_fraction > 0.015 && moonP.r <= 0.999,
  };

  // Planets
  const planets = [];
  for (const [name, body] of [['Mercury', A.Body.Mercury], ['Venus', A.Body.Venus], ['Mars', A.Body.Mars], ['Jupiter', A.Body.Jupiter], ['Saturn', A.Body.Saturn]]) {
    try {
      const eq = A.Equator(body, time, obs, true, false);
      const p = horizToDisk(eqToHorizVec(rotEQD, eq.ra * 15, eq.dec));
      if (p.alt <= 0.5 || p.r > 0.999) continue;
      let mag = null;
      try { mag = A.Illumination(body, time).mag; } catch { /* ok */ }
      planets.push({ name, x: p.x, y: p.y, alt: p.alt, mag });
    } catch { /* skip */ }
  }

  // Constellation figures
  let constellations = [];
  if (opts.withConstellations !== false) {
    const cd = loadConstellations();
    const posByHip = new Map();
    for (const st of stars) posByHip.set(st.hip, st);
    for (const c of cd.constellations) {
      const segs = [];
      let sumX = 0, sumY = 0, sumW = 0, minR = 0, weight = 0;
      for (const line of c.lines) {
        for (let i = 0; i < line.length - 1; i++) {
          const a = posByHip.get(line[i]), b = posByHip.get(line[i + 1]);
          if (!a || !b) continue;
          if (Math.hypot(a.x, a.y) > 1.0 || Math.hypot(b.x, b.y) > 1.0) continue;
          segs.push([a.x, a.y, b.x, b.y]);
        }
      }
      for (const line of c.lines) {
        for (const hip of line) {
          const s = posByHip.get(hip);
          if (!s) continue;
          const w = Math.max(0.2, 6.5 - s.mag);
          sumX += s.x * w; sumY += s.y * w; sumW += w;
          weight = Math.max(weight, w);
        }
      }
      if (!segs.length || !sumW) continue;
      const lx = sumX / sumW, ly = sumY / sumW;
      minR = Math.hypot(lx, ly);
      constellations.push({ abbr: c.abbr, en: c.en, latin: c.latin, segs, weight, label: { x: lx, y: ly, inside: minR < 0.82 } });
    }
  }

  return {
    dateUTC: dateUTC.toISOString(),
    lat, lon,
    stars,
    moon,
    sun: { alt: sunP.alt, az: sunP.az, x: sunP.x, y: sunP.y, visible: sunP.alt > 0 },
    planets,
    constellations,
    daylight: sunP.alt > -6,
  };
}

module.exports = { computeSky, bvToRgb, moonPhaseName };
