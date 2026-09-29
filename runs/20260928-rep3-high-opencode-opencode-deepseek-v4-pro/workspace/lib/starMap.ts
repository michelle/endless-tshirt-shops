import { STARS, CONSTELLATIONS, STAR_BY_NAME } from "./catalog";
import { SERIF_B64, SANS_B64, SANSMEDIUM_B64 } from "./fonts";

export interface StarMapParams {
  date: string; // YYYY-MM-DD
  lat: number;
  lng: number;
  locationName: string;
  title: string;
  subtitle?: string;
  time?: string; // HH:MM local (24h), default 21:00
  scale?: number; // render scale for high-resolution print output
}

// ---------------------------------------------------------------------------
// Astronomy
// ---------------------------------------------------------------------------

function julianDate(year: number, month: number, day: number, utcHours: number): number {
  if (month <= 2) {
    year -= 1;
    month += 12;
  }
  const A = Math.floor(year / 100);
  const B = 2 - A + Math.floor(A / 4);
  const jd =
    Math.floor(365.25 * (year + 4716)) +
    Math.floor(30.6001 * (month + 1)) +
    day +
    B -
    1524.5 +
    utcHours / 24;
  return jd;
}

// Greenwich Mean Sidereal Time in degrees.
function gmst(jd: number): number {
  const T = (jd - 2451545.0) / 36525.0;
  let g =
    280.46061837 +
    360.98564736629 * (jd - 2451545.0) +
    0.000387933 * T * T -
    (T * T * T) / 38710000.0;
  g = ((g % 360) + 360) % 360;
  return g;
}

function deg2rad(d: number): number {
  return (d * Math.PI) / 180;
}
function rad2deg(r: number): number {
  return (r * 180) / Math.PI;
}

interface AltAz {
  alt: number; // degrees
  az: number; // degrees, 0 = North, clockwise
}

function altAz(raHours: number, decDeg: number, latDeg: number, lstDeg: number): AltAz {
  const ra = raHours * 15; // degrees
  const H = ((lstDeg - ra + 360) % 360 + 360) % 360; // hour angle 0..360
  const lat = deg2rad(latDeg);
  const dec = deg2rad(decDeg);
  const h = deg2rad(H);

  const sinAlt = Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(h);
  const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt)));

  const cosAz =
    (Math.sin(dec) - Math.sin(alt) * Math.sin(lat)) / (Math.cos(alt) * Math.cos(lat));
  let az = Math.acos(Math.max(-1, Math.min(1, cosAz)));
  if (Math.sin(h) > 0) az = 2 * Math.PI - az;

  return { alt: rad2deg(alt), az: rad2deg(az) };
}

// Stereographic projection centred on the zenith.
function project(alt: number, az: number, R: number, cx: number, cy: number) {
  const rho = deg2rad(90 - alt);
  const r = R * Math.tan(rho / 2);
  const a = deg2rad(az);
  return {
    x: cx + r * Math.sin(a),
    y: cy - r * Math.cos(a),
    r,
  };
}

// ---------------------------------------------------------------------------
// Deterministic PRNG (mulberry32)
// ---------------------------------------------------------------------------

function hashString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// SVG generation
// ---------------------------------------------------------------------------

const W = 2000;
const H = 2475; // portrait, ~0.808 aspect (matches DTG front print area)
const CX = 1000;
const CY = 900;
const R = 760; // star map radius

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function starRadius(mag: number): number {
  // brighter (lower mag) -> larger dot
  const r = Math.max(1.2, 6.5 - mag * 1.15);
  return Math.min(r, 9);
}

