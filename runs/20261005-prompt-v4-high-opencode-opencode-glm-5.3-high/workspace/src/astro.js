// Shared astronomy math — runs identically in the browser and on the server,
// so the live preview is pixel-for-pixel the design that gets printed.
// No dependencies. Pure ES module.

const D2R = Math.PI / 180;

// Greenwich Mean Sidereal Time in degrees (Meeus, ~0.1" accuracy — plenty for a star chart).
export function gmstDeg(date) {
  const jd = date.getTime() / 86400000 + 2440587.5; // Julian Date (UTC)
  const d = jd - 2451545.0;
  const T = d / 36525;
  let gmst =
    280.46061837 +
    360.98564736629 * d +
    0.000387933 * T * T -
    (T * T * T) / 38710000;
  gmst = gmst % 360;
  return gmst < 0 ? gmst + 360 : gmst;
}

// Local Sidereal Time in degrees. lonDeg: east positive.
export function lstDeg(date, lonDeg) {
  const lst = (gmstDeg(date) + lonDeg) % 360;
  return lst < 0 ? lst + 360 : lst;
}

// Equatorial (RA/Dec, degrees) -> horizontal {alt, az} for an observer.
// alt: degrees above horizon. az: degrees clockwise from North (N=0, E=90 ...).
// (Duffett-Smith: sin(alt) = sin(φ)sin(δ) + cos(φ)cos(δ)cos(H);
//  azimuth quadrant resolved via sin(az) = −cos(δ)sin(H)/cos(alt).)
export function radecToAltaz(raDeg, decDeg, lst, latDeg) {
  const H = (lst - raDeg) * D2R; // hour angle (positive = west of meridian)
  const dec = decDeg * D2R;
  const lat = latDeg * D2R;
  const sinAlt =
    Math.sin(dec) * Math.sin(lat) + Math.cos(dec) * Math.cos(lat) * Math.cos(H);
  const sinAltC = Math.max(-1, Math.min(1, sinAlt));
  const alt = Math.asin(sinAltC);
  const numA = -Math.sin(H) * Math.cos(dec) * Math.cos(lat); // ∝ sin(az)
  const numB = Math.sin(dec) - sinAltC * Math.sin(lat); // ∝ cos(az)
  const az = (Math.atan2(numA, numB) / D2R + 360) % 360;
  return { alt: alt / D2R, az };
}

// Zenith-centred stereographic projection on a unit circle (horizon = radius 1).
// "Look-up" view as seen lying on your back with North at the top: East appears on the LEFT,
// matching what you actually see in the sky (this is how planispheres work).
export function projectAltaz(altDeg, azDeg) {
  const z = (90 - altDeg) * D2R; // zenith distance
  const r = Math.tan(z / 2);
  const az = azDeg * D2R;
  return { x: -r * Math.sin(az), y: -r * Math.cos(az) };
}

// Project the whole sky for an observer at a moment.
// stars: [[raDeg, decDeg, mag, bv], ...]  constellations: [{id, segs: [[[ra,dec],...],...]}]
export function skyPositions({ date, lat, lon, stars, constellations }) {
  const lst = lstDeg(date, lon);
  const pts = [];
  for (const s of stars) {
    const { alt, az } = radecToAltaz(s[0], s[1], lst, lat);
    if (alt <= 0.6) continue; // below/at horizon
    const p = projectAltaz(alt, az);
    pts.push({ x: p.x, y: p.y, mag: s[2], bv: s[3] ?? 0 });
  }
  const segs = [];
  if (constellations) {
    for (const c of constellations) {
      for (const seg of c.segs) {
        let run = [];
        for (const [ra, dec] of seg) {
          const { alt, az } = radecToAltaz(ra, dec, lst, lat);
          if (alt > 0.6) {
            const p = projectAltaz(alt, az);
            run.push([p.x, p.y]);
          } else {
            if (run.length > 1) segs.push(run);
            run = [];
          }
        }
        if (run.length > 1) segs.push(run);
      }
    }
  }
  return { pts, segs };
}

// Convert a local wall-clock time in an IANA zone ("2021-06-14", "21:34", "Europe/Paris")
// to a real UTC Date. Works in Node (full-icu) and all modern browsers.
export function wallTimeToUtc(dateStr, timeStr, timeZone) {
  const naiveMs = Date.parse(`${dateStr}T${timeStr.length === 5 ? timeStr : "12:00"}:00Z`);
  if (Number.isNaN(naiveMs)) throw new Error("Invalid date/time");
  if (!timeZone) return new Date(naiveMs);
  let ts = naiveMs;
  for (let i = 0; i < 3; i++) {
    const offMin = zoneOffsetMinutes(ts, timeZone);
    const next = naiveMs - offMin * 60000;
    if (next === ts) break;
    ts = next;
  }
  return new Date(ts);
}

function zoneOffsetMinutes(ts, timeZone) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = {};
  for (const p of dtf.formatToParts(new Date(ts))) parts[p.type] = p.value;
  const asUtc = Date.UTC(
    +parts.year,
    +parts.month - 1,
    +parts.day,
    +parts.hour % 24,
    +parts.minute,
    +parts.second
  );
  return (asUtc - Math.floor(ts / 1000) * 1000) / 60000;
}

export const MONTHS = [
  "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
  "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
];

export function formatCoord(lat, lon) {
  const f = (v, pos, neg) => {
    const a = Math.abs(v).toFixed(4);
    return `${a}° ${v >= 0 ? pos : neg}`;
  };
  return `${f(lat, "N", "S")} · ${f(lon, "E", "W")}`;
}

// Local date/time label used under the chart, e.g. "PARIS · 14 JUNE 2021 · 21:34"
export function formatWhen(dateStr, timeStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return "";
  const dd = String(d).padStart(2, "0");
  return `${dd} ${MONTHS[m - 1]} ${y} · ${timeStr}`;
}
