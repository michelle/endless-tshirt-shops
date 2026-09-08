// Pure SVG generator for the star-map artwork. Used in the browser for the
// live preview and on the server to produce the print-ready PNG, so the
// customer sees exactly what gets printed.

import STARS from "@/data/stars.json";
import CONSTELLATIONS from "@/data/constellations.json";
import { lstDegrees, projectToDisc, toHorizon } from "./astro";
import { zonedTimeToUtc } from "./timezone";
import { Design, formatCoords, formatDateLong, formatTime12, inkFor } from "./design";

// Print area of the Gildan 64000 front at 300dpi (from Prodigi's product data).
export const PRINT_W = 4665;
export const PRINT_H = 5844;

// Artwork geometry (px). The disc is ~10in wide and sits ~1.5in below the collar.
const CX = PRINT_W / 2;
const CY = 1950;
const R = 1500;

type Star = [ra: number, dec: number, mag: number, bv: number];
type Constellation = { id: string; name: string; lines: number[][][] };

const stars = STARS as unknown as Star[];
const constellations = CONSTELLATIONS as unknown as Constellation[];

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function starRadius(mag: number): number {
  // Sirius (-1.4) ~ 24px, naked-eye limit (6.0) ~ 3.5px. Keeps faint stars printable on DTG.
  return Math.max(3.5, 3.6 * Math.pow(1.3, 5.6 - mag));
}

/** Shrink a font size so `text` fits within maxWidth (rough metric: emPerChar). */
function fitSize(text: string, maxWidth: number, base: number, emPerChar: number, spacing: number): number {
  const n = Math.max(1, text.length);
  const size = (maxWidth - (n - 1) * spacing) / (n * emPerChar);
  return Math.max(40, Math.min(base, size));
}

export interface SkySummary {
  utcMs: number;
  lstDeg: number;
  visibleStars: number;
}

export function computeSky(design: Design): SkySummary & { placed: Array<{ x: number; y: number; mag: number }>; segments: Array<[number, number, number, number]> } {
  const utcMs = zonedTimeToUtc(design.date, design.time, design.tz);
  const lst = lstDegrees(utcMs, design.lon);
  const placed: Array<{ x: number; y: number; mag: number }> = [];
  for (const [ra, dec, mag] of stars) {
    const h = toHorizon(ra, dec, design.lat, lst);
    if (h.alt < -0.5) continue;
    const p = projectToDisc(h, CX, CY, R);
    placed.push({ x: p.x, y: p.y, mag });
  }
  const segments: Array<[number, number, number, number]> = [];
  if (design.lines) {
    for (const c of constellations) {
      for (const line of c.lines) {
        let prev: { x: number; y: number } | null = null;
        for (const [ra, dec] of line) {
          const h = toHorizon(ra, dec, design.lat, lst);
          if (h.alt < 0) {
            prev = null;
            continue;
          }
          const p = projectToDisc(h, CX, CY, R);
          if (prev) segments.push([prev.x, prev.y, p.x, p.y]);
          prev = p;
        }
      }
    }
  }
  return { utcMs, lstDeg: lst, visibleStars: placed.length, placed, segments };
}

export interface SvgOptions {
  /** Unique id prefix so several maps can live in one document. */
  id?: string;
  /** Override ink colour (defaults to the colour that suits the garment). */
  ink?: string;
  /** Include a transparent full print-area canvas (true) or crop to the artwork (false). */
  fullCanvas?: boolean;
}

