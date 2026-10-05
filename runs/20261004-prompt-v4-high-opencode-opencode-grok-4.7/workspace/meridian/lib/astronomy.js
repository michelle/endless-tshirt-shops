/** Local sky: azimuthal equidistant projection, zenith at center, horizon at the rim. */

export function zonedToUtc(dateStr, timeStr, timeZone) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  const utcGuess = Date.UTC(y, m - 1, d, hh, mm, 0);
  const offset1 = zoneOffsetMs(utcGuess, timeZone);
  const refined = utcGuess - offset1;
  const offset2 = zoneOffsetMs(refined, timeZone);
  return new Date(utcGuess - offset2);
}

function zoneOffsetMs(utcMs, timeZone) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = Object.fromEntries(fmt.formatToParts(new Date(utcMs)).map((p) => [p.type, p.value]));
  let hour = Number(parts.hour);
  if (hour === 24) hour = 0;
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    hour,
    Number(parts.minute),
    Number(parts.second)
  );
  return asUtc - utcMs;
}

export function gmstDegrees(date) {
  const jd = date.getTime() / 86400000 + 2440587.5;
  const t = (jd - 2451545.0) / 36525;
  let gmst =
    280.46061837 +
    360.98564736629 * (jd - 2451545.0) +
    0.000387933 * t * t -
    (t * t * t) / 38710000;
  gmst %= 360;
  if (gmst < 0) gmst += 360;
  return gmst;
}

export function localSiderealDegrees(date, longitude) {
  let lst = gmstDegrees(date) + longitude;
  lst %= 360;
  if (lst < 0) lst += 360;
  return lst;
}

/**
 * Project a star. Returns null if below the horizon.
 * x,y are in unit-circle space: north is -y, east is +x, horizon at radius 1.
 */
export function horizontal(raDeg, decDeg, latDeg, lstDeg) {
  const ha = ((lstDeg - raDeg) * Math.PI) / 180;
  const dec = (decDeg * Math.PI) / 180;
  const lat = (latDeg * Math.PI) / 180;
  const sinAlt =
    Math.sin(dec) * Math.sin(lat) + Math.cos(dec) * Math.cos(lat) * Math.cos(ha);
  const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt)));
  // Azimuth from north toward east. Avoid tan(dec), which flips near the pole.
  const y = -Math.cos(dec) * Math.sin(ha);
  const x = Math.sin(dec) * Math.cos(lat) - Math.cos(dec) * Math.sin(lat) * Math.cos(ha);
  const az = Math.atan2(y, x);
  return { alt, az, altDeg: (alt * 180) / Math.PI };
}

export function projectStar(raDeg, decDeg, latDeg, lstDeg) {
  const { az, altDeg } = horizontal(raDeg, decDeg, latDeg, lstDeg);
  if (altDeg <= 0.4) return null;
  const r = (90 - altDeg) / 90;
  return {
    alt: altDeg,
    az,
    x: Math.sin(az) * r,
    y: -Math.cos(az) * r,
  };
}

export function formatWhen(dateStr, timeStr) {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  const h12 = ((hh + 11) % 12) + 1;
  const ap = hh < 12 ? "am" : "pm";
  return `${d} ${months[m - 1]} ${y}  ·  ${h12}:${String(mm).padStart(2, "0")}${ap}`;
}

export function formatCoords(lat, lon) {
  const ns = lat >= 0 ? "N" : "S";
  const ew = lon >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(2)}°${ns}    ${Math.abs(lon).toFixed(2)}°${ew}`;
}
