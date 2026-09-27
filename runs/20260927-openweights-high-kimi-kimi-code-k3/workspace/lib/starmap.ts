import fs from "node:fs";
import path from "node:path";
import opentype from "opentype.js";
import type { DesignParams } from "./design";

// ---------------------------------------------------------------- fonts
let serifFont: opentype.Font | null = null;
let sansFont: opentype.Font | null = null;
let serifItalicFont: opentype.Font | null = null;

function fonts() {
  if (!serifFont) {
    const dir = path.join(process.cwd(), "assets", "fonts");
    serifFont = opentype.loadSync(path.join(dir, "DejaVuSerif.ttf"));
    sansFont = opentype.loadSync(path.join(dir, "DejaVuSans.ttf"));
    serifItalicFont = opentype.loadSync(
      path.join(dir, "DejaVuSerif-Italic.ttf")
    );
  }
  return { serif: serifFont, sans: sansFont!, serifItalic: serifItalicFont! };
}

function measure(
  font: opentype.Font,
  text: string,
  size: number,
  tracking: number
): number {
  let w = 0;
  for (const ch of text) w += font.getAdvanceWidth(ch, size) + tracking;
  return text.length ? w - tracking : 0;
}

function centeredTextPath(
  font: opentype.Font,
  text: string,
  cx: number,
  y: number,
  size: number,
  tracking = 0
): string {
  let x = cx - measure(font, text, size, tracking) / 2;
  let d = "";
  for (const ch of text) {
    d += font.getPath(ch, x, y, size).toPathData(2);
    x += font.getAdvanceWidth(ch, size) + tracking;
  }
  return d;
}

// ---------------------------------------------------------------- rng
function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// ---------------------------------------------------------------- star catalog
interface Star {
  ra: number; // degrees
  dec: number; // degrees
  mag: number;
}

let catalog: Star[] | null = null;
function getCatalog(): Star[] {
  if (catalog) return catalog;
  const rng = mulberry32(0x5eed42);
  const stars: Star[] = [];
  for (let i = 0; i < 1500; i++) {
    stars.push({
      ra: rng() * 360,
      dec: (Math.asin(2 * rng() - 1) * 180) / Math.PI,
      mag: -0.5 + 6.8 * Math.pow(rng(), 2.2),
    });
  }
  for (let i = 0; i < 34; i++) {
    stars.push({
      ra: rng() * 360,
      dec: (Math.asin(2 * rng() - 1) * 180) / Math.PI,
      mag: -1.3 + rng() * 1.3,
    });
  }
  catalog = stars;
  return stars;
}

// ---------------------------------------------------------------- astronomy
function julianDate(d: Date): number {
  return d.getTime() / 86400000 + 2440587.5;
}

function gmstDeg(jd: number): number {
  const T = (jd - 2451545.0) / 36525;
  const g =
    280.46061837 +
    360.98564736629 * (jd - 2451545) +
    0.000387933 * T * T -
    (T * T * T) / 38710000;
  return ((g % 360) + 360) % 360;
}

/** 0 = new moon, 0.5 = full moon */
export function moonPhase(jd: number): number {
  const syn = 29.53058867;
  return ((((jd - 2451550.26) % syn) + syn) % syn) / syn;
}

function moonPath(cx: number, cy: number, r: number, phase: number): string {
  const c = Math.cos(2 * Math.PI * phase);
  const rx = Math.max(0.5, Math.abs(c) * r);
  const waxing = phase < 0.5;
  const outerSweep = waxing ? 1 : 0;
  const innerSweep = c > 0 ? (waxing ? 0 : 1) : waxing ? 1 : 0;
  return `M ${cx} ${cy - r} A ${r} ${r} 0 0 ${outerSweep} ${cx} ${
    cy + r
  } A ${rx} ${r} 0 0 ${innerSweep} ${cx} ${cy - r} Z`;
}

interface ProjectedStar {
  x: number;
  y: number;
  mag: number;
}

