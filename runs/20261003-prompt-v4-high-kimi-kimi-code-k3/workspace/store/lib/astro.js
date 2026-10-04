// Astronomy math: equatorial -> horizontal coordinates, moon position & phase.
// Accuracy is ~0.5 deg for stars (catalog epoch J2000, no precession) and
// ~2 deg for the moon — plenty for a printed star map.

const DEG = Math.PI / 180;

function julianDate(date) {
  return date.getTime() / 86400000 + 2440587.5;
}

// Local sidereal time in degrees
function localSiderealDegrees(date, lonDeg) {
  const d = julianDate(date) - 2451545.0;
  let gmst = 280.46061837 + 360.98564736629 * d;
  gmst = ((gmst % 360) + 360) % 360;
  return (((gmst + lonDeg) % 360) + 360) % 360;
}

// ra/dec in degrees, lat/lon in degrees -> {alt, az} in degrees (az from north, eastward)
function equatorialToHorizontal(ra, dec, lat, lstDeg) {
  const H = (lstDeg - ra) * DEG;
  const decR = dec * DEG;
  const latR = lat * DEG;
  const sinAlt = Math.sin(decR) * Math.sin(latR) + Math.cos(decR) * Math.cos(latR) * Math.cos(H);
  const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt)));
  const y = -Math.sin(H);
  const x = Math.tan(decR) * Math.cos(latR) - Math.sin(latR) * Math.cos(H);
  let az = Math.atan2(y, x);
  if (az < 0) az += 2 * Math.PI;
  return { alt: alt / DEG, az: az / DEG };
}

// Low-precision geocentric moon position (Meeus, truncated) -> {ra, dec} degrees
function moonPosition(date) {
  const d = julianDate(date) - 2451545.0;
  const L = (218.316 + 13.176396 * d) * DEG; // mean longitude
  const M = (134.963 + 13.064993 * d) * DEG; // mean anomaly
  const F = (93.272 + 13.229350 * d) * DEG;  // argument of latitude
  const lon = L + 6.289 * DEG * Math.sin(M);
  const lat = 5.128 * DEG * Math.sin(F);
  const eps = 23.439 * DEG;
  const ra = Math.atan2(Math.sin(lon) * Math.cos(eps) - Math.tan(lat) * Math.sin(eps), Math.cos(lon));
  const dec = Math.asin(Math.sin(lat) * Math.cos(eps) + Math.cos(lat) * Math.sin(eps) * Math.sin(lon));
  return { ra: ((ra / DEG) % 360 + 360) % 360, dec: dec / DEG };
}

// Sun ecliptic longitude (degrees), low precision
function sunLongitude(date) {
  const d = julianDate(date) - 2451545.0;
  const L = (280.460 + 0.9856474 * d) * DEG;
  const g = (357.528 + 0.9856003 * d) * DEG;
  return ((L / DEG + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) % 360 + 360) % 360;
}

// Phase 0..1 (0 = new, 0.5 = full) and illuminated fraction
function moonPhase(date) {
  const d = julianDate(date) - 2451545.0;
  const moonLon = ((218.316 + 13.176396 * d) % 360 + 360) % 360;
  const elong = (((moonLon - sunLongitude(date)) % 360) + 360) % 360; // 0=new 180=full
  const phase = elong / 360;
  const illum = (1 - Math.cos(elong * DEG)) / 2;
  return { phase, illum, elong };
}

// Visible stars for date/lat/lon. stars: [[ra, dec, mag, bv], ...]
function visibleStars(stars, date, lat, lon, minAlt = 0) {
  const lst = localSiderealDegrees(date, lon);
  const out = [];
  for (const [ra, dec, mag, bv] of stars) {
    const { alt, az } = equatorialToHorizontal(ra, dec, lat, lst);
    if (alt > minAlt) out.push({ alt, az, mag, bv });
  }
  const moon = moonPosition(date);
  const m = equatorialToHorizontal(moon.ra, moon.dec, lat, lst);
  const ph = moonPhase(date);
  return { stars: out, moon: m.alt > -2 ? { ...m, ...ph } : null, lst };
}

module.exports = { julianDate, localSiderealDegrees, equatorialToHorizontal, moonPosition, moonPhase, visibleStars, DEG };
