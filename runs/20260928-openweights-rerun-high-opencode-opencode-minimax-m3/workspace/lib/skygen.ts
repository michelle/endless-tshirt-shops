// Deterministic star-map generator.
//
// Given the customer's date + position + title, we render a 3000 x 3800 SVG
// that becomes the DTG print asset. The same input always renders the same
// image so two clients with the same moment share a sky and so the preview
// pixel-matches what we ship to Prodigi.
//
// The math is intentionally cheap; we are creating an evocative sky chart,
// not a peer-reviewed ephemeris. The six-figure date + lat + lon + title are
// enough to give every customer a distinct one-of-one, and the moon phase is
// computed through Conway's well-known date algorithm so the moon shown on
// the shirt really was up that night.

import type { SkyInput } from "./design";
import { textPath, measureText } from "./text";

const CANVAS_W = 3000;
const CANVAS_H = 3800;

interface SeededRng {
  next(): number;
}

/** 32-bit mulberry32 PRNG - small, fast, fine for visual work. */
function mulberry32(seed: number): SeededRng {
  let state = seed >>> 0;
  return {
    next() {
      state = (state + 0x6d2b79f5) >>> 0;
      let x = state;
      x = Math.imul(x ^ (x >>> 15), x | 1);
      x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    },
  };
}

/** FNV-1a hash so a string key becomes a 32-bit seed. */
export function hashSeed(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

interface MoonInfo {
  ageDays: number;
  phase: number; // 0..1 around the cycle
  name:
    | "New Moon"
    | "Waxing Crescent"
    | "First Quarter"
    | "Waxing Gibbous"
    | "Full Moon"
    | "Waning Gibbous"
    | "Last Quarter"
    | "Waning Crescent";
}

/** Conway's moon-age approximation - accurate to within a day. */
function moonAt(isoDate: string): MoonInfo {
  const [yearStr, monthStr, dayStr] = isoDate.split("-");
  let y = Number(yearStr);
  let m = Number(monthStr);
  let r = Number(dayStr);
  if (m < 3) {
    y -= 1;
    m += 12;
  }
  const c = Math.floor(365.25 * y);
  const e = Math.floor(30.6 * m);
  let jd = c + e + r - 694039.09;
  jd /= 29.53058867; // synodic month
  let ip = jd - Math.floor(jd);
  if (ip < 0) ip += 1;
  const ageDays = ip * 29.53058867;

  let name: MoonInfo["name"];
  if (ip < 0.0625 || ip >= 0.9375) name = "New Moon";
  else if (ip < 0.1875) name = "Waxing Crescent";
  else if (ip < 0.3125) name = "First Quarter";
  else if (ip < 0.4375) name = "Waxing Gibbous";
  else if (ip < 0.5625) name = "Full Moon";
  else if (ip < 0.6875) name = "Waning Gibbous";
  else if (ip < 0.8125) name = "Last Quarter";
  else name = "Waning Crescent";

  return { ageDays, phase: ip, name };
}

/**
 * Format an ISO date so the subtitle reads "September 4, 2018" rather than
 * the half-American, half-ISO "2018-09-04".
 */
function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return `${months[(m - 1 + 12) % 12]} ${d}, ${y}`;
}

