// Sky computations for Nocturne Supply Co.
//
// Stars/lines/Milky Way are given in J2000 equatorial coordinates. We project them
// to the local horizon with a classical, independently validated pipeline:
//   IAU 1976 rigorous precession (J2000 -> of-date)
//   IAU 1982 GMST (+ equation of equinoxes omitted, <= 1.2 arcsec)
//   spherical-trigonometry alt/az transform
// (Verified against textbook expectations in scripts/validate-astro.js and
//  scripts/validate-classical.js; accurate to a few arcseconds for our date range.)
//
// Body positions (Sun, Moon, planets) come from astronomy-engine, which we use
// only for its high-precision ephemerides, then feed through the same projector.

const A = require('astronomy-engine');

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

class SkyEngine {
  /**
   * @param {Date} utcDate  moment in UTC
   * @param {number} latDeg observer latitude (north +)
   * @param {number} lonDeg observer longitude (east +)
   */
  constructor(utcDate, latDeg, lonDeg) {
    this.date = utcDate;
    this.lat = latDeg;
    this.lon = lonDeg;

    const JD = utcDate.getTime() / 86400000 + 2440587.5;
    this.jd = JD;
    const T = (JD - 2451545.0) / 36525;
    this.T = T;

    // --- IAU 1976 rigorous precession, composed into a single 3x3 matrix ---
    const zeta = ((2306.2181 + (0.30188 + 0.017998 * T) * T) * T) / 3600 * D2R;
    const z = ((2306.2181 + (1.09468 + 0.018203 * T) * T) * T) / 3600 * D2R;
    const theta = ((2004.3109 + (-0.42665 - 0.041833 * T) * T) * T) / 3600 * D2R;
    this.prec = matMul(matRz(-z), matMul(matRy(theta), matRz(-zeta)));

    // --- Sidereal time (UT1 ~ UTC; |UT1-UTC| < 0.9s -> < 0.004 deg) ---
    const gmstSec =
      (67310.54841 +
        (876600 * 3600 + 8640184.812866) * T +
        0.093104 * T * T -
        6.2e-6 * T * T * T) %
      86400;
    const gmstH = (((gmstSec + 86400) % 86400) / 3600);
    this.lstHours = (((gmstH + lonDeg / 15) % 24) + 24) % 24;
    const lstRad = this.lstHours * 15 * D2R;

    this.sinPhi = Math.sin(latDeg * D2R);
    this.cosPhi = Math.cos(latDeg * D2R);
    this.cosLst = Math.cos(lstRad);
    this.sinLst = Math.sin(lstRad);
  }

  /** Project J2000 ra/dec (degrees) -> { alt, az } (degrees; az clockwise from north). */
  project(raDeg, decDeg) {
    const ra = raDeg * D2R;
    const dec = decDeg * D2R;
    const cd = Math.cos(dec);
    // J2000 unit vector -> precess to of-date
    const x0 = cd * Math.cos(ra);
    const y0 = cd * Math.sin(ra);
    const z0 = Math.sin(dec);
    const m = this.prec;
    const x = m[0][0] * x0 + m[0][1] * y0 + m[0][2] * z0;
    const y = m[1][0] * x0 + m[1][1] * y0 + m[1][2] * z0;
    const z = m[2][0] * x0 + m[2][1] * y0 + m[2][2] * z0;
    return this._ofDateToHorizon(x, y, z);
  }

  /** Same, from a unit vector already in of-date equatorial coords. */
  projectOfDate(x, y, z) {
    return this._ofDateToHorizon(x, y, z);
  }

  /** Precess a J2000 unit vector to of-date (used for chord-sampled line segments). */
  precess(x0, y0, z0) {
    const m = this.prec;
    return [
      m[0][0] * x0 + m[0][1] * y0 + m[0][2] * z0,
      m[1][0] * x0 + m[1][1] * y0 + m[1][2] * z0,
      m[2][0] * x0 + m[2][1] * y0 + m[2][2] * z0,
    ];
  }

