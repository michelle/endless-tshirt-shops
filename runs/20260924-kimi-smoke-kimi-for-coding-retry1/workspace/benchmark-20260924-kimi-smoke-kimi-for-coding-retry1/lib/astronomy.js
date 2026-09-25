// Astronomy math for the star map.
// Star positions use equatorial coordinates (J2000) from the embedded catalog;
// alt/az computed with standard spherical formulas. Sun/Moon use Paul Schlyter's
// low-precision planetary algorithms (accurate to ~1-2 arcmin for the moon,
// plenty for a shirt print). All angles in degrees unless noted.

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

export function julianDate(msUtc) {
  return msUtc / 86400000 + 2440587.5;
}

// Days since 2000 Jan 0.0 (JD 2451543.5), as used by Schlyter's formulas.
function schlyterD(msUtc) {
  return julianDate(msUtc) - 2451543.5;
}

// Greenwich Mean Sidereal Time, in hours (0..24)
export function gmstHours(msUtc) {
  const d = julianDate(msUtc) - 2451545.0;
  let gmst = 18.697374558 + 24.06570982441908 * d;
  gmst = gmst % 24;
  if (gmst < 0) gmst += 24;
  return gmst;
}

// Local sidereal time in hours given east longitude in degrees.
export function lstHours(msUtc, lonEast) {
  let lst = gmstHours(msUtc) + lonEast / 15;
  lst = lst % 24;
  if (lst < 0) lst += 24;
  return lst;
}

// Convert RA (hours), Dec (deg) to alt/az for latitude (deg) at LST (hours).
export function raDecToAltAz(raHours, decDeg, latDeg, lstHrs) {
  const H = (lstHrs - raHours) * 15; // hour angle in degrees
  const dec = decDeg * D2R;
  const lat = latDeg * D2R;
  const h = H * D2R;
  const sinAlt =
    Math.sin(dec) * Math.sin(lat) + Math.cos(dec) * Math.cos(lat) * Math.cos(h);
  const alt = Math.asin(sinAlt);
  // azimuth measured from north, eastward
  const y = -Math.cos(dec) * Math.sin(h);
  const x =
    Math.tan(dec) * Math.cos(lat) - Math.sin(lat) * Math.cos(h);
  let az = Math.atan2(y, x) * R2D;
  if (az < 0) az += 360;
  return { altDeg: alt * R2D, azDeg: az };
}

// --- Sun (low precision, ~arcmin accuracy over centuries near present) ---
export function sunPosition(msUtc) {
  const d = schlyterD(msUtc);
  const w = 282.9404 + 4.70935e-5 * d; // longitude of perihelion
  const e = 0.016709 - 1.151e-9 * d; // eccentricity
  const M = norm(356.047 + 0.9856002585 * d); // mean anomaly
  const E = M + e * R2D * sinD(M) * (1 + e * cosD(M)); // eccentric anomaly (approx)
  const xv = cosD(E) - e;
  const yv = Math.sqrt(1 - e * e) * sinD(E);
  const v = Math.atan2(yv, xv) * R2D; // true anomaly
  const r = Math.sqrt(xv * xv + yv * yv); // radius in AU
  const lon = norm(v + w); // ecliptic longitude
  // ecliptic rectangular -> equatorial
  const eps = 23.4393 - 3.563e-7 * d; // obliquity
  const xs = r * cosD(lon);
  const ys = r * sinD(lon);
  const ra = norm(Math.atan2(ys * cosD(eps), xs) * R2D) / 15; // hours
  const dec = Math.asin(ys * sinD(eps) / r) * R2D;
  return { raHours: ra, decDeg: dec };
}

