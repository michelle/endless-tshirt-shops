import starsData from "./data/stars.json";
import constellationsData from "./data/constellations.json";
import { PALETTE_BY_ID } from "./catalog";
import {
  DEG,
  formatCoordinate,
  localSiderealDegrees,
  moonPosition,
  project,
  toHorizontal,
  toJulian,
} from "./astronomy";
import { zonedToUtc, type DesignParams } from "./schema";

/** Square artwork canvas. Prodigi fits it to the front print area. */
export const CANVAS = 4000;
const CX = 2000;
const CY = 1500;
const R = 1330;

type StarRow = [number, number, number, string];
const STARS = starsData as StarRow[];
type LineFeature = { id: string; geometry: { type: string; coordinates: number[][][] } };
const CONSTELLATIONS = (constellationsData as { features: LineFeature[] }).features;

const MONTHS = [
  "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
  "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
];

function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );
}

/** Rough width-aware font sizing so long names never overflow the canvas. */
function fitSize(text: string, maxWidth: number, maxSize: number, factor = 0.52): number {
  const width = Math.max(1, text.length) * factor;
  return Math.max(30, Math.min(maxSize, maxWidth / width));
}

function starRadius(mag: number): number {
  return 1 + 6.6 * Math.pow(10, -0.2 * (mag + 1.44));
}

function moonPhaseLabel(phase: number, waxing: boolean, illumination: number): string {
  const pct = Math.round(illumination * 100);
  if (pct <= 2) return "NEW MOON";
  if (pct >= 98) return "FULL MOON";
  if (pct < 48) return waxing ? "WAXING CRESCENT" : "WANING CRESCENT";
  if (pct < 52) return waxing ? "FIRST QUARTER" : "LAST QUARTER";
  return waxing ? "WAXING GIBBOUS" : "WANING GIBBOUS";
}

/**
 * Build the full print-ready SVG for a set of design parameters. The same
 * function powers the on-screen preview and the raster sent to Prodigi, so
 * what the customer sees is exactly what gets printed.
 */
