// Independent classical-mechanics cross-check: Sirius over London, 2026-01-15 21:00 UTC.
// Uses IAU 1976 rigorous precession + IAU 1982 GMST + textbook alt/az formulas.
const A = require('astronomy-engine');
const D2R = Math.PI / 180, R2D = 180 / Math.PI;

const date = new Date(Date.UTC(2026, 0, 15, 21, 0, 0));
const lat = 51.5074, lon = -0.1278; // London
const ra0 = 101.28715 * D2R, dec0 = -16.71612 * D2R; // Sirius J2000 (radians)

// Julian date (UT)
const JD = date.getTime() / 86400000 + 2440587.5;
const T = (JD - 2451545.0) / 36525;

// IAU 1976 rigorous precession angles (arcsec -> radians)
const zeta = ((2306.2181 + (0.30188 + 0.017998 * T) * T) * T) / 3600 * D2R;
const z    = ((2306.2181 + (1.09468 + 0.018203 * T) * T) * T) / 3600 * D2R;
const theta= ((2004.3109 + (-0.42665 - 0.041833 * T) * T) * T) / 3600 * D2R;

function rotZ(a, v) { // rotate about z by angle a
  const c = Math.cos(a), s = Math.sin(a);
  return [c * v[0] - s * v[1], s * v[0] + c * v[1], v[2]];
}
function rotY(a, v) { // rotate about y by angle a
  const c = Math.cos(a), s = Math.sin(a);
  return [c * v[0] + s * v[2], v[1], -s * v[0] + c * v[2]];
}

// J2000 unit vector
let v = [Math.cos(dec0) * Math.cos(ra0), Math.cos(dec0) * Math.sin(ra0), Math.sin(dec0)];
// Precess J2000 -> of-date:  R = Rz(-z) Ry(theta) Rz(-zeta)  (applied right-to-left)
v = rotZ(-zeta, v);
v = rotY(theta, v);
v = rotZ(-z, v);
const raDate = ((Math.atan2(v[1], v[0]) * R2D + 360) % 360) / 15; // sidereal hours
const decDate = Math.asin(v[2]) * R2D;

// IAU 1982 GMST (seconds of time), UT1 ~ UTC
const gmstSec = (67310.54841 + (876600 * 3600 + 8640184.812866) * T + 0.093104 * T * T - 6.2e-6 * T * T * T) % 86400;
const gmstH = (gmstSec + 86400) % 86400 / 3600;
const lst = gmstH + lon / 15; // lon east positive; London negative
let H = (lst - raDate) * 15 * D2R; // hour angle radians

const phi = lat * D2R, dec = decDate * D2R;
const sinAlt = Math.sin(dec) * Math.sin(phi) + Math.cos(dec) * Math.cos(phi) * Math.cos(H);
const alt = Math.asin(sinAlt) * R2D;
const az = (Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(phi) - Math.tan(dec) * Math.cos(phi)) * R2D + 180 + 360) % 360;

console.log(`JD=${JD.toFixed(5)} T=${T.toFixed(6)}`);
console.log(`Sirius of-date: RA ${raDate.toFixed(5)}h Dec ${decDate.toFixed(4)}°`);
console.log(`CLASSICAL:  alt ${alt.toFixed(4)}°  az ${az.toFixed(4)}°`);

// Library paths for comparison
const obs = new A.Observer(lat, lon, 0);
const t = A.MakeTime(date);
const hLib = A.Horizon(t, obs, 101.28715 / 15, -16.71612, null);
console.log(`Horizon():  alt ${hLib.altitude.toFixed(4)}°  az ${hLib.azimuth.toFixed(4)}°`);
const rot = A.Rotation_EQJ_HOR(t, obs);
const hv = A.RotateVector(rot, v0());
function v0() { return { x: Math.cos(dec0) * Math.cos(ra0), y: Math.cos(dec0) * Math.sin(ra0), z: Math.sin(dec0) }; }
const mAlt = Math.asin(hv.z) * R2D;
const mAz = (Math.atan2(-hv.y, hv.x) * R2D + 360) % 360;
console.log(`Matrix:     alt ${mAlt.toFixed(4)}°  az ${mAz.toFixed(4)}°`);
console.log(`diff Horizon()-classical: alt ${(hLib.altitude - alt).toFixed(4)}°  az ${(((hLib.azimuth - az + 540) % 360) - 180).toFixed(4)}°`);
console.log(`diff Matrix-classical:    alt ${(mAlt - alt).toFixed(4)}°  az ${(((mAz - az + 540) % 360) - 180).toFixed(4)}°`);