// --- Moon (Schlyter's simplified lunar theory with main perturbations) ---
export function moonPosition(msUtc) {
  const d = schlyterD(msUtc);
  const N = norm(125.1228 - 0.0529538083 * d); // ascending node
  const i = 5.1454;
  const w = norm(318.0634 + 0.1643573223 * d); // argument of perihelion
  const a = 60.2666; // semi-major axis, earth radii
  const e = 0.0549;
  const M = norm(115.3654 + 13.0649929509 * d); // mean anomaly

  const E0 = M + e * R2D * sinD(M) * (1 + e * cosD(M));
  const xv = a * (cosD(E0) - e);
  const yv = a * Math.sqrt(1 - e * e) * sinD(E0);
  const v = Math.atan2(yv, xv) * R2D;
  const r = Math.sqrt(xv * xv + yv * yv);

  // position in ecliptic coordinates of date
  const u = norm(v + w - N);
  let lonEcl = norm(
    Math.atan2(
      sinD(u) * cosD(i) * cosD(N) + cosD(u) * -sinD(N),
      sinD(u) * cosD(i) * sinD(N) + cosD(u) * cosD(N)
    ) * R2D
  );
  let latEcl =
    Math.asin(sinD(u) * sinD(i)) * R2D;

  // perturbations
  const sun = (() => {
    const ws = 282.9404 + 4.70935e-5 * d;
    const es = 0.016709 - 1.151e-9 * d;
    const Ms = norm(356.047 + 0.9856002585 * d);
    const Es = Ms + es * R2D * sinD(Ms) * (1 + es * cosD(Ms));
    const xvs = cosD(Es) - es;
    const yvs = Math.sqrt(1 - es * es) * sinD(Es);
    return { lon: norm(Math.atan2(yvs, xvs) * R2D + ws), Ms };
  })();
  const Lm = norm(N + w + M); // moon mean longitude
  const Dm = norm(Lm - sun.lon); // mean elongation
  const F = norm(Lm - N); // argument of latitude

  lonEcl =
    norm(lonEcl - 1.274 * sinD(M - 2 * Dm) + 0.658 * sinD(2 * Dm) - 0.186 * sinD(sun.Ms) - 0.059 * sinD(2 * M - 2 * Dm) - 0.057 * sinD(M - 2 * Dm + sun.Ms) + 0.053 * sinD(M + 2 * Dm) + 0.046 * sinD(2 * Dm - sun.Ms) + 0.041 * sinD(M - sun.Ms) - 0.035 * sinD(Dm) - 0.031 * sinD(M + sun.Ms));
  latEcl =
    latEcl -
    0.173 * sinD(F - 2 * Dm) -
    0.055 * sinD(M - F - 2 * Dm) -
    0.046 * sinD(M + F - 2 * Dm) +
    0.033 * sinD(F + 2 * Dm) +
    0.017 * sinD(2 * M + F);

  const eps = 23.4393 - 3.563e-7 * d;
  const xe = r * cosD(lonEcl) * cosD(latEcl);
  const ye = r * sinD(lonEcl) * cosD(latEcl);
  const ze = r * sinD(latEcl);
  const ra = norm(Math.atan2(ye * cosD(eps) - ze * sinD(eps), xe) * R2D) / 15;
  const dec = Math.asin(ye * sinD(eps) + ze * cosD(eps) / 1) * R2D;
  // elongation from the sun drives the phase
  const elong = norm(lonEcl - sun.lon);
  const phase = (1 - Math.cos(elong * D2R)) / 2; // 0 = new, 1 = full
  // rough age of the moon in days (0..29.5)
  const age = (norm(Dm + 180) / 360) * 29.530588853;
  return { raHours: ra, decDeg: dec, phase, age, elongDeg: elong > 180 ? 360 - elong : elong };
}

function sinD(x) { return Math.sin(x * D2R); }
function cosD(x) { return Math.cos(x * D2R); }
function norm(x) { x = x % 360; if (x < 0) x += 360; return x; }

// Resolve a wall-clock date+time in a named IANA timezone to a UTC epoch (ms).
// dateStr "YYYY-MM-DD", timeStr "HH:mm", tz IANA name or "UTC".
// Passes twice to handle DST edge cases.
export function zonedWallTimeToUtc(dateStr, timeStr, tz) {
  if (!tz || tz === 'UTC') {
    return Date.parse(`${dateStr}T${timeStr}:00Z`);
  }
  const [Y, Mo, D] = dateStr.split('-').map(Number);
  const [h, mi] = timeStr.split(':').map(Number);
  const guess = Date.UTC(Y, Mo - 1, D, h, mi);
  const off1 = tzOffsetMinutes(guess, tz);
  const refined = Date.UTC(Y, Mo - 1, D, h, mi) - off1 * 60000;
  const off2 = tzOffsetMinutes(refined, tz);
  return Date.UTC(Y, Mo - 1, D, h, mi) - off2 * 60000;
}

function tzOffsetMinutes(epochMs, tz) {
  // minutes to ADD to UTC to obtain wall time in tz at that instant
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = {};
  for (const p of dtf.formatToParts(new Date(epochMs))) {
    if (p.type !== 'literal') parts[p.type] = Number(p.value);
  }
  const asUTC = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour === 24 ? 0 : parts.hour,
    parts.minute,
    parts.second
  );
  return Math.round((asUTC - epochMs) / 60000);
}

// Format the local wall time in the design's timezone for the caption.
export function formatCaptionDate(dateStr, timeStr, tz) {
  const epoch = zonedWallTimeToUtc(dateStr, timeStr, tz || 'UTC');
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz || 'UTC',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const timeFmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz || 'UTC',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return {
    date: fmt.format(new Date(epoch)).toUpperCase(),
    time: timeFmt.format(new Date(epoch)),
  };
}