function formatLatLon(lat: number, lon: number, place?: string): string {
  if (place && place.trim().length > 0) return place.trim();
  const ns = lat >= 0 ? "N" : "S";
  const ew = lon >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(2)}°${ns} · ${Math.abs(lon).toFixed(2)}°${ew}`;
}

interface Star {
  x: number;
  y: number;
  size: number;
  tone: number; // 0..1, 0 = cool, 1 = warm
  opacity: number;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function renderStars(rng: SeededRng, total: number): Star[] {
  const out: Star[] = [];
  // We bias star count toward small magnitudes to mimic real night skies.
  // The horizon band (bottom 22% of canvas) is reserved for the type plate,
  // so we skip placing stars there.
  const horizonY = CANVAS_H * 0.78;
  for (let i = 0; i < total; i++) {
    const sizeRoll = rng.next();
    let size: number;
    if (sizeRoll < 0.7) size = 1 + rng.next() * 1.5;
    else if (sizeRoll < 0.94) size = 2 + rng.next() * 2.5;
    else size = 4 + rng.next() * 5;
    const opacityRoll = rng.next();
    const baseOpacity = 0.55 + rng.next() * 0.45;
    const opacity = baseOpacity * (size > 3 ? 1 : opacityRoll < 0.85 ? 1 : 0.65);
    const tone = rng.next() < 0.18 ? 0.85 + rng.next() * 0.15 : rng.next() * 0.4;
    out.push({
      x: rng.next() * CANVAS_W,
      // Stars wrap within the upper 78% of the canvas so they don't crowd
      // the title plate at the bottom.
      y: rng.next() * horizonY,
      size,
      tone,
      opacity: clamp(opacity, 0.2, 1),
    });
  }
  return out;
}

// Hand-drawn constellation "fingerprints". Each one is a small star pattern
// sized in 0..1 of the canvas so we can scale into the print area cleanly.
const CONSTELLATIONS: { name: string; stars: [number, number][]; label: string }[] = [
  { name: "orion", label: "Orion", stars: [[0.18, 0.22], [0.21, 0.27], [0.24, 0.22], [0.21, 0.34], [0.30, 0.30]] },
  { name: "cassiopeia", label: "Cassiopeia", stars: [[0.55, 0.18], [0.58, 0.21], [0.61, 0.18], [0.64, 0.21], [0.67, 0.18]] },
  { name: "ursa_major", label: "Ursa Major", stars: [[0.62, 0.62], [0.66, 0.66], [0.70, 0.66], [0.74, 0.62], [0.72, 0.70], [0.68, 0.72], [0.64, 0.70]] },
  { name: "lyra", label: "Lyra", stars: [[0.34, 0.45], [0.36, 0.48], [0.36, 0.42]] },
  { name: "scorpius", label: "Scorpius", stars: [[0.78, 0.74], [0.82, 0.78], [0.84, 0.74], [0.86, 0.78], [0.88, 0.74], [0.92, 0.74]] },
  { name: "cygnus", label: "Cygnus", stars: [[0.46, 0.55], [0.50, 0.58], [0.54, 0.55], [0.58, 0.50]] },
];

function renderConstellation(rng: SeededRng) {
  const cfg = CONSTELLATIONS[Math.floor(rng.next() * CONSTELLATIONS.length)];
  return {
    label: cfg.label,
    points: cfg.stars.map(([fx, fy]) => ({
      x: fx * CANVAS_W,
      y: fy * CANVAS_H,
      // A few of the connector stars are larger so the figure reads.
      size: 9 + rng.next() * 5,
    })),
  };
}

function moonDisc(rng: SeededRng) {
  // Pick a position toward the top of the sky so the moon doesn't crowd the
  // title or the bottom date plate. We bias to the upper third and a
  // narrow band so collisions with the title type plate are rare.
  return {
    cx: CANVAS_W * (0.30 + rng.next() * 0.40),
    cy: CANVAS_H * (0.10 + rng.next() * 0.08),
    r: 130,
  };
}

/**
 * Returns the SVG path string for the lit portion of the moon disc at the
 * given phase. Returns `null` for a true new moon, and yields a complete
 * disc path for a true full moon. The path traces:
 *   - The outer "lit" half of the moon's rim.
 *   - An ellipse terminator arc that bulges into dark or lit depending on
 *     whether the phase is past or before the local quarter.
 */
function moonLitPath(phase: number, r: number): string | null {
  if (phase <= 0.0001 || phase >= 0.9999) return null;
  if (Math.abs(phase - 0.5) < 0.0001) {
    // Full moon - ellipse would degenerate, so trace the entire rim.
    return `M 0 -${r} A ${r} ${r} 0 1 1 0 ${r} A ${r} ${r} 0 1 1 0 -${r} Z`;
  }
  const k = Math.cos(2 * Math.PI * phase);
  const rx = Math.max(Math.abs(k) * r, 0.5); // avoid degenerate zero-radius arcs
  const waxing = phase < 0.5;
  const outerSweep = waxing ? 1 : 0;
  // For waxing: crescent (k>0) terminator curves into the lit right half,
  //             gibbous (k<0) terminator curves into the dark left half.
  // For waning: gibbous (k<0) terminator curves into the dark right half,
  //             crescent (k>0) terminator curves into the lit left half.
  const innerSweep = waxing ? (k > 0 ? 0 : 1) : (k > 0 ? 1 : 0);
  return `M 0 -${r} A ${r} ${r} 0 0 ${outerSweep} 0 ${r} A ${rx} ${r} 0 0 ${innerSweep} 0 -${r} Z`;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Build the SVG the DTG printer consumes once it's been rasterised to PNG.
 * The layout reserves:
 *   - Header band (~0..15% of height) for the title
 *   - Middle band for the sky + moon + constellation
 *   - Footer plate (~75..100% of height) for the date + place + horizon
 */
export function buildSkySvg(input: SkyInput, publicBaseUrl?: string): {
  svg: string;
  moonName: MoonInfo["name"];
} {
  const key = `${input.date}|${input.lat.toFixed(2)}|${input.lon.toFixed(2)}|${input.title}`;
  const rng = mulberry32(hashSeed(key));

  const moon = moonAt(input.date);
  const stars = renderStars(rng, 700);
  const constellation = renderConstellation(rng);
  const moonPos = moonDisc(rng);
  const litPath = moonLitPath(moon.phase, moonPos.r);

  const dateText = formatDate(input.date);
  const placeText = formatLatLon(input.lat, input.lon, input.place);

  const titleEsc = escapeXml(input.title.toUpperCase());
  const dateEsc = escapeXml(dateText);
  const placeEsc = escapeXml(placeText);
  const moonNameEsc = escapeXml(moon.name);
  const subEsc = escapeXml("— A night-sky postcard —");

  const horizonY = CANVAS_H * 0.78;
  const footerBlockY = CANVAS_H * 0.88;

  const starMarkup = stars
    .map((s) => {
      const fill =
        s.tone > 0.5 ? "#ffe0b0" : s.tone > 0.2 ? "#dde6f5" : "#ffffff";
      const halo =
        s.size > 3
          ? `<circle cx="${s.x.toFixed(1)}" cy="${s.y.toFixed(1)}" r="${(s.size * 2.6).toFixed(1)}" fill="${fill}" opacity="${(s.opacity * 0.18).toFixed(2)}"/>`
          : "";
      return `${halo}<circle cx="${s.x.toFixed(1)}" cy="${s.y.toFixed(1)}" r="${s.size.toFixed(2)}" fill="${fill}" opacity="${s.opacity.toFixed(2)}"/>`;
    })
    .join("\n");

  const constellationStars = constellation.points
    .map((s) => `<circle cx="${s.x.toFixed(1)}" cy="${s.y.toFixed(1)}" r="${s.size.toFixed(1)}" fill="#fff3c4" opacity="0.95"/>`)
    .join("");

  const constellationLine =
    constellation.points.length > 1
      ? `<polyline points="${constellation.points.map((s) => `${s.x.toFixed(1)},${s.y.toFixed(1)}`).join(" ")}" fill="none" stroke="#fff3c4" stroke-width="1.6" stroke-linejoin="round" opacity="0.7"/>`
      : "";

  const moonPhasePathEsc = textPath(moon.name, {
    font: "serif",
    fontSize: 38,
    italic: true,
    letterSpacing: 2,
    x: moonPos.cx,
    y: moonPos.cy + moonPos.r + 60,
    anchor: "middle",
  });

  const moonMarkup = `
    <g>
      <circle cx="${moonPos.cx}" cy="${moonPos.cy}" r="${(moonPos.r * 2.6).toFixed(0)}" fill="#fff3c4" opacity="0.05"/>
      <circle cx="${moonPos.cx}" cy="${moonPos.cy}" r="${moonPos.r}" fill="#1a1f33"/>
      ${litPath ? `<g transform="translate(${moonPos.cx} ${moonPos.cy})"><path d="${litPath}" fill="#fdf6dc"/></g>` : ""}
      <circle cx="${moonPos.cx}" cy="${moonPos.cy}" r="${moonPos.r}" fill="none" stroke="#fff3c4" stroke-width="1.2" opacity="0.6"/>
      ${moonPhasePathEsc ? `<g transform="translate(0 0)"><path d="${moonPhasePathEsc}" fill="#fff3c4" opacity="0.85"/></g>` : ""}
    </g>
  `;

  // Soft horizon plate: above 78% the sky is sky, below 78% it's a darker
  // plate for the type. This stops stars bleeding into the type and gives
  // the design a clear anchor.
  const horizonPlate = `
    <rect x="0" y="${horizonY.toFixed(0)}" width="${CANVAS_W}" height="${(CANVAS_H - horizonY).toFixed(0)}" fill="#050713" opacity="0.85"/>
  `;

  // Title block: drawn into the upper band so it doesn't overlap the moon.
  // We pick a fontSize that scales the type down for unusually long titles.
  const titleLen = Math.max(input.title.length, 1);
  const titleFont = Math.max(180, Math.min(280, Math.round(3200 / titleLen)));

  const title = `
    <g fill="#ffffff">
      <path d="${textPath(input.title.toUpperCase(), {
        font: "serif",
        fontSize: titleFont,
        letterSpacing: 14,
        x: CANVAS_W / 2,
        y: horizonY * 0.5 + titleFont * 0.36,
        anchor: "middle",
      })}"/>
      <path d="${textPath(subEsc, {
        font: "serif",
        fontSize: 38,
        letterSpacing: 10,
        x: CANVAS_W / 2,
        y: horizonY * 0.5 + 80,
        anchor: "middle",
      })}" fill="#ffe6af" opacity="0.85"/>
      <path d="${textPath(dateEsc, {
        font: "serif",
        fontSize: 68,
        letterSpacing: 6,
        x: CANVAS_W / 2,
        y: footerBlockY + 60,
        anchor: "middle",
      })}"/>
      <path d="${textPath(placeEsc, {
        font: "serif",
        fontSize: 48,
        letterSpacing: 10,
        x: CANVAS_W / 2,
        y: footerBlockY + 140,
        anchor: "middle",
      })}" opacity="0.75"/>
    </g>
  `;

  // Footer hairline rule and brand chip.
  const footer = `
    <g>
      <line x1="220" y1="${(footerBlockY - 40).toFixed(0)}" x2="${CANVAS_W - 220}" y2="${(footerBlockY - 40).toFixed(0)}" stroke="#1b224a" stroke-width="2"/>
      <path d="${textPath("STAR MAP TEE", {
        font: "mono",
        fontSize: 34,
        letterSpacing: 6,
        x: CANVAS_W / 2,
        y: CANVAS_H - 80,
        anchor: "middle",
      })}" fill="#5d6d9a" opacity="0.7"/>
    </g>
  `;

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CANVAS_W} ${CANVAS_H}" width="${CANVAS_W}" height="${CANVAS_H}">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#02030d"/>
      <stop offset="40%" stop-color="#070b1c"/>
      <stop offset="65%" stop-color="#0e1530"/>
      <stop offset="100%" stop-color="#1a2247"/>
    </linearGradient>
    <radialGradient id="milkyway" cx="0.55" cy="0.32" r="0.55" gradientUnits="objectBoundingBox">
      <stop offset="0%" stop-color="#bda57c" stop-opacity="0.18"/>
      <stop offset="50%" stop-color="#736a9b" stop-opacity="0.10"/>
      <stop offset="100%" stop-color="#0a0f23" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="${CANVAS_W}" height="${CANVAS_H}" fill="url(#sky)"/>
  <rect width="${CANVAS_W}" height="${CANVAS_H}" fill="url(#milkyway)"/>

  ${starMarkup}
  ${constellationStars}
  ${constellationLine}
  ${moonMarkup}

  ${horizonPlate}
  ${title}
  ${footer}
</svg>`;

  return { svg, moonName: moon.name };
}

export const SKY_CANVAS = { width: CANVAS_W, height: CANVAS_H };
