// Positional astronomy for CELESTEE star charts.
// Shared between the browser preview and the server-side print renderer.
//
// Coordinates: RA/Dec are J2000 degrees from the Yale/Bright-Star-derived
// d3-celestial dataset. Accuracy is ~arcminute level for chart purposes:
// enough that "the sky that night" is genuinely the sky that night.
import STARS from '../data/stars.json';
import CONSTELLATIONS from '../data/constellations.json';

export { STARS, CONSTELLATIONS };

const D2R = Math.PI / 180;

export function julianDate(utcMs) {
  return utcMs / 86400000 + 2440587.5;
}

// Greenwich Mean Sidereal Time in hours (IAU 1982 approximation)
export function gmstHours(jd) {
  const d = jd - 2451545.0;
  let g = 18.697374558 + 24.06570982441908 * d;
  g %= 24;
  if (g < 0) g += 24;
  return g;
}

// Altitude/azimuth for an equatorial position.
// Returns { alt, az } in degrees; az measured from North, increasing eastward.
export function altAz(raDeg, decDeg, latDeg, lstHours) {
  const ha = (lstHours * 15 - raDeg) * D2R;
  const dec = decDeg * D2R;
  const lat = latDeg * D2R;
  const sinAlt = Math.sin(dec) * Math.sin(lat) + Math.cos(dec) * Math.cos(lat) * Math.cos(ha);
  const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt)));
  // proportional to sin(A) and cos(A) with A from north, eastward
  const y = -Math.cos(dec) * Math.sin(ha);
  const x = (Math.sin(dec) - sinAlt * Math.sin(lat)) / Math.max(1e-9, Math.cos(lat));
  let az = Math.atan2(y, x) / D2R;
  if (az < 0) az += 360;
  return { alt: alt / D2R, az };
}

// Moon phase: returns { frac, illum, waxing } where frac in [0,1) is the
// cycle position (0 = new, 0.5 = full) and illum in [0,1] the lit fraction.
export function moonPhase(utcMs) {
  const SYNODIC = 29.530588853;
  const NEW_MOON_JD = 2451550.26; // 2000-01-06 18:14 UTC
  const days = julianDate(utcMs) - NEW_MOON_JD;
  let frac = (days % SYNODIC) / SYNODIC;
  if (frac < 0) frac += 1;
  const illum = (1 - Math.cos(2 * Math.PI * frac)) / 2;
  return { frac, illum, waxing: frac < 0.5 };
}

export function moonPhaseName(frac) {
  const names = [
    'New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous',
    'Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent',
  ];
  return names[Math.floor(((frac * 8) + 0.5) % 8)];
}

// Project the visible hemisphere to a chart disc (azimuthal equidistant,
// zenith at centre, horizon at the rim). Mirrors east-west so the chart
// reads like the sky held overhead: north up, east to the left.
export function projectSky({ utcMs, lat, lng }) {
  const jd = julianDate(utcMs);
  const lst = gmstHours(jd) + lng / 15;
  const stars = [];
  for (const [ra, dec, mag, bv] of STARS) {
    const { alt, az } = altAz(ra, dec, lat, lst);
    if (alt < 1.5) continue; // below horizon (tiny buffer keeps the rim clean)
    const r = (90 - alt) / 90; // 0 zenith -> 1 horizon
    const a = az * D2R;
    stars.push({ x: -r * Math.sin(a), y: -r * Math.cos(a), mag, bv });
  }
  const lines = [];
  for (const key of Object.keys(CONSTELLATIONS)) {
    for (const seg of CONSTELLATIONS[key]) {
      const pts = [];
      for (const [ra, dec] of seg) {
        const { alt, az } = altAz(ra, dec, lat, lst);
        const r = (90 - alt) / 90;
        const a = az * D2R;
        pts.push({ alt, x: -r * Math.sin(a), y: -r * Math.cos(a) });
      }
      // keep only segments fully above the horizon (avoids chords across the disc)
      if (pts.length > 1 && pts.every((p) => p.alt > 0)) {
        lines.push(pts.map(({ x, y }) => ({ x, y })));
      }
    }
  }
  return { stars, lines };
}

// Map B–V colour index to a plausible star colour.
export function starColor(bv) {
  const stops = [
    [-0.4, [168, 193, 255]],
    [0.0, [202, 216, 255]],
    [0.3, [240, 242, 255]],
    [0.6, [255, 248, 235]],
    [0.9, [255, 231, 194]],
    [1.3, [255, 205, 150]],
    [2.0, [255, 176, 120]],
  ];
  let c = stops[stops.length - 1][1];
  for (let i = 0; i < stops.length - 1; i++) {
    const [b0, c0] = stops[i];
    const [b1, c1] = stops[i + 1];
    if (bv >= b0 && bv <= b1) {
      const t = (bv - b0) / (b1 - b0);
      c = c0.map((v, k) => Math.round(v + (c1[k] - v) * t));
      break;
    }
  }
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}
