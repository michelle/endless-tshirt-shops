// Nightshift sky math — pure functions, no DOM, runs in the browser renderer
// and under `node --test`. Every shirt is a computed sky: a wall-clock time
// and a place are turned into the apparent positions of 2,189 stars, 89
// constellation figures and the Moon for that exact instant, from J2000
// catalogue coordinates.
//
// Accuracy notes: GMST/alt-az are full-precision. Sun uses Meeus' low
// precision solar coordinates (~0.01°). Moon uses short ELP series
// (Schlyter's truncated model with the eight dominant perturbation terms,
// ~0.2°–0.5°) — comfortably inside the visual tolerance of a 30 cm print.

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

const sind = (x) => Math.sin(x * RAD);
const cosd = (x) => Math.cos(x * RAD);

export const J2000 = 2451545.0;

export function toJulian(ms) {
  return ms / 86400000 + 2440587.5;
}

// Sidereal time (Meeus 12.4, low-order terms), degrees.
export function gmstDeg(jd) {
  const d = jd - J2000;
  const t = d / 36525;
  const gmst = 280.46061837 + 360.98564736629 * d + 0.000387933 * t * t - (t * t * t) / 38710000;
  return mod(gmst, 360);
}

export function lstDeg(jd, longitudeDeg) {
  return mod(gmstDeg(jd) + longitudeDeg, 360);
}

// Equatorial -> horizontal. Returns alt/az in degrees, azimuth measured from
// North increasing eastward (N=0, E=90, S=180, W=270).
export function hadecToAltaz(raDeg, decDeg, lstDeg, latitudeDeg) {
  const h = mod(lstDeg - raDeg, 360) * RAD; // hour angle west of meridian
  const phi = latitudeDeg * RAD;
  const dec = decDeg * RAD;
  const sinAlt = Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(h);
  const alt = Math.asin(clamp(sinAlt, -1, 1));
  // Meeus 13.5: azimuth from South, positive west; shift to north-referenced.
  const azSouth = Math.atan2(Math.sin(h), Math.cos(h) * Math.sin(phi) - Math.tan(dec) * Math.cos(phi));
  const az = mod(azSouth * DEG + 180, 360);
  return { altDeg: alt * DEG, azDeg: az };
}

// Zenithal stereographic projection onto the unit disc, North up, East right
// — the sky as seen looking up. Returns [x, y] in [-1, 1] or null when the
// point is below the horizon.
export function altazToDisc(altDeg, azDeg) {
  if (altDeg < 0) return null;
  const za = (90 - altDeg) * RAD;
  const r = Math.tan(za / 2);
  if (!Number.isFinite(r)) return null;
  const a = azDeg * RAD;
  return [r * Math.sin(a), -r * Math.cos(a)];
}

// Wall-clock time in an IANA zone -> UTC instant. Uses Intl (with full
// historical DST rules) to resolve the offset at that moment; two iterations
// converge for any date since the zone database's epoch.
export function localToUTC(wallISO, timeZone) {
  const guess = Date.parse(wallISO + 'Z'); // interpret the wall time as UTC first
  if (!Number.isFinite(guess)) return null;
  let utc = guess;
  for (let i = 0; i < 3; i++) {
    const offset = tzOffsetMinutes(timeZone, utc);
    if (offset === null) return null;
    const next = guess - offset * 60000;
    if (next === utc) break;
    utc = next;
  }
  return { ms: utc, offsetMinutes: (utc - guess) / -60000 };
}

function tzOffsetMinutes(timeZone, ms) {
  try {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const parts = {};
    for (const part of dtf.formatToParts(new Date(ms))) parts[part.type] = part.value;
    let hour = Number(parts.hour);
    if (hour === 24) hour = 0; // some CLDR builds emit 24:00
    const asUTC = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      hour,
      Number(parts.minute),
      Number(parts.second),
    );
    if (!Number.isFinite(asUTC)) return null;
    return Math.round((asUTC - Math.floor(ms / 1000) * 1000) / 60000);
  } catch {
    return null;
  }
}

// Obliquity of the ecliptic (Meeus 22.2, truncated).
export function obliquityDeg(jd) {
  return 23.4393 - 3.563e-7 * (jd - J2000);
}

// --- Sun (Meeus 25 low precision) ----------------------------------------
export function sunEquatorial(jd) {
  const n = jd - J2000;
  const L = mod(280.46 + 0.9856474 * n, 360);
  const g = mod(357.528 + 0.9856003 * n, 360) * RAD;
  const lambda = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * RAD;
  return eclipticToEquatorial(lambda, 0, jd);
}

