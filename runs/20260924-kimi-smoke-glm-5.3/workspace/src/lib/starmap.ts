/**
 * Skyborn chart renderer — turns a SkySpec into a deterministic, print-ready
 * SVG. The same function runs in the browser (live preview) and on the server
 * (print file), so what the customer sees is exactly what gets printed.
 *
 * The canvas is A4-proportioned (1240×1754) and the print endpoint rasterises
 * it at 2480×3507 — 300 DPI for a full DTG front print.
 */
import starsData from "./data/stars.json";
import constellationsData from "./data/constellations.json";
import {
  DEG, zonedTimeToUtc, starHorizontal, planetsAbove, moonInfo,
  moonPhaseName, galacticEquator, formatCivilDate, formatCivilTime,
  formatLat, formatLng, PLANET_GLYPHS, type PlanetName,
} from "./astro";
import type { SkySpec } from "./spec";
import { specNumber } from "./spec";
import { COLORS_BY_ID } from "./products";

export const VIEW_W = 1240;
export const VIEW_H = 1754;

interface InkPalette {
  ink: string;
  accent: string;
  muted: string;
  faint: string;
  starTints: [string, string, string, string, string];
}

const PALETTE_LIGHT: InkPalette = {
  ink: "#F2EAD6", accent: "#C9A24B",
  muted: "rgba(242,234,214,0.62)", faint: "rgba(242,234,214,0.34)",
  starTints: ["#D6E2FF", "#F2EAD6", "#FFEAC2", "#FFD9A3", "#FFC9A0"],
};

const PALETTE_DARK: InkPalette = {
  ink: "#1B2440", accent: "#96762A",
  muted: "rgba(27,36,64,0.66)", faint: "rgba(27,36,64,0.36)",
  starTints: ["#7D8FCB", "#333F63", "#6B5A2E", "#7A5A28", "#8A4B2A"],
};

