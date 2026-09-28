// SVG renderer for the personalized sundial plate.
//
// Output:
//   * A self-contained SVG string for the live preview (used by the storefront).
//   * A 300 DPI PNG (4680 × 5790 px matching Prodigi's GLOBAL-TEE-BC-3001 print area)
//     for the actual DTG asset via @resvg/resvg-js.
//
// The sundial design has a deliberate vintage-survey-plate aesthetic: a circle
// of Roman hour ticks, the gnomon shadow at the customer's exact instant, the
// inscription on the outer cartouche, and a horizon banner reading the moment
// in the customer's place.

import { Resvg } from "@resvg/resvg-js";
import { hoursOfLight, romanHourLabel, shadow, solar } from "./sundial";

export type ShirtColor = "navy" | "black" | "forest" | "charcoal" | "white";
export type ShirtSize = "xs" | "s" | "m" | "l" | "xl" | "xxl" | "3xl" | "4xl";

export interface Customization {
  /** Customer-entered phrase (top line of the inscription). Max 28 chars. */
  phrase: string;
  /** Second line of inscription (e.g. "Est. 2024"). Max 28 chars. */
  phrase2: string;
  /** ISO datetime (UTC) of the moment the customer wants the plate to show. */
  date: string;
  /** Place name printed on the cartouche. Max 32 chars. */
  place: string;
  /** Latitude in degrees, -90..90. */
  lat: number;
  /** Longitude in degrees, -180..180. */
  lon: number;
  color: ShirtColor;
  size: ShirtSize;
}

const SHIRT_HEX: Record<ShirtColor, string> = {
  navy: "#0e1f3a",
  black: "#111111",
  forest: "#1f3a2c",
  charcoal: "#2a2a2a",
  white: "#f4f1ec",
};

const INK_HEX: Record<ShirtColor, string> = {
  navy: "#f3e5c2",
  black: "#efe7d2",
  forest: "#efe1c1",
  charcoal: "#f0e6cd",
  white: "#1d1d1d",
};

const PRODIGI_PRINT_W = 4680; // Bella+Canvas 3001, 15.6" @ 300 dpi
const PRODIGI_PRINT_H = 5790;

export const PRODIGI_SKU = "GLOBAL-TEE-BC-3001";

function fmtCoord(lat: number, lon: number) {
  const fmt = (val: number, pos: string, neg: string) =>
    `${Math.abs(val).toFixed(2)}° ${val >= 0 ? pos : neg}`;
  return `${fmt(lat, "N", "S")} · ${fmt(lon, "E", "W")}`;
}