export function generateStarMapSvg(params: StarMapParams): string {
  const { date, lat, lng, locationName, title, subtitle, time } = params;
  const scale = params.scale ?? 1;
  const sw = Math.round(W * scale);
  const sh = Math.round(H * scale);

  const [y, m, d] = date.split("-").map((n) => parseInt(n, 10));
  const [hh, mm] = (time || "21:00").split(":").map((n) => parseInt(n, 10));
  const localHours = hh + mm / 60;
  // Approximate UTC from local solar time using longitude.
  const utcHours = ((localHours - lng / 15) % 24 + 24) % 24;
  const jd = julianDate(y, m, d, utcHours);
  const lst = (gmst(jd) + lng + 360) % 360;

  const seed = hashString(`${date}|${lat.toFixed(4)}|${lng.toFixed(4)}|${title}|${subtitle || ""}`);
  const rand = mulberry32(seed);

  // --- bright stars ---
  const bright: { x: number; y: number; r: number; mag: number; name: string }[] = [];
  const positions: Record<string, { x: number; y: number }> = {};
  for (const s of STARS) {
    const { alt, az } = altAz(s.ra, s.dec, lat, lst);
    if (alt < -2) continue;
    const p = project(alt, az, R, CX, CY);
    positions[s.name] = { x: p.x, y: p.y };
    bright.push({ x: p.x, y: p.y, r: starRadius(s.mag), mag: s.mag, name: s.name });
  }

  // --- faint background stars (seeded) ---
  const faint: { x: number; y: number; r: number; o: number }[] = [];
  const faintCount = 420;
  for (let i = 0; i < faintCount; i++) {
    const a = rand() * Math.PI * 2;
    const rr = Math.sqrt(rand()) * R * 0.98;
    const x = CX + rr * Math.cos(a);
    const y = CY + rr * Math.sin(a);
    const r = 0.6 + rand() * 1.6;
    const o = 0.25 + rand() * 0.6;
    faint.push({ x, y, r, o });
  }

  // --- constellation lines ---
  const lines: { x1: number; y1: number; x2: number; y2: number }[] = [];
  for (const [a, b] of CONSTELLATIONS) {
    const pa = positions[a];
    const pb = positions[b];
    if (pa && pb) lines.push({ x1: pa.x, y1: pa.y, x2: pb.x, y2: pb.y });
  }

  // --- text ---
  const titleText = esc(title || "The Night We Met");
  const dateText = esc(formatDate(date));
  const locText = esc(locationName || "");
  const subText = subtitle ? esc(subtitle) : "";

  const parts: string[] = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${sw}" height="${sh}" viewBox="0 0 ${sw} ${sh}">`);
  parts.push(`<g transform="scale(${scale})">`);
  parts.push(`<defs>
    <style>
      @font-face { font-family: 'StellaraSerif'; src: url(data:font/ttf;base64,${SERIF_B64}) format('truetype'); }
      @font-face { font-family: 'StellaraSans'; src: url(data:font/ttf;base64,${SANS_B64}) format('truetype'); }
      @font-face { font-family: 'StellaraSansMed'; src: url(data:font/ttf;base64,${SANSMEDIUM_B64}) format('truetype'); }
    </style>
    <radialGradient id="sky" cx="50%" cy="42%" r="75%">
      <stop offset="0%" stop-color="#141b33"/>
      <stop offset="55%" stop-color="#0b1026"/>
      <stop offset="100%" stop-color="#060912"/>
    </radialGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.10"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>`);

  // background
  parts.push(`<rect width="${W}" height="${H}" fill="url(#sky)"/>`);

  // faint stars
  for (const f of faint) {
    parts.push(`<circle cx="${f.x.toFixed(1)}" cy="${f.y.toFixed(1)}" r="${f.r.toFixed(2)}" fill="#cdd6f4" opacity="${f.o.toFixed(2)}"/>`);
  }

  // constellation lines
  for (const l of lines) {
    parts.push(
      `<line x1="${l.x1.toFixed(1)}" y1="${l.y1.toFixed(1)}" x2="${l.x2.toFixed(1)}" y2="${l.y2.toFixed(1)}" stroke="#8ea0c8" stroke-opacity="0.28" stroke-width="1.4"/>`
    );
  }

  // bright stars
  for (const s of bright) {
    const glow = s.mag < 1.2;
    if (glow) {
      parts.push(
        `<circle cx="${s.x.toFixed(1)}" cy="${s.y.toFixed(1)}" r="${(s.r * 2.6).toFixed(1)}" fill="#ffffff" opacity="0.12"/>`
      );
    }
    parts.push(
      `<circle cx="${s.x.toFixed(1)}" cy="${s.y.toFixed(1)}" r="${s.r.toFixed(2)}" fill="#ffffff"/>`
    );
  }

  // horizon ring
  parts.push(
    `<circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="#e7d9b8" stroke-opacity="0.55" stroke-width="2"/>`
  );
  parts.push(
    `<circle cx="${CX}" cy="${CY}" r="${R + 14}" fill="none" stroke="#e7d9b8" stroke-opacity="0.18" stroke-width="1"/>`
  );

  // cardinal labels
  const cardinals: [string, number, number][] = [
    ["N", CX, CY - R - 40],
    ["E", CX + R + 40, CY],
    ["S", CX, CY + R + 40],
    ["W", CX - R - 40, CY],
  ];
  for (const [label, tx, ty] of cardinals) {
    parts.push(
      `<text x="${tx}" y="${ty}" text-anchor="middle" dominant-baseline="middle" font-family="StellaraSansMed" font-size="30" letter-spacing="4" fill="#e7d9b8" fill-opacity="0.7">${label}</text>`
    );
  }

  // title
  parts.push(
    `<text x="${CX}" y="1810" text-anchor="middle" font-family="StellaraSerif" font-size="118" fill="#f4efe2">${titleText}</text>`
  );

  // subtitle (optional)
  if (subText) {
    parts.push(
      `<text x="${CX}" y="1930" text-anchor="middle" font-family="StellaraSans" font-size="40" letter-spacing="2" fill="#c9c2ae">${subText}</text>`
    );
  }

  // date + location
  const infoY = subText ? 2030 : 1990;
  parts.push(
    `<text x="${CX}" y="${infoY}" text-anchor="middle" font-family="StellaraSansMed" font-size="44" letter-spacing="6" fill="#e7d9b8">${dateText}</text>`
  );
  parts.push(
    `<text x="${CX}" y="${infoY + 70}" text-anchor="middle" font-family="StellaraSans" font-size="38" letter-spacing="3" fill="#a9a28c">${locText}</text>`
  );

  // small brand mark
  parts.push(
    `<text x="${CX}" y="${H - 60}" text-anchor="middle" font-family="StellaraSansMed" font-size="26" letter-spacing="8" fill="#6b7280">STELLARA</text>`
  );

  parts.push(`</g>`);
  parts.push(`</svg>`);
  return parts.join("");
}

function formatDate(date: string): string {
  const [y, m, d] = date.split("-").map((n) => parseInt(n, 10));
  const months = [
    "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
    "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
  ];
  const month = months[(m - 1 + 12) % 12] || "";
  return `${month} ${d}, ${y}`;
}

export { STAR_BY_NAME };