/** Build the artwork as an SVG string in print-area pixel coordinates. */
export function starMapSvg(design: Design, opts: SvgOptions = {}): string {
  const ink = opts.ink ?? inkFor(design.color);
  const clipId = `${opts.id ?? "sm"}-disc`;
  const sky = computeSky(design);
  const f = (n: number) => n.toFixed(1);

  const starEls = sky.placed
    .map((s) => {
      const r = starRadius(s.mag);
      const op = s.mag > 5 ? 0.7 : s.mag > 4 ? 0.85 : 1;
      return `<circle cx="${f(s.x)}" cy="${f(s.y)}" r="${f(r)}"${op < 1 ? ` opacity="${op}"` : ""}/>`;
    })
    .join("");

  const lineEls = sky.segments
    .map(([x1, y1, x2, y2]) => `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}"/>`)
    .join("");

  // Tick marks around the rim every 10 degrees, longer every 30.
  const ticks: string[] = [];
  for (let a = 0; a < 360; a += 10) {
    const rad = (a * Math.PI) / 180;
    const major = a % 90 === 0;
    const mid = a % 30 === 0;
    const r1 = R + 40;
    const r2 = major ? R + 130 : mid ? R + 100 : R + 75;
    ticks.push(
      `<line x1="${f(CX + r1 * Math.sin(rad))}" y1="${f(CY - r1 * Math.cos(rad))}" x2="${f(CX + r2 * Math.sin(rad))}" y2="${f(CY - r2 * Math.cos(rad))}" stroke-width="${major ? 8 : 4}"/>`,
    );
  }

  // Cardinal points. Looking up at the sky, East is on the left.
  const cardinals = [
    ["N", CX, CY - R - 215],
    ["S", CX, CY + R + 215],
    ["E", CX - R - 215, CY],
    ["W", CX + R + 215, CY],
  ] as const;
  const cardinalEls = cardinals
    .map(
      ([l, x, y]) =>
        `<text x="${f(x)}" y="${f(y)}" font-family="Marcellus" font-size="88" text-anchor="middle" dominant-baseline="central">${l}</text>`,
    )
    .join("");

  // Caption block
  const maxTextW = 3700;
  const title = design.title.toUpperCase();
  const titleSize = fitSize(title, maxTextW, 150, 0.74, 20);
  const subtitle = design.subtitle;
  const subSize = fitSize(subtitle, maxTextW, 96, 0.52, 8);
  const place = design.place.toUpperCase();
  const placeSize = fitSize(place, maxTextW, 74, 0.66, 12);
  const dateLine = `${formatDateLong(design.date)}  ·  ${formatTime12(design.time)}`;
  const coords = formatCoords(design.lat, design.lon);

  let y = CY + R + 480;
  const textEls: string[] = [];
  if (title) {
    textEls.push(
      `<text x="${CX}" y="${y}" font-family="Marcellus" font-size="${f(titleSize)}" letter-spacing="20" text-anchor="middle">${esc(title)}</text>`,
    );
    y += 190;
  }
  if (subtitle) {
    textEls.push(
      `<text x="${CX}" y="${y}" font-family="Lato" font-weight="300" font-size="${f(subSize)}" letter-spacing="8" text-anchor="middle">${esc(subtitle)}</text>`,
    );
    y += 150;
  }
  // divider
  textEls.push(`<line x1="${CX - 160}" y1="${y}" x2="${CX + 160}" y2="${y}" stroke-width="4"/>`);
  y += 130;
  textEls.push(
    `<text x="${CX}" y="${y}" font-family="Lato" font-weight="400" font-size="${f(placeSize)}" letter-spacing="12" text-anchor="middle">${esc(place)}</text>`,
  );
  y += 115;
  textEls.push(
    `<text x="${CX}" y="${y}" font-family="Lato" font-weight="300" font-size="64" letter-spacing="4" text-anchor="middle">${esc(dateLine)}</text>`,
  );
  y += 105;
  textEls.push(
    `<text x="${CX}" y="${y}" font-family="Lato" font-weight="300" font-size="56" letter-spacing="10" text-anchor="middle">${esc(coords)}</text>`,
  );

  const artBottom = y + 120;
  const viewBox = opts.fullCanvas === false ? `0 ${CY - R - 330} ${PRINT_W} ${artBottom - (CY - R - 330)}` : `0 0 ${PRINT_W} ${PRINT_H}`;
  const height = opts.fullCanvas === false ? artBottom - (CY - R - 330) : PRINT_H;

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${PRINT_W}" height="${height}" viewBox="${viewBox}">` +
    `<defs><clipPath id="${clipId}"><circle cx="${CX}" cy="${CY}" r="${R}"/></clipPath></defs>` +
    `<g fill="${ink}" stroke="none">` +
    `<g clip-path="url(#${clipId})">` +
    (lineEls ? `<g fill="none" stroke="${ink}" stroke-width="5" stroke-opacity="0.55" stroke-linecap="round">${lineEls}</g>` : "") +
    `<g>${starEls}</g>` +
    `</g>` +
    `<circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="${ink}" stroke-width="10"/>` +
    `<circle cx="${CX}" cy="${CY}" r="${R + 40}" fill="none" stroke="${ink}" stroke-width="3"/>` +
    `<g stroke="${ink}">${ticks.join("")}</g>` +
    cardinalEls +
    `<g stroke="${ink}">${textEls.join("")}</g>` +
    `</g>` +
    `</svg>`
  );
}