  _ofDateToHorizon(x, y, z) {
    // meridian-direction component on the equatorial plane
    const m1 = x * this.cosLst + y * this.sinLst; // toward local meridian (H=0)
    const m2 = -x * this.sinLst + y * this.cosLst; // toward east
    const sinAlt = z * this.sinPhi + m1 * this.cosPhi;
    const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt))) * R2D;
    const north = z * this.cosPhi - m1 * this.sinPhi;
    let az = Math.atan2(m2, north) * R2D;
    if (az < 0) az += 360;
    return { alt, az };
  }

  // --- Bodies --------------------------------------------------------------

  /** Sun: J2000 equatorial from astronomy-engine, projected through our pipeline. */
  sun() {
    const t = A.MakeTime(this.date);
    const eq = A.Equator(A.Body.Sun, t, new A.Observer(this.lat, this.lon, 0), false, true);
    const h = this.project(eq.ra * 15, eq.dec);
    return { ...h, ra: eq.ra * 15, dec: eq.dec };
  }

  moon() {
    const t = A.MakeTime(this.date);
    const obs = new A.Observer(this.lat, this.lon, 0);
    const eq = A.Equator(A.Body.Moon, t, obs, false, true);
    const illum = A.Illumination(A.Body.Moon, t);
    const h = this.project(eq.ra * 15, eq.dec);
    return {
      ...h,
      ra: eq.ra * 15,
      dec: eq.dec,
      phaseFraction: illum.phase_fraction,
      phaseAngle: illum.phase_angle, // degrees; 0 = full, 180 = new
      mag: illum.mag,
    };
  }

  planets() {
    const t = A.MakeTime(this.date);
    const obs = new A.Observer(this.lat, this.lon, 0);
    const out = [];
    for (const body of [A.Body.Mercury, A.Body.Venus, A.Body.Mars, A.Body.Jupiter, A.Body.Saturn]) {
      const eq = A.Equator(body, t, obs, false, true);
      const illum = A.Illumination(body, t);
      const h = this.project(eq.ra * 15, eq.dec);
      out.push({ name: bodyName(body), ...h, ra: eq.ra * 15, dec: eq.dec, mag: illum.mag });
    }
    return out;
  }
}

function bodyName(body) {
  switch (body) {
    case A.Body.Mercury: return 'Mercury';
    case A.Body.Venus: return 'Venus';
    case A.Body.Mars: return 'Mars';
    case A.Body.Jupiter: return 'Jupiter';
    case A.Body.Saturn: return 'Saturn';
    default: return String(body);
  }
}

// --- 3x3 matrix helpers ----------------------------------------------------

function matRz(a) {
  const c = Math.cos(a), s = Math.sin(a);
  return [[c, -s, 0], [s, c, 0], [0, 0, 1]];
}
function matRy(a) {
  const c = Math.cos(a), s = Math.sin(a);
  return [[c, 0, s], [0, 1, 0], [-s, 0, c]];
}
function matMul(a, b) {
  const r = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++)
      r[i][j] = a[i][0] * b[0][j] + a[i][1] * b[1][j] + a[i][2] * b[2][j];
  return r;
}

// --- Stereographic zenithal chart projection --------------------------------
// r_chart = R * tan((90 - alt) / 2); horizon maps exactly to R, zenith to 0.
// North is up, east is right: x = cx + r*sin(az), y = cy - r*cos(az).
function stereographic(alt, az, R) {
  const r = R * Math.tan(((90 - alt) / 2) * D2R);
  const a = az * D2R;
  return { r, dx: r * Math.sin(a), dy: -r * Math.cos(a) };
}

// --- Moon phase name ---------------------------------------------------------
function moonPhaseName(fraction, waxing) {
  if (fraction < 0.02) return 'New Moon';
  if (fraction > 0.98) return 'Full Moon';
  if (Math.abs(fraction - 0.5) < 0.04) return waxing ? 'First Quarter Moon' : 'Last Quarter Moon';
  if (fraction < 0.5) return waxing ? 'Waxing Crescent Moon' : 'Waning Crescent Moon';
  return waxing ? 'Waxing Gibbous Moon' : 'Waning Gibbous Moon';
}

/** Waxing if the moon's ecliptic longitude is 0-180 deg ahead of the sun's. */
function moonIsWaxing(date) {
  const t = A.MakeTime(date);
  const moonLon = A.EclipticGeoMoon(t).lon;
  const sunLon = A.SunPosition(t).elon;
  return (((moonLon - sunLon) % 360) + 360) % 360 < 180;
}

module.exports = { SkyEngine, stereographic, moonPhaseName, moonIsWaxing, D2R, R2D };
