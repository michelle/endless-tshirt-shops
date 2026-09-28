// Sundial math: solar declination, equation of time, altitude, azimuth,
// and the resulting gnomon shadow. Pure functions, no deps.
//
// Astronomical formulas adapted from NOAA's Solar Position calculator
// (https://gml.noaa.gov/grad/solcalc/), trimmed for the sundial output we need.
// Accuracy is sub-degree for the historical epoch; that's plenty for art.

/** Convert a UTC ISO datetime + lat/lon into the sun's apparent geometry. */
export function solar(date: Date, lat: number, lon: number) {
  // 1. Julian Day (UTC).
  const jd = date.getTime() / 86400000 + 2440587.5;

  // 2. Julian centuries since J2000.0 (terrestrial time, treated as UTC for our purposes).
  const T = (jd - 2451545.0) / 36525.0;

  // 3. Solar geometric mean longitude and mean anomaly (degrees).
  let L0 = 280.46646 + T * (36000.76983 + T * 0.0003032);
  L0 = ((L0 % 360) + 360) % 360;
  let M = 357.52911 + T * (35999.05029 - 0.0001537 * T);
  M = ((M % 360) + 360) % 360;

  // 4. Equation of center.
  const Mr = (M * Math.PI) / 180;
  const C =
    Math.sin(Mr) * (1.914602 - T * (0.004817 + 0.000014 * T)) +
    Math.sin(2 * Mr) * (0.019993 - 0.000101 * T) +
    Math.sin(3 * Mr) * 0.000289;

  // 5. True longitude.
  const trueLong = L0 + C;
  const omega = 125.04 - 1934.136 * T;
  const lambda = trueLong - 0.00569 - 0.00478 * Math.sin((omega * Math.PI) / 180);

  // 6. Declination and right ascension (we keep RA for completeness).
  const epsilon = (23 + 26 / 60 + 21.448 / 3600 - (46.815 * T) / 3600);
  const epsilonRad = (epsilon * Math.PI) / 180;
  const lambdaRad = (lambda * Math.PI) / 180;
  const decl = Math.asin(Math.sin(epsilonRad) * Math.sin(lambdaRad));
  const ra = Math.atan2(
    Math.cos(epsilonRad) * Math.sin(lambdaRad),
    Math.cos(lambdaRad),
  );

  // 7. Sidereal time at Greenwich (degrees).
  const gmst =
    280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * T * T - (T * T * T) / 38710000.0;
  const gmstNorm = ((gmst % 360) + 360) % 360;

  // 8. Hour angle.
  const lst = gmstNorm + lon;
  const hourAngle = ((lst - (ra * 180) / Math.PI) + 540) % 360 - 180; // wrap to [-180, 180]

  const latRad = (lat * Math.PI) / 180;
  const hRad = (hourAngle * Math.PI) / 180;

  // 9. Altitude and azimuth.
  const sinAlt = Math.sin(latRad) * Math.sin(decl) + Math.cos(latRad) * Math.cos(decl) * Math.cos(hRad);
  const altitude = Math.asin(sinAlt);

  // Azimuth measured clockwise from north.
  const cosAlt = Math.cos(altitude);
  let azimuth: number;
  if (cosAlt < 1e-10) {
    azimuth = hourAngle >= 0 ? 180 : 0;
  } else {
    const sinAz = (-Math.cos(decl) * Math.sin(hRad)) / cosAlt;
    const cosAz = (Math.sin(decl) - Math.sin(latRad) * sinAlt) / (Math.cos(latRad) * cosAlt);
    azimuth = ((Math.atan2(sinAz, cosAz) * 180) / Math.PI + 360) % 360;
  }

  // 10. Equation of time (minutes).
  const y = Math.tan(epsilonRad / 2) ** 2;
  const eqTime =
    4 *
    (y * Math.sin(2 * (L0 * Math.PI) / 180) -
      2 * 0.016708634 * Math.sin(Mr) +
      4 * 0.016708634 * y * Math.sin(Mr) * Math.cos(2 * (L0 * Math.PI) / 180) -
      0.5 * y * y * Math.sin(4 * (L0 * Math.PI) / 180) -
      1.25 * 0.016708634 * 0.016708634 * Math.sin(2 * Mr)) *
    180 /
    Math.PI;

  return {
    altitude, // radians, [-π/2, π/2]
    azimuth, // degrees clockwise from north, [0, 360)
    declination: decl, // radians
    hourAngle: hRad, // radians
    equationOfTimeMinutes: eqTime,
  };
}

/** Convert an altitude/azimuth pair plus the gnomon geometry into the shadow line. */
export function shadow(alt: number, az: number, gnomonHeightRatio = 0.55) {
  // The shadow lies in the plane of (azimuth + 180°). Length is height / tan(altitude).
  // For art we project onto a unit sundial dial centered at the gnomon base; the
  // shadow tip is at (-cos(az+180°)*L, -sin(az+180°)*L) in (east, north) coords.
  const len =
    alt <= 0
      ? Number.POSITIVE_INFINITY
      : gnomonHeightRatio / Math.tan(alt);
  const azShadow = az + 180; // pointing AWAY from the sun
  return { x: Math.cos((azShadow * Math.PI) / 180) * len, y: -Math.sin((azShadow * Math.PI) / 180) * len };
}

/** Canonical hour ticks: 13 lines at azimuth = solarAzimuthAtTime(t) for every hour from sunrise +1 to sunset -1. */
export function hoursOfLight(
  date: Date,
  lat: number,
  lon: number,
): Array<{ hour: number; altitude: number; azimuth: number }> {
  // Compute sunrise / sunset in UTC by scanning the day.
  const stepMinutes = 5;
  const start = new Date(date);
  start.setUTCHours(0, 0, 0, 0);
  const samples: Array<{ t: Date; alt: number; az: number }> = [];
  for (let m = 0; m < 24 * 60; m += stepMinutes) {
    const t = new Date(start.getTime() + m * 60_000);
    const s = solar(t, lat, lon);
    samples.push({ t, alt: s.altitude, az: s.azimuth });
  }
  return samples
    .filter(({ alt }) => alt > 0)
    .map(({ t, alt, az }) => ({ hour: t.getUTCHours() + t.getUTCMinutes() / 60, altitude: alt, azimuth: az }));
}

/** Half-day hours formatted as Roman numerals (custom-sundial feel). */
export function romanHourLabel(hourLocal: number, totalHours = 12) {
  // Re-map local solar hours to XII per half-day.
  const half = Math.floor(hourLocal / totalHours);
  const within = hourLocal - half * totalHours;
  const idx = Math.max(1, Math.min(totalHours, Math.round(within + 1)));
  return ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"][idx];
}