function projectSky(
  p: DesignParams,
  cx: number,
  cy: number,
  R: number
): ProjectedStar[] {
  const dt = new Date(`${p.date}T${p.time || "21:00"}:00Z`);
  const jd = julianDate(dt);
  const lst = (((gmstDeg(jd) + p.lon) % 360) + 360) % 360;
  const latR = (p.lat * Math.PI) / 180;
  const orient = (hashString(p.place.toLowerCase()) % 360) * (Math.PI / 180);
  const cosO = Math.cos(orient);
  const sinO = Math.sin(orient);
  const pts: ProjectedStar[] = [];
  for (const s of getCatalog()) {
    const H = ((lst - s.ra) * Math.PI) / 180;
    const decR = (s.dec * Math.PI) / 180;
    const alt = Math.asin(
      Math.sin(decR) * Math.sin(latR) +
        Math.cos(decR) * Math.cos(latR) * Math.cos(H)
    );
    if (alt <= 0.015) continue;
    const az = Math.atan2(
      Math.sin(H),
      Math.cos(H) * Math.sin(latR) - Math.tan(decR) * Math.cos(latR)
    );
    const rr = (1 - alt / (Math.PI / 2)) * R;
    let x = rr * Math.sin(az);
    let y = -rr * Math.cos(az);
    const xr = x * cosO - y * sinO;
    const yr = x * sinO + y * cosO;
    pts.push({ x: cx + xr, y: cy + yr, mag: s.mag });
  }
  return pts;
}

// ---------------------------------------------------------------- svg
const MONTHS = [
  "JANUARY",
  "FEBRUARY",
  "MARCH",
  "APRIL",
  "MAY",
  "JUNE",
  "JULY",
  "AUGUST",
  "SEPTEMBER",
  "OCTOBER",
  "NOVEMBER",
  "DECEMBER",
];

function formatMoment(p: DesignParams): string {
  const [y, m, d] = p.date.split("-").map(Number);
  let [hh, mm] = p.time.split(":").map(Number);
  const ampm = hh >= 12 ? "PM" : "AM";
  hh = hh % 12 || 12;
  return `${MONTHS[m - 1]} ${d}, ${y} — ${hh}:${String(mm).padStart(2, "0")} ${ampm}`;
}

function formatCoords(p: DesignParams): string {
  const lat = `${Math.abs(p.lat).toFixed(2)}° ${p.lat >= 0 ? "N" : "S"}`;
  const lon = `${Math.abs(p.lon).toFixed(2)}° ${p.lon >= 0 ? "E" : "W"}`;
  return `${p.place.toUpperCase()} · ${lat}, ${lon}`;
}

/**
 * Build the print-ready SVG. 4680 x 5790 px = 15.6" x 19.3" at 300 DPI,
 * matching the Bella+Canvas 3001 front print area. Pass a smaller widthPx
 * to get a vector-scaled version for fast previews.
 */
