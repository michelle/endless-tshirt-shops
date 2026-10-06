import Astronomy from './astronomy.cjs';
import STARS from './data/stars.js';
import CONSTELLATION_LINES from './data/constellations.js';

const RAD = Math.PI / 180;

function tzOffsetMs(utcMs, tz) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(utcMs));
  const g = (t) => Number(parts.find((p) => p.type === t).value);
  const asUtc = Date.UTC(g('year'), g('month') - 1, g('day'), g('hour'), g('minute'), g('second'));
  return asUtc - Math.floor(utcMs / 1000) * 1000;
}

// Convert a wall-clock time at a place to a UTC Date (handles historical DST via Intl).
export function localToUtc(date, time, tz) {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const naive = Date.UTC(y, m - 1, d, hh, mm);
  let utc = naive - tzOffsetMs(naive, tz);
  utc = naive - tzOffsetMs(utc, tz);
  return new Date(utc);
}

// Project a horizontal position onto a unit disc, zenith at centre, north up, east left.
function project(alt, az) {
  const r = (90 - alt) / 90;
  const a = az * RAD;
  return { x: -r * Math.sin(a), y: -r * Math.cos(a), r };
}

function precessionMatrix(time) {
  return Astronomy.Rotation_EQJ_EQD(time).rot;
}

export function computeSky({ date, time, tz, lat, lon }) {
  const when = localToUtc(date, time, tz);
  const t = Astronomy.MakeTime(when);
  const lstDeg = ((Astronomy.SiderealTime(t) * 15 + lon) % 360 + 360) % 360; // apparent sidereal time → degrees
  const rot = precessionMatrix(t);
  const sinLat = Math.sin(lat * RAD);
  const cosLat = Math.cos(lat * RAD);

  const horizontal = (raDeg, decDeg) => {
    // J2000 → equator of date
    const cd = Math.cos(decDeg * RAD);
    const v = [cd * Math.cos(raDeg * RAD), cd * Math.sin(raDeg * RAD), Math.sin(decDeg * RAD)];
    const x = rot[0][0] * v[0] + rot[1][0] * v[1] + rot[2][0] * v[2];
    const y = rot[0][1] * v[0] + rot[1][1] * v[1] + rot[2][1] * v[2];
    const z = rot[0][2] * v[0] + rot[1][2] * v[1] + rot[2][2] * v[2];
    const ra = Math.atan2(y, x);
    const dec = Math.asin(Math.max(-1, Math.min(1, z)));
    const ha = lstDeg * RAD - ra;
    const sinAlt = Math.sin(dec) * sinLat + Math.cos(dec) * cosLat * Math.cos(ha);
    const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt)));
    const az = Math.atan2(-Math.cos(dec) * Math.sin(ha), Math.sin(dec) * cosLat - Math.cos(dec) * sinLat * Math.cos(ha));
    return { alt: alt / RAD, az: ((az / RAD) % 360 + 360) % 360 };
  };

  const stars = [];
  for (const [ra, dec, mag, bv] of STARS) {
    const h = horizontal(ra, dec);
    if (h.alt < -2) continue;
    stars.push({ ...project(h.alt, h.az), mag, bv, alt: h.alt });
  }

  // Constellation segments, kept if both ends are within 12° below the horizon (clipped to the disc later).
  const segments = [];
  const cache = new Map();
  const hp = (pt) => {
    const k = pt[0] + ',' + pt[1];
    let v = cache.get(k);
    if (!v) {
      const h = horizontal(pt[0], pt[1]);
      v = { ...project(h.alt, h.az), alt: h.alt };
      cache.set(k, v);
    }
    return v;
  };
  for (const line of CONSTELLATION_LINES) {
    for (let i = 0; i < line.length - 1; i++) {
      const a = hp(line[i]);
      const b = hp(line[i + 1]);
      if (a.alt < -12 || b.alt < -12) continue;
      if (a.alt < 0 && b.alt < 0) continue;
      segments.push([a, b]);
    }
  }

  // Moon and planets
  const observer = new Astronomy.Observer(lat, lon, 0);
  const place = (body) => {
    const eq = Astronomy.Equator(body, t, observer, true, true);
    const hor = Astronomy.Horizon(t, observer, eq.ra, eq.dec, 'normal');
    return { ...project(hor.altitude, hor.azimuth), alt: hor.altitude, az: hor.azimuth };
  };
  const bodies = [];
  for (const name of ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn']) {
    const p = place(Astronomy.Body[name]);
    if (p.alt > 2) {
      const mag = Astronomy.Illumination(Astronomy.Body[name], t).mag;
      bodies.push({ name, ...p, mag });
    }
  }
  const moon = place(Astronomy.Body.Moon);
  const sun = place(Astronomy.Body.Sun);
  const phaseAngle = Astronomy.MoonPhase(t); // 0 = new, 90 = first quarter, 180 = full, 270 = last quarter
  const illum = (1 - Math.cos(phaseAngle * RAD)) / 2;
  // direction on the chart from the Moon towards the Sun → orientation of its bright limb
  let limbAngle = Math.atan2(sun.y - moon.y, sun.x - moon.x);
  if (!Number.isFinite(limbAngle)) limbAngle = 0;

  return {
    when,
    stars,
    segments,
    planets: bodies,
    moon: { ...moon, illum, phaseAngle, limbAngle, visible: moon.alt > 1 },
    sunAltitude: sun.alt,
  };
}

export function moonPhaseName(phaseAngle) {
  const a = ((phaseAngle % 360) + 360) % 360;
  if (a < 6 || a >= 354) return 'New Moon';
  if (a < 84) return 'Waxing Crescent';
  if (a < 96) return 'First Quarter';
  if (a < 174) return 'Waxing Gibbous';
  if (a < 186) return 'Full Moon';
  if (a < 264) return 'Waning Gibbous';
  if (a < 276) return 'Last Quarter';
  return 'Waning Crescent';
}
