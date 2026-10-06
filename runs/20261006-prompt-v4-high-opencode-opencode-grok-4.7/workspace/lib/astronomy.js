/** Altitude/azimuth of the sky above a place, accurate to well under a degree. */

const DEG = Math.PI / 180

export function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n))
}

export function julianDate(date) {
  return date.getTime() / 86400000 + 2440587.5
}

/** Greenwich mean sidereal time in degrees. Meeus, ignoring nutation (a few arcseconds). */
export function gmstDegrees(date) {
  const jd = julianDate(date)
  const d = jd - 2451545.0
  const t = d / 36525
  const gmst =
    280.46061837 +
    360.98564736629 * d +
    0.000387933 * t * t -
    (t * t * t) / 38710000
  return ((gmst % 360) + 360) % 360
}

export function localSiderealDegrees(date, longitude) {
  return (gmstDegrees(date) + longitude + 360) % 360
}

/**
 * Convert a wall-clock time in an IANA zone to a UTC Date.
 * dateStr: YYYY-MM-DD, timeStr: HH:MM
 */
export function zonedTimeToUtc(dateStr, timeStr, timeZone) {
  const [Y, M, D] = dateStr.split("-").map(Number)
  const [h, m] = timeStr.split(":").map(Number)
  const desired = Date.UTC(Y, M - 1, D, h, m, 0)
  let utc = desired
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
  for (let i = 0; i < 4; i++) {
    const parts = Object.fromEntries(
      dtf
        .formatToParts(new Date(utc))
        .filter((p) => p.type !== "literal")
        .map((p) => [p.type, p.value])
    )
    const asZone = Date.UTC(
      +parts.year,
      +parts.month - 1,
      +parts.day,
      +parts.hour,
      +parts.minute,
      +parts.second
    )
    const delta = desired - asZone
    utc += delta
    if (delta === 0) break
  }
  return new Date(utc)
}

/**
 * Altitude and azimuth.
 * Azimuth is radians from north toward east (0 = north, π/2 = east).
 * Hour angle follows the usual astronomical sign (positive west).
 */
export function altAz(raDeg, decDeg, latDeg, lstDeg) {
  const ha = (lstDeg - raDeg) * DEG
  const dec = decDeg * DEG
  const lat = latDeg * DEG
  const sinAlt =
    Math.sin(dec) * Math.sin(lat) + Math.cos(dec) * Math.cos(lat) * Math.cos(ha)
  const alt = Math.asin(clamp(sinAlt, -1, 1))
  const cosAlt = Math.cos(alt)
  let az = 0
  if (cosAlt > 1e-6) {
    const sinAz = (-Math.cos(dec) * Math.sin(ha)) / cosAlt
    const cosAz =
      (Math.sin(dec) * Math.cos(lat) - Math.cos(dec) * Math.sin(lat) * Math.cos(ha)) /
      cosAlt
    az = Math.atan2(sinAz, cosAz)
  }
  return { alt, az }
}

/**
 * Equidistant azimuthal projection. North is up, east is right.
 * horizonR is the radius of the altitude = 0 circle.
 * Returns null if the star is below the horizon or too close to the rim to print cleanly.
 */
export function project(raDeg, decDeg, latDeg, lstDeg, cx, cy, horizonR) {
  const { alt, az } = altAz(raDeg, decDeg, latDeg, lstDeg)
  const altDeg = alt / DEG
  if (altDeg <= 1.5) return null
  const rho = (90 - altDeg) / 90
  if (rho > 0.955) return null
  const r = rho * horizonR
  return {
    x: cx + r * Math.sin(az),
    y: cy - r * Math.cos(az),
    altDeg,
    az,
  }
}

export function formatSidereal(lstDeg) {
  const hours = (lstDeg / 15 + 24) % 24
  const h = Math.floor(hours)
  const m = Math.floor((hours - h) * 60)
  return `${h}h ${String(m).padStart(2, "0")}m`
}