export function buildStarMapSVG(
  p: DesignParams,
  opts: { darkShirt: boolean; widthPx?: number }
): string {
  const { serif, sans, serifItalic } = fonts();
  const W = 4680;
  const H = 5790;
  const cx = W / 2;
  const cy = 2140;
  const R = 1700;

  const ink = opts.darkShirt ? "#f2ead8" : "#141b3d";
  const ring = opts.darkShirt ? "#98a2cf" : "#2b3568";
  const grid = "rgba(255,255,255,0.10)";

  const stars = projectSky(p, cx, cy, R);
  const jd = julianDate(new Date(`${p.date}T${p.time || "21:00"}:00Z`));
  const phase = moonPhase(jd);

  let starEls = "";
  for (const s of stars) {
    const r = Math.max(2.0, Math.pow(6.9 - s.mag, 1.35) * 0.8);
    const opacity = Math.min(1, 0.45 + ((6.9 - s.mag) / 8) * 0.75).toFixed(2);
    starEls += `<circle cx="${s.x.toFixed(1)}" cy="${s.y.toFixed(
      1
    )}" r="${r.toFixed(1)}" fill="#ffffff" opacity="${opacity}"/>`;
    if (s.mag < -0.9) {
      // diffraction cross for the brightest stars
      const L = (r * 7).toFixed(1);
      const w = Math.max(1.4, r * 0.35).toFixed(1);
      starEls += `<path d="M ${(s.x - Number(L)).toFixed(1)} ${s.y.toFixed(
        1
      )} H ${(s.x + Number(L)).toFixed(1)} M ${s.x.toFixed(1)} ${(
        s.y - Number(L)
      ).toFixed(1)} V ${(s.y + Number(L)).toFixed(
        1
      )}" stroke="#ffffff" stroke-width="${w}" opacity="0.55"/>`;
    }
  }

  // graticule: altitude rings at 60° and 30°
  const rings = [R / 3, (2 * R) / 3]
    .map(
      (r) =>
        `<circle cx="${cx}" cy="${cy}" r="${r.toFixed(
          0
        )}" fill="none" stroke="${grid}" stroke-width="2"/>`
    )
    .join("");

  // cardinal points just outside the ring
  const cardinals = [
    ["N", cx, cy - R - 96],
    ["S", cx, cy + R + 128],
    ["E", cx + R + 108, cy + 30],
    ["W", cx - R - 108, cy + 30],
  ]
    .map(
      ([ch, x, y]) =>
        `<path d="${centeredTextPath(
          sans,
          ch as string,
          x as number,
          y as number,
          96
        )}" fill="${ring}"/>`
    )
    .join("");

  // moon phase icon to the right of the coordinates line
  const coordsText = formatCoords(p);
  const coordsW = measure(sans, coordsText, 88, 24);
  const moonX = cx + coordsW / 2 + 170;
  const moonY = cy + R + 710;
  const moon = `
    <circle cx="${moonX}" cy="${moonY - 32}" r="62" fill="none" stroke="${ink}" stroke-width="4"/>
    <path d="${moonPath(moonX, moonY - 32, 58, phase)}" fill="${ink}"/>`;

  const titlePath = centeredTextPath(
    serifItalic,
    p.caption,
    cx,
    cy + R + 320,
    190
  );
  const datePath = centeredTextPath(
    sans,
    formatMoment(p),
    cx,
    cy + R + 520,
    92,
    26
  );
  const coordsPath = centeredTextPath(
    sans,
    coordsText,
    cx,
    cy + R + 710,
    88,
    24
  );
  const brandPath = centeredTextPath(
    sans,
    "STARMARK",
    cx,
    H - 170,
    64,
    44
  );

  const outW = Math.round(opts.widthPx ?? W);
  const outH = Math.round((outW * H) / W);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${outW}" height="${outH}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="sky" cx="50%" cy="42%" r="75%">
      <stop offset="0%" stop-color="#1d2754"/>
      <stop offset="55%" stop-color="#131a3f"/>
      <stop offset="100%" stop-color="#090d24"/>
    </radialGradient>
    <clipPath id="disc"><circle cx="${cx}" cy="${cy}" r="${R}"/></clipPath>
  </defs>
  <circle cx="${cx}" cy="${cy}" r="${R}" fill="url(#sky)"/>
  <g clip-path="url(#disc)">${rings}${starEls}</g>
  <circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${ring}" stroke-width="7"/>
  <circle cx="${cx}" cy="${cy}" r="${R - 30}" fill="none" stroke="${ring}" stroke-width="2" opacity="0.7"/>
  ${cardinals}
  <path d="${titlePath}" fill="${ink}"/>
  <path d="${datePath}" fill="${ink}"/>
  <path d="${coordsPath}" fill="${ink}"/>
  ${moon}
  <g opacity="0.55"><path d="${brandPath}" fill="${ink}"/></g>
</svg>`;
}
