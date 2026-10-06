import { readFileSync } from "node:fs";
import { DateTime } from "luxon";

const sky = JSON.parse(readFileSync(new URL("../data/sky.json", import.meta.url), "utf8"));

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

export function julianDate(date) {
  const y0 = date.getUTCFullYear();
  const m0 = date.getUTCMonth() + 1;
  const day =
    date.getUTCDate() +
    (date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600) / 24;
  let y = y0;
  let m = m0;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + B - 1524.5;
}

function gmstDegrees(jd) {
  const T = (jd - 2451545.0) / 36525;
  let gmst =
    280.46061837 +
    360.98564736629 * (jd - 2451545.0) +
    0.000387933 * T * T -
    (T * T * T) / 38710000;
  gmst %= 360;
  if (gmst < 0) gmst += 360;
  return gmst;
}

export function altAz(raDeg, decDeg, latDeg, lonDeg, jd) {
  const lst = (gmstDegrees(jd) + lonDeg + 360) % 360;
  let ha = lst - raDeg;
  ha = ((ha + 540) % 360) - 180;
  const haR = (ha * Math.PI) / 180;
  const dec = (decDeg * Math.PI) / 180;
  const lat = (latDeg * Math.PI) / 180;
  const sinAlt = Math.sin(dec) * Math.sin(lat) + Math.cos(dec) * Math.cos(lat) * Math.cos(haR);
  const alt = Math.asin(clamp(sinAlt, -1, 1));
  const cosAlt = Math.cos(alt) || 1e-9;
  const sinAz = (-Math.sin(haR) * Math.cos(dec)) / cosAlt;
  const cosAz = (Math.sin(dec) - Math.sin(alt) * Math.sin(lat)) / (cosAlt * Math.cos(lat) || 1e-9);
  let az = Math.atan2(sinAz, cosAz);
  if (az < 0) az += Math.PI * 2;
  return { alt: (alt * 180) / Math.PI, az: (az * 180) / Math.PI };
}

export function project(altDeg, azDeg, cx, cy, radius) {
  if (altDeg <= 0) return null;
  const r = radius * Math.tan((((90 - altDeg) * Math.PI) / 180) / 2);
  const az = (azDeg * Math.PI) / 180;
  return {
    x: cx + r * Math.sin(az),
    y: cy - r * Math.cos(az),
  };
}

export function observe(spec) {
  const when = DateTime.fromISO(`${spec.date}T${spec.time}`, { zone: spec.timezone });
  if (!when.isValid) {
    const err = new Error("That date or timezone could not be read.");
    err.status = 400;
    throw err;
  }
  const jd = julianDate(when.toUTC().toJSDate());
  const lat = Number(spec.lat);
  const lon = Number(spec.lon);
  return { when, jd, lat, lon };
}

export function plotSky(spec, cx, cy, radius) {
  const { when, jd, lat, lon } = observe(spec);
  const stars = [];
  for (const [ra, dec, mag, name] of sky.stars) {
    const pos = altAz(ra, dec, lat, lon, jd);
    if (pos.alt < 1.4) continue;
    const p = project(pos.alt, pos.az, cx, cy, radius);
    if (!p) continue;
    const dist = Math.hypot(p.x - cx, p.y - cy);
    if (dist > radius - 4) continue;
    stars.push({ x: p.x, y: p.y, mag, name, alt: pos.alt });
  }
  const lines = [];
  for (const line of sky.lines) {
    let run = [];
    for (const [ra, dec] of line) {
      const pos = altAz(ra, dec, lat, lon, jd);
      if (pos.alt < 2) {
        if (run.length >= 2) lines.push(run);
        run = [];
        continue;
      }
      const p = project(pos.alt, pos.az, cx, cy, radius);
      if (!p || Math.hypot(p.x - cx, p.y - cy) > radius - 6) {
        if (run.length >= 2) lines.push(run);
        run = [];
        continue;
      }
      run.push(p);
    }
    if (run.length >= 2) lines.push(run);
  }
  return { stars, lines, when };
}