function paletteFor(spec: SkySpec): InkPalette {
  return COLORS_BY_ID[spec.color]?.ink === "light" ? PALETTE_LIGHT : PALETTE_DARK;
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

/** Star color by B−V color index (bucketed). */
function starTintIndex(ci: number): number {
  if (ci < 0.05) return 0;
  if (ci < 0.3) return 1;
  if (ci < 0.65) return 2;
  if (ci < 1.05) return 3;
  return 4;
}

/**
 * Stereographic projection, zenith at centre, north up, east left — the
 * classic "looking up at the sky" planisphere orientation.
 */
class Projector {
  cx: number; cy: number; r: number;
  constructor(cx: number, cy: number, r: number) { this.cx = cx; this.cy = cy; this.r = r; }
  project(alt: number, az: number): { x: number; y: number } | null {
    if (alt <= 0) return null;
    const z = (90 - alt) * DEG;
    const rr = this.r * Math.tan(z / 2);
    const a = az * DEG;
    return {
      x: this.cx - rr * Math.sin(a),
      y: this.cy - rr * Math.cos(a),
    };
  }
}

export interface SkyFacts {
  utc: Date;
  moon: string | null;
  planets: string[];
}

/** Compute the human-readable "facts" strip under the chart. */
export function skyFacts(spec: SkySpec): SkyFacts {
  const utc = zonedTimeToUtc(spec.date, spec.time, spec.tz);
  const moon = moonInfo(spec.lat, spec.lng, utc);
  const planets = planetsAbove(spec.lat, spec.lng, utc).map(p => p.name as PlanetName);
  const moonText = moon
    ? `${moonPhaseName(moon.angle, moon.illum)} · ${Math.round(moon.illum * 100)}% lit`
    : null;
  return { utc, moon: moonText, planets };
}

/** Render the full print SVG for a spec. */
export function starmapSvg(spec: SkySpec): string {
  const pal = paletteFor(spec);
  const utc = zonedTimeToUtc(spec.date, spec.time, spec.tz);
  const proj = new Projector(620, 815, 418);
  const parts: string[] = [];
  const defs: string[] = [];

  // ----------------------------- header text
  const title = spec.title.toUpperCase();
  const nameLen = spec.name.length;
  const nameSize = nameLen <= 14 ? 82 : nameLen <= 19 ? 68 : nameLen <= 24 ? 58 : 50;
  const dateLine = [
    formatCivilDate(spec.date, spec.time),
    formatCivilTime(spec.time),
    spec.place,
  ].filter(Boolean).join("  ·  ");

  const text = (x: number, y: number, s: string, attrs: string) =>
    `<text x="${x}" y="${y}" ${attrs}>${esc(s)}</text>`;

  parts.push(text(620, 152, title,
    `text-anchor="middle" font-family="Cinzel" font-size="26" letter-spacing="7" fill="${pal.accent}"`));
  parts.push(text(620, 268, spec.name,
    `text-anchor="middle" font-family="Cormorant Garamond" font-weight="600" font-size="${nameSize}" fill="${pal.ink}"`));
  parts.push(text(620, 322, dateLine,
    `text-anchor="middle" font-family="Cormorant Garamond" font-style="italic" font-size="30" fill="${pal.muted}"`));

  // ----------------------------- chart ring
  const ring = (r: number, w: number, color: string, opacity = 1) =>
    `<circle cx="620" cy="815" r="${r.toFixed(1)}" fill="none" stroke="${color}" stroke-width="${w}" opacity="${opacity}"/>`;
  parts.push(ring(418, 2.4, pal.ink));
  parts.push(ring(402, 1, pal.faint));

  // azimuth ticks every 30°
  let ticks = "";
  for (let az = 0; az < 360; az += 30) {
    ticks += `<line x1="${620 - 418 * Math.sin(az * DEG)}" y1="${815 - 418 * Math.cos(az * DEG)}" `
      + `x2="${(620 - 408 * Math.sin(az * DEG)).toFixed(1)}" y2="${(815 - 408 * Math.cos(az * DEG)).toFixed(1)}" `
      + `stroke="${pal.faint}" stroke-width="1.4"/>`;
  }
  parts.push(`<g opacity="0.9">${ticks}</g>`);

  // cardinal points
  const cardinals: Array<[string, number]> = [["N", 0], ["E", 90], ["S", 180], ["W", 270]];
  for (const [label, az] of cardinals) {
    const x = 620 - 456 * Math.sin(az * DEG);
    const y = 815 - 456 * Math.cos(az * DEG) + 8;
    parts.push(text(x, y, label,
      `text-anchor="middle" font-family="Cinzel" font-size="24" letter-spacing="2" fill="${pal.muted}"`));
  }

  // zenith cross
  parts.push(`<g stroke="${pal.faint}" stroke-width="1.2"><line x1="608" y1="815" x2="632" y2="815"/><line x1="620" y1="803" x2="620" y2="827"/></g>`);

  // ----------------------------- milky way band
  const gal = galacticEquator(4);
  let mwSeg: Array<Array<{ x: number; y: number }>> = [];
  let cur: Array<{ x: number; y: number }> = [];
  for (const [ra, dec] of gal) {
    const h = starHorizontal(ra, dec, spec.lat, spec.lng, utc);
    const p = h.alt > 5 ? proj.project(h.alt, h.az) : null;
    if (p) cur.push(p);
    else if (cur.length > 1) { mwSeg.push(cur); cur = []; }
    else cur = [];
  }
  if (cur.length > 1) mwSeg.push(cur);
  const mwPath = mwSeg
    .filter(seg => seg.length > 1)
    .map(seg => "M" + seg.map(p => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" L "))
    .join(" ");
  if (mwPath) {
    parts.push(`<path d="${mwPath}" fill="none" stroke="${pal.ink}" stroke-width="150" stroke-linecap="round" stroke-linejoin="round" opacity="0.045"/>`);
    parts.push(`<path d="${mwPath}" fill="none" stroke="${pal.ink}" stroke-width="64" stroke-linecap="round" stroke-linejoin="round" opacity="0.05"/>`);
  }

  // ----------------------------- constellation lines + labels
  const linesByCon: Record<string, number[][][]> = constellationsData.lines;
  const namesByCon: Record<string, string> = constellationsData.names;
  const labelCandidates: Array<{ label: string; x: number; y: number; segs: number }> = [];
  const conStroke = `stroke="${pal.faint}" stroke-width="1.6" fill="none" opacity="0.85"`;
  for (const [con, lines] of Object.entries(linesByCon)) {
    let segs = 0;
    let longest: [number, number, number, number] | null = null;
    let longestLen = 0;
    for (const line of lines) {
      const pts = line.map(([ra, dec]) => {
        const h = starHorizontal(ra, dec, spec.lat, spec.lng, utc);
        return h.alt > 0 ? proj.project(h.alt, h.az) : null;
      });
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1];
        if (a && b) {
          segs++;
          parts.push(`<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" ${conStroke}/>`);
          const len = Math.hypot(b.x - a.x, b.y - a.y);
          if (len > longestLen) { longestLen = len; longest = [a.x, a.y, b.x, b.y]; }
        }
      }
    }
    if (segs >= 2 && longest && namesByCon[con]) {
      const mx = (longest[0] + longest[2]) / 2, my = (longest[1] + longest[3]) / 2;
      const dx = mx - 620, dy = my - 815;
      const d = Math.hypot(dx, dy) || 1;
      labelCandidates.push({
        label: namesByCon[con].toUpperCase(),
        x: mx + (dx / d) * 30, y: my + (dy / d) * 30,
        segs,
      });
    }
  }
  for (const c of labelCandidates.sort((a, b) => b.segs - a.segs).slice(0, 7)) {
    parts.push(text(c.x, c.y, c.label,
      `text-anchor="middle" font-family="Cinzel" font-size="15.5" letter-spacing="2.5" fill="${pal.muted}" opacity="0.9"`));
  }

  // ----------------------------- stars
  // Halo gradients per tint, objectBoundingBox so each circle scales its own.
  pal.starTints.forEach((t, i) => {
    defs.push(`<radialGradient id="halo${i}"><stop offset="0" stop-color="${t}" stop-opacity="0.55"/><stop offset="0.55" stop-color="${t}" stop-opacity="0.18"/><stop offset="1" stop-color="${t}" stop-opacity="0"/></radialGradient>`);
  });

  const starEls: string[] = [];
  for (const [ra, dec, mag, ci] of starsData.stars as number[][]) {
    const h = starHorizontal(ra, dec, spec.lat, spec.lng, utc);
    if (h.alt <= 0) continue;
    const p = h.alt > 0 ? proj.project(h.alt, h.az) : null;
    if (!p) continue;
    const r = Math.min(8.2, Math.max(1.05, 1.35 + (5.4 - mag) * 0.78));
    const tint = pal.starTints[starTintIndex(ci ?? 0.6)];
    if (mag <= 1.1) {
      starEls.push(`<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${(r * 3.1).toFixed(1)}" fill="url(#halo${starTintIndex(ci ?? 0.6)})"/>`);
    }
    starEls.push(`<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${r.toFixed(2)}" fill="${tint}"/>`);
  }
  parts.push(`<g>${starEls.join("")}</g>`);

  // ----------------------------- planets
  for (const p of planetsAbove(spec.lat, spec.lng, utc)) {
    const pt = proj.project(p.alt, p.az);
    if (!pt) continue;
    const isSaturn = p.name === "Saturn";
    parts.push(`<circle cx="${pt.x.toFixed(1)}" cy="${pt.y.toFixed(1)}" r="${(isSaturn ? 4.4 : 3.8).toFixed(1)}" fill="${pal.accent}"/>`);
    parts.push(`<circle cx="${pt.x.toFixed(1)}" cy="${pt.y.toFixed(1)}" r="8.5" fill="none" stroke="${pal.accent}" stroke-width="1" opacity="0.7"/>`);
    if (isSaturn) {
      parts.push(`<ellipse cx="${pt.x.toFixed(1)}" cy="${pt.y.toFixed(1)}" rx="9.5" ry="3.2" fill="none" stroke="${pal.accent}" stroke-width="1" opacity="0.9" transform="rotate(-18 ${pt.x.toFixed(1)} ${pt.y.toFixed(1)})"/>`);
    }
    parts.push(text(pt.x, pt.y + 24, PLANET_GLYPHS[p.name as PlanetName],
      `text-anchor="middle" font-family="Cinzel" font-size="15" fill="${pal.muted}"`));
  }

  // ----------------------------- moon with its true phase
  const moon = moonInfo(spec.lat, spec.lng, utc);
  if (moon && moon.alt > 0) {
    const pt = proj.project(moon.alt, moon.az)!;
    const r = 15;
    const k = moon.illum;                 // illuminated fraction
    const waxing = moon.angle < 180;      // bright limb toward the west (right side up-facing N)
    const a = Math.abs(1 - 2 * k) * r;    // terminator semi-minor axis
    const right = waxing;                 // waxing: right half lit (northern-hemisphere view)
    // outer lit limb: semicircle on the lit side
    const litArc = right
      ? `A ${r} ${r} 0 0 1 ${pt.x} ${pt.y + r}`  // top → bottom on the right
      : `A ${r} ${r} 0 0 0 ${pt.x} ${pt.y + r}`; // top → bottom on the left
    // terminator arc from bottom back to top; bulge direction depends on crescent/gibbous
    const gibbous = k > 0.5;
    let termArc: string;
    if (right) {
      // lit on right: terminator passes x ± a
      termArc = gibbous
        ? `A ${a.toFixed(2)} ${r} 0 0 ${1} ${pt.x} ${pt.y - r}` // bulge left (into dark side)
        : `A ${a.toFixed(2)} ${r} 0 0 ${0} ${pt.x} ${pt.y - r}`; // bulge right (bite out of lit side)
    } else {
      termArc = gibbous
        ? `A ${a.toFixed(2)} ${r} 0 0 ${0} ${pt.x} ${pt.y - r}` // bulge right
        : `A ${a.toFixed(2)} ${r} 0 0 ${1} ${pt.x} ${pt.y - r}`; // bulge left
    }
    const lit = `M ${pt.x} ${pt.y - r} ${litArc} ${termArc} Z`;
    parts.push(`<circle cx="${pt.x.toFixed(1)}" cy="${pt.y.toFixed(1)}" r="${r}" fill="${pal.ink}" opacity="0.16"/>`);
    parts.push(`<path d="${lit}" fill="${pal.ink}" opacity="0.92"/>`);
    parts.push(`<circle cx="${pt.x.toFixed(1)}" cy="${pt.y.toFixed(1)}" r="${r}" fill="none" stroke="${pal.accent}" stroke-width="1.2" opacity="0.85"/>`);
  }

  // ----------------------------- footer
  const facts = skyFacts(spec);
  const detailBits: string[] = [];
  if (facts.moon) detailBits.push(facts.moon.toLowerCase());
  if (facts.planets.length) detailBits.push(`${facts.planets.join(" & ")} above the horizon`);

  parts.push(text(620, 1302, `${formatLat(spec.lat)}   ·   ${formatLng(spec.lng)}`,
    `text-anchor="middle" font-family="Cinzel" font-size="21" letter-spacing="5" fill="${pal.muted}"`));
  if (detailBits.length) {
    parts.push(text(620, 1350, detailBits.join("  ·  "),
      `text-anchor="middle" font-family="Cormorant Garamond" font-style="italic" font-size="28" fill="${pal.muted}"`));
  }
  if (spec.message) {
    parts.push(text(620, 1408, spec.message,
      `text-anchor="middle" font-family="Cormorant Garamond" font-style="italic" font-size="34" fill="${pal.ink}"`));
  }

  // ornament rule
  const ruleY = 1462;
  parts.push(`<g stroke="${pal.accent}" stroke-width="1.2" opacity="0.9">`
    + `<line x1="430" y1="${ruleY}" x2="588" y2="${ruleY}"/><line x1="692" y1="${ruleY}" x2="850" y2="${ruleY}"/></g>`);
  parts.push(`<path d="M 620 ${ruleY - 7} L 627 ${ruleY} L 620 ${ruleY + 7} L 613 ${ruleY} Z" fill="${pal.accent}"/>`);

  parts.push(text(620, 1522, "SKYBORN",
    `text-anchor="middle" font-family="Cinzel" font-weight="600" font-size="27" letter-spacing="13" fill="${pal.ink}"`));
  parts.push(text(620, 1562, `№ ${specNumber(spec)} · PRINTED ONCE, FOR ONE PERSON`,
    `text-anchor="middle" font-family="Cinzel" font-size="14.5" letter-spacing="3.5" fill="${pal.muted}"`));

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEW_W} ${VIEW_H}" width="${VIEW_W}" height="${VIEW_H}">`
    + `<defs>${defs.join("")}</defs>${parts.join("")}</svg>`;
}
