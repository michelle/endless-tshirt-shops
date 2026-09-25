// Isomorphic star-map engine: astronomy math + SVG composition.
// Used on the client (live preview, SVG <text>) and on the server
// (print-ready PNG, text converted to vector paths).

import starsData from "@/data/stars.json";
import lineData from "@/data/constellation-lines.json";

export interface SkyConfig {
  lat: number; // degrees, north positive
  lng: number; // degrees, east positive
  date: string; // "YYYY-MM-DD"
  time: string; // "HH:MM" local time at the location
  place: string; // e.g. "Paris, France"
  title: string; // customer caption, e.g. "The Night We Met"
  theme: "dark" | "light"; // dark = light ink for dark shirts
}

export interface TextRenderOpts {
  text: string;
  x: number;
  y: number;
  size: number;
  anchor: "start" | "middle" | "end";
  tracking: number; // px between glyphs
  fill: string;
  opacity?: number;
}

export type TextRenderer = (o: TextRenderOpts) => string;

// Client-side renderer: plain SVG text (preview only).
export const svgTextRenderer: TextRenderer = (o) =>
  `<text x="${o.x}" y="${o.y}" font-size="${o.size}" text-anchor="${o.anchor}"` +
  ` letter-spacing="${o.tracking}" fill="${o.fill}" font-family="'Josefin Sans',sans-serif"` +
  (o.opacity != null ? ` opacity="${o.opacity}"` : "") +
  `>${escapeXml(o.text.toUpperCase())}</text>`;

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const D2R = Math.PI / 180;

interface Projected {
  x: number;
  y: number;
  alt: number; // degrees
}

// Alt/az of a star (ra, dec in degrees) for the observer, projected onto
// a polar equidistant map centered on the zenith (north up, east right).
function project(
  raDeg: number,
  decDeg: number,
  latDeg: number,
  lstDeg: number,
  cx: number,
  cy: number,
  R: number
): Projected {
  const lat = latDeg * D2R;
  const dec = decDeg * D2R;
  const H = (lstDeg - raDeg) * D2R;
  const alt = Math.asin(
    Math.sin(dec) * Math.sin(lat) + Math.cos(dec) * Math.cos(lat) * Math.cos(H)
  );
  // Meeus: azimuth from south, positive westward
  const azS = Math.atan2(
    Math.sin(H),
    Math.cos(H) * Math.sin(lat) - Math.tan(dec) * Math.cos(lat)
  );
  const az = azS + Math.PI; // north-based
  const altDeg = alt / D2R;
  const r = (R * (90 - altDeg)) / 90;
  return { x: cx + r * Math.sin(az), y: cy - r * Math.cos(az), alt: altDeg };
}

// Local sidereal time (degrees) for the given local date/time + longitude.
// The local timezone is approximated from longitude (rounded to the hour),
// which is the right level of fidelity for a commemorative print.
export function localSiderealDegrees(cfg: SkyConfig): number {
  const dt = new Date(`${cfg.date}T${cfg.time || "21:00"}:00`);
  if (isNaN(dt.getTime())) throw new Error("invalid date/time");
  const tzHours = Math.round(cfg.lng / 15);
  const utcMs = dt.getTime() - tzHours * 3600_000;
  const jd = utcMs / 86_400_000 + 2440587.5;
  const d = jd - 2451545.0;
  let gmst = (280.46061837 + 360.98564736629 * d) % 360;
  if (gmst < 0) gmst += 360;
  let lst = (gmst + cfg.lng) % 360;
  if (lst < 0) lst += 360;
  return lst;
}

export const VIEW_W = 1560;
export const VIEW_H = 1930;
const CX = 780;
const CY = 770;
const R = 660;

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function formatDateLine(cfg: SkyConfig): string {
  // Render the customer's date verbatim — no timezone conversion.
  const [y, m, d] = cfg.date.split("-").map(Number);
  return `${MONTHS[(m || 1) - 1]} ${d}, ${y} · ${cfg.time || "21:00"}`;
}

export function formatCoordLine(cfg: SkyConfig): string {
  const la = `${Math.abs(cfg.lat).toFixed(3)}° ${cfg.lat >= 0 ? "N" : "S"}`;
  const lo = `${Math.abs(cfg.lng).toFixed(3)}° ${cfg.lng >= 0 ? "E" : "W"}`;
  return `${la}  ·  ${lo}`;
}

