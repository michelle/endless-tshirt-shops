'use strict';
// Minimal spherical-astronomy helpers used to place real stars for a given
// instant and observing location. All angles in degrees unless noted.

const DEG = Math.PI / 180;

function julianDate(ms) {
  return ms / 86400000 + 2440587.5;
}

// Greenwich Mean Sidereal Time, degrees.
function gmstDeg(jd) {
  const T = (jd - 2451545.0) / 36525;
  let g =
    280.46061837 +
    360.98564736629 * (jd - 2451545.0) +
    0.000387933 * T * T -
    (T * T * T) / 38710000;
  return ((g % 360) + 360) % 360;
}

// Equatorial -> horizontal. Azimuth returned measured from South (Meeus),
// the caller converts to from-North.
function altAz(raDeg, decDeg, latDeg, lstDeg) {
  const H = (lstDeg - raDeg) * DEG;
  const dec = decDeg * DEG;
  const lat = latDeg * DEG;
  const sinAlt =
    Math.sin(dec) * Math.sin(lat) + Math.cos(dec) * Math.cos(lat) * Math.cos(H);
  const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt)));
  const az = Math.atan2(
    Math.sin(H),
    Math.cos(H) * Math.sin(lat) - Math.tan(dec) * Math.cos(lat)
  );
  return {
    alt: alt / DEG,
    az: (((az / DEG) + 360) % 360 + 180) % 360, // from North, clockwise
  };
}

// Phase of the Moon. phase 0 = new, 0.25 = first quarter, 0.5 = full.
function moonPhase(jd) {
  const synodic = 29.530588853;
  const age = (((jd - 2451550.1) % synodic) + synodic) % synodic;
  const phase = age / synodic;
  const illum = (1 - Math.cos(2 * Math.PI * phase)) / 2;
  return { phase, illum, age };
}

// Azimuthal-equidistant projection centred on the zenith, oriented the way the
// sky actually looks when you lie back and look up: N up, E to the left.
// alt 90 -> centre, alt 0 -> horizon ring of radius R.
function project(altDeg, azNorthDeg, R) {
  const r = ((90 - altDeg) / 90) * R;
  const a = azNorthDeg * DEG;
  return { x: -Math.sin(a) * r, y: -Math.cos(a) * r, r };
}

module.exports = { julianDate, gmstDeg, altAz, moonPhase, project, DEG };