function fmtUtc(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(
    date.getUTCDate(),
  )} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())} UTC`;
}

/**
 * Render the SVG portion of the design. Caller decides the final viewport —
 * the front-end uses a 600×750 cropped view, while the print rasterizer
 * renders the same SVG into 4680×5790.
 */
export function renderSundialSvg(input: Customization): string {
  const date = new Date(input.date);
  const s = solar(date, input.lat, input.lon);
  const sh = shadow(s.altitude, s.azimuth);
  const ink = INK_HEX[input.color];
  const hours = hoursOfLight(date, input.lat, input.lon);

  // Build a circular plate at origin (cx=0, cy=0) sized R=470 in a 1200×1500 viewBox.
  // The plate prints up top: above the gnomon, below the inscription.
  const R = 470; // outer dial radius
  const r = 70;  // gnomon-tip / horizon inner radius

  const plateCenter = { cx: 600, cy: 720 };
  const dialHours: string[] = [];
  // Render hour ticks: every hour 6..18 if visible.
  const seenHours = new Set<number>();
  for (const { hour, altitude, azimuth } of hours) {
    const h = Math.floor(hour);
    if (seenHours.has(h)) continue;
    seenHours.add(h);
    if (altitude < 0.05) continue;
    const angleRad = (azimuth * Math.PI) / 180;
    const x1 = plateCenter.cx + R * Math.sin(angleRad);
    const y1 = plateCenter.cy - R * Math.cos(angleRad);
    const x2 = plateCenter.cx + (R - 35) * Math.sin(angleRad);
    const y2 = plateCenter.cy - (R - 35) * Math.cos(angleRad);
    const tx = plateCenter.cx + (R + 18) * Math.sin(angleRad);
    const ty = plateCenter.cy - (R + 18) * Math.cos(angleRad);
    dialHours.push(`
      <line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}"
            x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}"
            stroke="${ink}" stroke-width="1.6" stroke-linecap="round"/>
      <text x="${tx.toFixed(2)}" y="${ty.toFixed(2)}"
            text-anchor="middle" dominant-baseline="middle"
            font-family="Georgia, 'Times New Roman', serif"
            font-size="22" fill="${ink}" letter-spacing="2">
        ${romanHourLabel(hour)}
      </text>`);
  }

  // Gnomon base disk + rising gnomon (the vertical stub casting the shadow).
  // Gnomon is drawn as a slender triangle pointing up; the shadow is the
  // projection on the dial plane.
  //
  // For visual readability we map the gnomon as a thin spire rising from r to r+90 in
  // the direction OPPOSITE to the sun (i.e., azimuth - 180).
  const gnomonHeight = 110;
  const baseAz = ((s.azimuth - 180) * Math.PI) / 180;
  const tipX = plateCenter.cx + (r + gnomonHeight) * Math.sin(baseAz);
  const tipY = plateCenter.cy - (r + gnomonHeight) * Math.cos(baseAz);

  // Shadow polygon: from base of gnomon outward along the shadow direction.
  const hasShadow = Number.isFinite(sh.x) && Math.abs(sh.x) <= R * 1.05 && Math.abs(sh.y) <= R * 1.05;
  const shadowEnd = hasShadow
    ? { x: plateCenter.cx + sh.x * R * 0.95, y: plateCenter.cy + sh.y * R * 0.95 }
    : null;

  const shadowSvg = shadowEnd
    ? `<line x1="${plateCenter.cx}" y1="${plateCenter.cy}"
             x2="${shadowEnd.x.toFixed(2)}" y2="${shadowEnd.y.toFixed(2)}"
             stroke="${ink}" stroke-width="3" stroke-linecap="round"/>
       <circle cx="${shadowEnd.x.toFixed(2)}" cy="${shadowEnd.y.toFixed(2)}"
               r="9" fill="${ink}"/>`
    : `<text x="${plateCenter.cx}" y="${plateCenter.cy + R - 80}"
                text-anchor="middle"
                font-family="Georgia, serif"
                font-size="32" fill="${ink}" font-style="italic"
                letter-spacing="2">
                THE SUN IS BELOW
                <tspan x="${plateCenter.cx}" dy="36">THE HORIZON</tspan>
              </text>`;

  // Decorative compass rose in background — a faint eight-pointed star showing
  // the cardinal directions, never competing with the gnomon.
  const compassSpokes = ["N", "E", "S", "W"]
    .map((label, i) => {
      const a = (i * 90 * Math.PI) / 180;
      const x = plateCenter.cx + (R + 60) * Math.sin(a);
      const y = plateCenter.cy - (R + 60) * Math.cos(a);
      return `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle"
                    font-family="Georgia, serif" font-size="22"
                    fill="${ink}" opacity="0.45"
                    letter-spacing="3">${label}</text>`;
    })
    .join("");

  const phraseMax1 = (input.phrase || "").slice(0, 28).toUpperCase();
  const phraseMax2 = (input.place || "").slice(0, 32).toUpperCase();

  const alt = s.altitude;
  const az = s.azimuth;
  const altDeg = (alt * 180) / Math.PI;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     viewBox="0 0 1200 1500"
     preserveAspectRatio="xMidYMid meet">
  <defs>
    <style>
      .inscription {
        font-family: Georgia, 'Times New Roman', serif;
        letter-spacing: 4px;
        fill: ${ink};
      }
      .coordinates {
        font-family: 'Courier New', monospace;
        fill: ${ink};
        letter-spacing: 2px;
      }
      .small {
        font-family: Georgia, serif;
        font-style: italic;
        fill: ${ink};
        letter-spacing: 1.5px;
      }
    </style>
    <radialGradient id="vignette" cx="50%" cy="50%" r="62%">
      <stop offset="65%" stop-color="${ink}" stop-opacity="0"/>
      <stop offset="100%" stop-color="${ink}" stop-opacity="0.18"/>
    </radialGradient>
    <radialGradient id="plateGlow" cx="50%" cy="50%" r="55%">
      <stop offset="0%" stop-color="${ink}" stop-opacity="0.0"/>
      <stop offset="80%" stop-color="${ink}" stop-opacity="0.05"/>
      <stop offset="100%" stop-color="${ink}" stop-opacity="0.16"/>
    </radialGradient>
  </defs>

  <!-- ornamental top rule -->
  <line x1="220" y1="100" x2="980" y2="100" stroke="${ink}" stroke-width="1.2"/>
  <line x1="380" y1="125" x2="820" y2="125" stroke="${ink}" stroke-width="0.8" opacity="0.55"/>

  <!-- inscription, two lines -->
  <text x="600" y="170" text-anchor="middle" class="inscription"
        font-size="48">${escapeXml(phraseMax1)}</text>
  <text x="600" y="232" text-anchor="middle" class="inscription"
        font-size="28" opacity="0.85">${escapeXml(input.phrase2 || "").slice(0, 28)}</text>

  <!-- top metadata band: place + coordinates -->
  <text x="600" y="276" text-anchor="middle" class="coordinates" font-size="22">
    ${escapeXml(phraseMax2)}  ·  ${escapeXml(fmtCoord(input.lat, input.lon))}
  </text>

  <!-- Ornate double-ring around the plate -->
  <circle cx="${plateCenter.cx}" cy="${plateCenter.cy}" r="${R + 38}"
          fill="none" stroke="${ink}" stroke-width="1.4" opacity="0.55"/>
  <circle cx="${plateCenter.cx}" cy="${plateCenter.cy}" r="${R}"
          fill="url(#plateGlow)" stroke="${ink}" stroke-width="2.4"/>
  <circle cx="${plateCenter.cx}" cy="${plateCenter.cy}" r="${R - 8}"
          fill="none" stroke="${ink}" stroke-width="0.8" opacity="0.6"/>
  <circle cx="${plateCenter.cx}" cy="${plateCenter.cy}" r="${R - 65}"
          fill="url(#vignette)" stroke="${ink}" stroke-width="0.6" opacity="0.45"/>

  ${dialHours.join("\n  ")}
  ${compassSpokes}

  <!-- Gnomon: vertical stub pointing away from the sun -->
  <line x1="${plateCenter.cx}" y1="${plateCenter.cy}"
        x2="${tipX.toFixed(2)}" y2="${tipY.toFixed(2)}"
        stroke="${ink}" stroke-width="4.4" stroke-linecap="round"/>
  <circle cx="${plateCenter.cx}" cy="${plateCenter.cy}" r="6" fill="${ink}"/>
  <circle cx="${plateCenter.cx}" cy="${plateCenter.cy}" r="${r}"
          fill="none" stroke="${ink}" stroke-width="0.8" opacity="0.5"/>

  ${shadowSvg}

  <!-- Inner banner reading the moment -->
  <text x="${plateCenter.cx}" y="${plateCenter.cy + R + 92}" text-anchor="middle"
        class="coordinates" font-size="28">
    ${escapeXml(fmtUtc(date))}
  </text>

  <!-- lower ornament row -->
  <line x1="380" y1="${plateCenter.cy + R + 130}" x2="820" y2="${plateCenter.cy + R + 130}"
        stroke="${ink}" stroke-width="0.8" opacity="0.55"/>
  <text x="${plateCenter.cx}" y="${plateCenter.cy + R + 168}" text-anchor="middle"
        class="small" font-size="22">
    altitude ${altDeg.toFixed(1)}°  ·  bearing ${az.toFixed(1)}°
  </text>

  <!-- brand line -->
  <text x="600" y="1452" text-anchor="middle" class="inscription"
        font-size="22" opacity="0.65" letter-spacing="6">
    GNOMON  ·  –  A  SUNDIAL  FOR  YOUR  MOMENT  –
  </text>
</svg>`;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

/** Render the SVG into a 300 DPI PNG sized for the Prodigi print area. */
export function renderPrintPng(input: Customization): Buffer {
  const svg = renderSundialSvg(input);
  const resvg = new Resvg(svg, {
    background: SHIRT_HEX[input.color],
    fitTo: { mode: "width", value: PRODIGI_PRINT_W },
    font: { loadSystemFonts: true, defaultFontFamily: "Georgia" },
  });
  return Buffer.from(resvg.render().asPng());
}

/** Render a smaller PNG used by the storefront live preview. */
export function renderPreviewPng(input: Customization, widthPx = 900): Buffer {
  const svg = renderSundialSvg(input);
  const resvg = new Resvg(svg, {
    background: SHIRT_HEX[input.color],
    fitTo: { mode: "width", value: widthPx },
    font: { loadSystemFonts: true, defaultFontFamily: "Georgia" },
  });
  return Buffer.from(resvg.render().asPng());
}

export const SHIRT_PALETTE = SHIRT_HEX;