// Everything inside the SVG (no outer <svg> tag), so it can be embedded
// in a shirt-mock preview or rasterized standalone.
export function buildStarMapInner(cfg: SkyConfig, text: TextRenderer): string {
  const ink = cfg.theme === "dark" ? "#ffffff" : "#181826";
  const lst = localSiderealDegrees(cfg);
  const parts: string[] = [];

  // Horizon ring + inner accent ring
  parts.push(
    `<circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="${ink}" stroke-width="5"/>`,
    `<circle cx="${CX}" cy="${CY}" r="${R - 24}" fill="none" stroke="${ink}" stroke-width="1.6" opacity="0.55"/>`
  );
  // Altitude graticule (30° / 60°)
  for (const a of [30, 60]) {
    parts.push(
      `<circle cx="${CX}" cy="${CY}" r="${(R * (90 - a)) / 90}" fill="none" stroke="${ink}" stroke-width="1" opacity="0.14" stroke-dasharray="4 10"/>`
    );
  }
  // Cardinal ticks + labels
  const cardinals: Array<[string, number]> = [
    ["N", 0],
    ["E", 90],
    ["S", 180],
    ["W", 270],
  ];
  for (const [label, azDeg] of cardinals) {
    const az = azDeg * D2R;
    const lx = CX + (R + 52) * Math.sin(az);
    const ly = CY - (R + 52) * Math.cos(az) + 12;
    const t1x = CX + (R - 2) * Math.sin(az);
    const t1y = CY - (R - 2) * Math.cos(az);
    const t2x = CX + (R + 16) * Math.sin(az);
    const t2y = CY - (R + 16) * Math.cos(az);
    parts.push(
      `<line x1="${t1x}" y1="${t1y}" x2="${t2x}" y2="${t2y}" stroke="${ink}" stroke-width="3"/>`,
      text({ text: label, x: lx, y: ly, size: 34, anchor: "middle", tracking: 2, fill: ink, opacity: 0.75 })
    );
  }

  // Constellation lines (only over points above the horizon)
  for (const seg of lineData as number[][][]) {
    let run: Projected[] = [];
    const flush = () => {
      if (run.length > 1) {
        const pts = run.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
        parts.push(
          `<polyline points="${pts}" fill="none" stroke="${ink}" stroke-width="2" opacity="0.28" stroke-linejoin="round"/>`
        );
      }
      run = [];
    };
    for (const [ra, dec] of seg) {
      const p = project(ra, dec, cfg.lat, lst, CX, CY, R);
      if (p.alt > 1) run.push(p);
      else flush();
    }
    flush();
  }

  // Stars, bright first so dimmer ones never cover a glow
  for (const [ra, dec, mag] of starsData as number[][]) {
    const p = project(ra, dec, cfg.lat, lst, CX, CY, R);
    if (p.alt <= 0) continue;
    const r = Math.max(1.0, (4.8 - mag) * 1.9);
    if (mag < 1.5) {
      parts.push(
        `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${(r * 2.1).toFixed(1)}" fill="${ink}" opacity="0.14"/>`
      );
    }
    parts.push(
      `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${r.toFixed(1)}" fill="${ink}"/>`
    );
  }

  // Zenith marker
  parts.push(
    `<circle cx="${CX}" cy="${CY}" r="4" fill="none" stroke="${ink}" stroke-width="1.6" opacity="0.6"/>`,
    `<circle cx="${CX}" cy="${CY}" r="1.6" fill="${ink}" opacity="0.6"/>`
  );

  // Caption block
  const title = cfg.title.trim() || "Our Sky";
  parts.push(
    text({ text: title, x: CX, y: 1590, size: 88, anchor: "middle", tracking: 10, fill: ink }),
    `<line x1="${CX - 200}" y1="1636" x2="${CX + 200}" y2="1636" stroke="${ink}" stroke-width="2" opacity="0.6"/>`,
    text({ text: cfg.place, x: CX, y: 1706, size: 46, anchor: "middle", tracking: 6, fill: ink, opacity: 0.92 }),
    text({ text: formatDateLine(cfg), x: CX, y: 1772, size: 38, anchor: "middle", tracking: 4, fill: ink, opacity: 0.8 }),
    text({ text: formatCoordLine(cfg), x: CX, y: 1830, size: 32, anchor: "middle", tracking: 4, fill: ink, opacity: 0.65 })
  );

  return parts.join("");
}

export function buildStarMapSVG(
  cfg: SkyConfig,
  text: TextRenderer,
  pixelWidth?: number,
  pixelHeight?: number
): string {
  const sizeAttrs = pixelWidth
    ? ` width="${pixelWidth}" height="${pixelHeight}"`
    : "";
  return (
    `<svg xmlns="http://www.w3.org/2000/svg"${sizeAttrs} viewBox="0 0 ${VIEW_W} ${VIEW_H}">` +
    buildStarMapInner(cfg, text) +
    `</svg>`
  );
}