// --- Moon (Schlyter's short ELP: ellipse + 12 longitude, 5 latitude and 2
// distance perturbation terms; ~1-2 arcminutes of accuracy) ----------------
export function moonState(jd, sun) {
  const sunGeo = sun || sunEquatorial(jd);
  const d = jd - 2451543.5; // Schlyter's epoch: 2000 Jan 0.0 TDT
  const N = mod(125.1228 - 0.0529538083 * d, 360);
  const i = 5.1454 * RAD;
  const w = mod(318.0634 + 0.1643573223 * d, 360);
  const a = 60.2666; // Earth radii
  const e = 0.0549;
  const M = mod(115.3654 + 13.0649929509 * d, 360);

  const Mr = M * RAD;
  let E = Mr;
  for (let iter = 0; iter < 12; iter++) {
    const dE = (Mr - E + e * Math.sin(E)) / (1 - e * Math.cos(E));
    E += dE;
    if (Math.abs(dE) < 1e-9) break;
  }
  const xPlane = a * (Math.cos(E) - e);
  const yPlane = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const r0 = Math.hypot(xPlane, yPlane);
  const v = Math.atan2(yPlane, xPlane);

  const xe = r0 * (cosd(N) * cosd(v * DEG + w) - sind(N) * sind(v * DEG + w) * Math.cos(i));
  const ye = r0 * (sind(N) * cosd(v * DEG + w) + cosd(N) * sind(v * DEG + w) * Math.cos(i));
  const ze = r0 * sind(v * DEG + w) * Math.sin(i);

  let lon = Math.atan2(ye, xe) * DEG;
  let lat = Math.atan2(ze, Math.hypot(xe, ye)) * DEG;
  let r = Math.hypot(xe, ye, ze);

  // Fundamental arguments for the perturbation terms.
  const Ms = mod(356.047 + 0.9856002585 * d, 360); // sun mean anomaly
  const ws = mod(282.9404 + 4.70935e-5 * d, 360); // sun perihelion
  const Ls = mod(Ms + ws, 360); // sun mean longitude
  const Lm = mod(N + w + M, 360); // moon mean longitude
  const D = mod(Lm - Ls, 360); // mean elongation
  const Mm = M; // moon mean anomaly
  const F = mod(Lm - N, 360); // argument of latitude

  lon +=
    -1.274 * sind(Mm - 2 * D) + // evection
    0.658 * sind(2 * D) - // variation
    0.186 * sind(Ms) - // yearly equation
    0.059 * sind(2 * Mm - 2 * D) -
    0.057 * sind(Mm - 2 * D + Ms) +
    0.053 * sind(Mm + 2 * D) +
    0.046 * sind(2 * D - Ms) +
    0.041 * sind(Mm - Ms) -
    0.035 * sind(D) - // parallactic equation
    0.031 * sind(Mm + Ms) -
    0.015 * sind(2 * F - 2 * D) +
    0.011 * sind(Mm - 4 * D);
  lat +=
    -0.173 * sind(F - 2 * D) -
    0.055 * sind(Mm - F - 2 * D) -
    0.046 * sind(Mm + F - 2 * D) +
    0.033 * sind(F + 2 * D) +
    0.017 * sind(2 * Mm + F);
  r += -0.58 * cosd(Mm - 2 * D) - 0.46 * cosd(2 * D);

  const { raDeg, decDeg } = eclipticToEquatorial(lon * RAD, lat * RAD, jd);
  const elongation = mod(lon - sunGeo.lambdaDeg, 360); // 0 = new, 180 = full
  // Illuminated fraction from the phase angle at the Moon (the triangle
  // Sun-Earth-Moon; 1 AU = 23455.6 Earth radii, r is the lunar distance).
  const psi = elongation * RAD;
  const phaseAngle = Math.atan2(23455.6 * Math.sin(psi), r - 23455.6 * Math.cos(psi));
  const illum = (1 + Math.cos(phaseAngle)) / 2;
  // Mean angular radius in degrees; 0.2727 Earth radii is the Moon's radius.
  const angularRadiusDeg = Math.asin(clamp(0.2727 / r, 0, 1)) * DEG;
  return {
    raDeg,
    decDeg,
    illumFraction: illum,
    angularRadiusDeg,
    lambdaDeg: mod(lon, 360),
    betaDeg: lat,
    elongationDeg: elongation,
  };
}

export function eclipticToEquatorial(lambdaRad, betaRad, jd) {
  const eps = obliquityDeg(jd) * RAD;
  const ra = Math.atan2(
    Math.sin(lambdaRad) * Math.cos(eps) - Math.tan(betaRad) * Math.sin(eps),
    Math.cos(lambdaRad),
  );
  const dec = Math.asin(
    Math.sin(betaRad) * Math.cos(eps) + Math.cos(betaRad) * Math.sin(eps) * Math.sin(lambdaRad),
  );
  return { raDeg: mod(ra * DEG, 360), decDeg: dec * DEG, lambdaDeg: mod(lambdaRad * DEG, 360) };
}

export function mod(x, m) {
  return ((x % m) + m) % m;
}

export function clamp(x, lo, hi) {
  return Math.min(hi, Math.max(lo, x));
}