export function buildSvg(params: DesignParams): string {
  const palette = PALETTE_BY_ID.get(params.palette)!;
  const utc = zonedToUtc(params.date, params.time, params.tz);
  const jd = toJulian(utc);
  const lst = localSiderealDegrees(jd, params.lng);

  const starMarkup: string[] = [];
  const labels: string[] = [];
  for (const [raHours, dec, mag, name] of STARS) {
    const { alt, az } = toHorizontal(raHours * 15, dec, params.lat, lst);
    if (alt <= 0.2) continue;
    const p = project(alt, az);
    const x = CX + p.x * R;
    const y = CY + p.y * R;
    const rad = starRadius(mag);
    const bright = mag < 0.4;
    if (mag < 1.6) {
      starMarkup.push(
        `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(rad * 3.6).toFixed(1)}" fill="${palette.glow}" opacity="0.10"/>`,
      );
    }
    starMarkup.push(
      `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${rad.toFixed(2)}" fill="${bright ? palette.accent : palette.primary}"/>`,
    );
    if (name && mag < 1.35) {
      labels.push(
        `<text x="${(x + rad + 14).toFixed(1)}" y="${(y + 8).toFixed(1)}" font-size="26" font-style="italic" fill="${palette.faint}" opacity="0.85">${escapeXml(name)}</text>`,
      );
    }
  }

  const linePaths: string[] = [];
  for (const feature of CONSTELLATIONS) {
    for (const line of feature.geometry.coordinates) {
      let d = "";
      let started = false;
      for (const [raDeg, dec] of line) {
        const { alt, az } = toHorizontal(raDeg, dec, params.lat, lst);
        if (alt < -1.5) {
          started = false;
          continue;
        }
        const p = project(alt, az);
        const x = CX + p.x * R;
        const y = CY + p.y * R;
        d += `${started ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)} `;
        started = true;
      }
      if (d) linePaths.push(d);
    }
  }

  // The moon, if it is above the horizon for this moment.
  let moonMarkup = "";
  let moonText = "";
  try {
    const moon = moonPosition(utc);
    moonText = moonPhaseLabel(moon.phase, moon.waxing, moon.illumination);
    const { alt, az } = toHorizontal(moon.raDeg, moon.decDeg, params.lat, lst);
    if (alt > 0) {
      const p = project(alt, az);
      const x = CX + p.x * R;
      const y = CY + p.y * R;
      moonMarkup =
        `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="40" fill="${palette.accent}" opacity="0.18"/>` +
        `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="22" fill="${palette.primary}"/>` +
        `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="22" fill="none" stroke="${palette.accent}" stroke-width="2.5"/>`;
    }
  } catch {
    moonText = "";
  }

  const ticks: string[] = [];
  const cardinals: Array<[number, string]> = [
    [0, "N"],
    [90, "E"],
    [180, "S"],
    [270, "W"],
  ];
  for (let deg = 0; deg < 360; deg += 30) {
    const isCardinal = deg % 90 === 0;
    const a = deg * DEG;
    const inner = R + 8;
    const outer = R + (isCardinal ? 46 : 26);
    // Match the sky projection (north up, east left) so labels agree with stars.
    const x1 = CX - inner * Math.sin(a);
    const y1 = CY - inner * Math.cos(a);
    const x2 = CX - outer * Math.sin(a);
    const y2 = CY - outer * Math.cos(a);
    ticks.push(
      `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${palette.accent}" stroke-width="${isCardinal ? 4 : 2}" opacity="0.85"/>`,
    );
  }
  for (const [deg, label] of cardinals) {
    const a = deg * DEG;
    const rr = R + 96;
    const x = CX - rr * Math.sin(a);
    const y = CY - rr * Math.cos(a);
    ticks.push(
      `<text x="${x.toFixed(1)}" y="${(y + 18).toFixed(1)}" font-size="46" letter-spacing="2" text-anchor="middle" fill="${palette.accent}">${label}</text>`,
    );
  }

  const [year, month, day] = params.date.split("-").map(Number);
  const dateLabel = `${day} ${MONTHS[month - 1]} ${year}`;
  const detailLine = `${formatCoordinate(params.lat, "lat")}  ·  ${formatCoordinate(params.lng, "lng")}  ·  ${dateLabel}  ·  ${params.time}`;
  const moonLine = moonText ? `MOON · ${moonText}` : "";

  const titleSize = fitSize(params.title, 3320, 205, 0.5);
  const subtitleSize = params.subtitle ? fitSize(params.subtitle, 3200, 84, 0.5) : 0;
  const placeSize = fitSize(params.place.toUpperCase(), 3300, 78, 0.62);
  const detailSize = fitSize(detailLine, 3400, 58, 0.54);

  const subtitleMarkup = params.subtitle
    ? `<text x="${CX}" y="3250" font-size="${subtitleSize.toFixed(0)}" font-style="italic" text-anchor="middle" fill="${palette.accent}">${escapeXml(params.subtitle)}</text>`
    : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS}" height="${CANVAS}" viewBox="0 0 ${CANVAS} ${CANVAS}">
  <defs>
    <clipPath id="sky"><circle cx="${CX}" cy="${CY}" r="${R - 4}"/></clipPath>
  </defs>

  <!-- sky disk -->
  <circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="${palette.faint}" stroke-width="2" opacity="0.5"/>
  <circle cx="${CX}" cy="${CY}" r="${R - 16}" fill="none" stroke="${palette.accent}" stroke-width="3" opacity="0.9"/>

  <g clip-path="url(#sky)">
    <g fill="none" stroke="${palette.faint}" stroke-width="2.2" opacity="0.42" stroke-linecap="round">
      ${linePaths.map((d) => `<path d="${d}"/>`).join("\n      ")}
    </g>
    ${moonMarkup}
    ${starMarkup.join("\n    ")}
    <g font-family="'Instrument Serif', serif">
      ${labels.join("\n      ")}
    </g>
  </g>

  ${ticks.join("\n  ")}

  <!-- inscription -->
  <text x="${CX}" y="3130" font-size="${titleSize.toFixed(0)}" text-anchor="middle" fill="${palette.primary}" font-family="'Instrument Serif', serif">${escapeXml(params.title)}</text>
  ${subtitleMarkup}
  <g stroke="${palette.faint}" stroke-width="2" opacity="0.55">
    <line x1="${CX - 620}" y1="3360" x2="${CX - 90}" y2="3360"/>
    <line x1="${CX + 90}" y1="3360" x2="${CX + 620}" y2="3360"/>
  </g>
  <path d="M ${CX} ${3350} l 11 10 l -11 10 l -11 -10 z" fill="${palette.accent}"/>
  <text x="${CX}" y="3480" font-size="${placeSize.toFixed(0)}" letter-spacing="8" text-anchor="middle" fill="${palette.primary}" font-family="'Instrument Serif', serif">${escapeXml(params.place.toUpperCase())}</text>
  <text x="${CX}" y="3592" font-size="${detailSize.toFixed(0)}" letter-spacing="3" text-anchor="middle" fill="${palette.faint}" font-family="'Instrument Serif', serif">${escapeXml(detailLine)}</text>
  ${moonLine ? `<text x="${CX}" y="3690" font-size="46" letter-spacing="6" text-anchor="middle" fill="${palette.faint}" opacity="0.9" font-family="'Instrument Serif', serif">${escapeXml(moonLine)}</text>` : ""}

  <text x="${CX}" y="3860" font-size="50" letter-spacing="30" text-anchor="middle" fill="${palette.accent}" font-family="'Instrument Serif', serif">ASTER</text>
  <text x="${CX}" y="3918" font-size="28" letter-spacing="12" text-anchor="middle" fill="${palette.faint}" opacity="0.85" font-family="'Instrument Serif', serif">CUSTOM NIGHT SKY</text>
</svg>`;
}
