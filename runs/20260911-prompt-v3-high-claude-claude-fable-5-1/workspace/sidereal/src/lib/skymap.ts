import starsJson from "@/data/stars.6.json";
import linesJson from "@/data/constellations.lines.json";
import constJson from "@/data/constellations.json";
import { localToUtc, lstDeg, project, toHorizontal } from "./astro";
import { formatCoords, formatDate, type Design } from "./design";
import { getGarment } from "./catalog";

// ---- Catalogue preprocessing (runs once per process) ----------------------

interface Star { ra: number; dec: number; mag: number; bv: number }
interface ConstLine { id: string; segments: [number, number][][] }
interface ConstName { id: string; name: string; ra: number; dec: number }

type Feature = { id?: string | number; properties: Record<string, unknown>; geometry: { type: string; coordinates: unknown } };
type Collection = { features: Feature[] };

const STARS: Star[] = (starsJson as Collection).features
  .map((f) => {
    const [ra, dec] = f.geometry.coordinates as [number, number];
    return { ra: ((ra % 360) + 360) % 360, dec, mag: Number(f.properties.mag), bv: Number(f.properties.bv ?? 0) };
  })
  .sort((a, b) => b.mag - a.mag); // faint first so bright stars draw on top

const LINES: ConstLine[] = (linesJson as Collection).features.map((f) => ({
  id: String(f.id),
  segments: f.geometry.coordinates as [number, number][][],
}));

const NAMES: ConstName[] = (constJson as Collection).features.map((f) => {
  const [ra, dec] = f.geometry.coordinates as [number, number];
  return { id: String(f.id), name: String(f.properties.name ?? f.id), ra, dec };
});

// ---- Layout constants (viewBox units) ------------------------------------
// The print area of the shirt is 4680 x 5790 px (ratio 0.808). We lay out in a
// 1000 x 1237 box and let the rasteriser scale it.

export const VB_W = 1000;
export const VB_H = 1237;
const CX = 500;
const CY = 445;
const R = 400;

export interface SkyMapOptions {
  /** Include the caption block under the chart (title, place, coords). */
  caption?: boolean;
  /** Draw on a transparent background (print) — otherwise a preview background. */
  transparent?: boolean;
  /** Pixel width for the root element (height follows the aspect ratio). */
  width?: number;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Approximate star colour from B-V index. Two palettes: for dark and light garments. */
function starColor(bv: number, dark: boolean): string {
  if (dark) {
    if (bv < 0.0) return "#cfe0ff";
    if (bv < 0.4) return "#ffffff";
    if (bv < 0.8) return "#fff4d6";
    if (bv < 1.3) return "#ffdca8";
    return "#ffc58a";
  }
  if (bv < 0.0) return "#274a9e";
  if (bv < 0.4) return "#1b1c22";
  if (bv < 0.8) return "#4a3b1a";
  if (bv < 1.3) return "#8a4a10";
  return "#b3400e";
}

function starRadius(mag: number): number {
  // Brightest (-1.4) ≈ 5.2 units, faintest (6) ≈ 1.0 unit. At print scale
  // (x4.68) that's ~24px and ~5px: readable, but not blobby.
  return 0.95 + (6.2 - mag) * 0.55;
}

function fmt(n: number): string {
  return Number(n.toFixed(2)).toString();
}

export function buildSkyMapSvg(design: Design, opts: SkyMapOptions = {}): string {
  const caption = opts.caption ?? true;
  const garment = getGarment(design.garment);
  const ink = garment.dark ? "#ffffff" : "#1b1c22";
  const faint = garment.dark ? "rgba(255,255,255,0.55)" : "rgba(27,28,34,0.55)";
  const hair = garment.dark ? "rgba(255,255,255,0.35)" : "rgba(27,28,34,0.35)";

  const utc = localToUtc(design.date, design.time, design.tz);
  const lst = lstDeg(utc, design.lon);
  const lat = design.lat;

  const showLines = design.style !== "stars";
  const showNames = design.style === "atlas";
  const showGrid = design.style === "atlas";

  const parts: string[] = [];

  // Graticule (altitude circles + azimuth spokes)
  if (showGrid) {
    const g: string[] = [];
    for (const alt of [30, 60]) {
      const rr = R * Math.tan(((90 - alt) * Math.PI) / 360);
      g.push(`<circle cx="${CX}" cy="${CY}" r="${fmt(rr)}"/>`);
    }
    for (let az = 0; az < 360; az += 30) {
      const a = (az * Math.PI) / 180;
      g.push(`<line x1="${CX}" y1="${CY}" x2="${fmt(CX - R * Math.sin(a))}" y2="${fmt(CY - R * Math.cos(a))}"/>`);
    }
    parts.push(`<g fill="none" stroke="${hair}" stroke-width="0.5" stroke-dasharray="2 3">${g.join("")}</g>`);
  }

  // Constellation lines
  if (showLines) {
    const d: string[] = [];
    for (const c of LINES) {
      for (const seg of c.segments) {
        const pts = seg.map(([ra, dec]) => {
          const h = toHorizontal(ra, dec, lat, lst);
          return { h, p: project(h, CX, CY, R) };
        });
        for (let i = 0; i < pts.length - 1; i++) {
          const a = pts[i], b = pts[i + 1];
          if (a.h.alt < -2 && b.h.alt < -2) continue; // both below horizon
          if (a.h.alt < -40 || b.h.alt < -40) continue; // avoid wild projected chords
          d.push(`M${fmt(a.p.x)} ${fmt(a.p.y)}L${fmt(b.p.x)} ${fmt(b.p.y)}`);
        }
      }
    }
    parts.push(`<path d="${d.join("")}" fill="none" stroke="${faint}" stroke-width="0.9" stroke-linecap="round" clip-path="url(#sky)"/>`);
  }

  // Stars
  {
    const circles: string[] = [];
    const halos: string[] = [];
    for (const s of STARS) {
      const h = toHorizontal(s.ra, s.dec, lat, lst);
      if (h.alt < 0) continue;
      const p = project(h, CX, CY, R);
      const r = starRadius(s.mag);
      const fill = design.color ? starColor(s.bv, garment.dark) : ink;
      circles.push(`<circle cx="${fmt(p.x)}" cy="${fmt(p.y)}" r="${fmt(r)}" fill="${fill}"/>`);
      if (s.mag < 1.6) halos.push(`<circle cx="${fmt(p.x)}" cy="${fmt(p.y)}" r="${fmt(r * 2.1)}" fill="${fill}" opacity="0.22"/>`);
    }
    parts.push(`<g clip-path="url(#sky)">${halos.join("")}${circles.join("")}</g>`);
  }

  // Constellation names
  if (showNames) {
    const t: string[] = [];
    for (const n of NAMES) {
      const h = toHorizontal(n.ra, n.dec, lat, lst);
      if (h.alt < 8) continue;
      const p = project(h, CX, CY, R);
      t.push(`<text x="${fmt(p.x)}" y="${fmt(p.y)}">${esc(n.name.toUpperCase())}</text>`);
    }
    parts.push(`<g font-family="Space Mono, monospace" font-size="7.5" letter-spacing="1.2" fill="${faint}" text-anchor="middle" clip-path="url(#sky)">${t.join("")}</g>`);
  }

  // Horizon ring + cardinal points
  parts.push(`<circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="${ink}" stroke-width="1.6"/>`);
  parts.push(`<circle cx="${CX}" cy="${CY}" r="${R + 9}" fill="none" stroke="${hair}" stroke-width="0.6"/>`);
  {
    const labels: [string, number, number][] = [
      ["N", CX, CY - R - 22],
      ["S", CX, CY + R + 34],
      ["E", CX - R - 24, CY + 7],
      ["W", CX + R + 24, CY + 7],
    ];
    parts.push(
      `<g font-family="Space Mono, monospace" font-size="18" fill="${ink}" text-anchor="middle">` +
        labels.map(([l, x, y]) => `<text x="${x}" y="${y}">${l}</text>`).join("") +
        `</g>`,
    );
  }

  // Caption
  if (caption) {
    const title = design.title.trim();
    const place = design.place.trim();
    const meta = `${formatCoords(design.lat, design.lon)}   ·   ${formatDate(design.date)}   ·   ${design.time}`;
    let y = CY + R + 110;
    const cap: string[] = [];
    if (title) {
      cap.push(`<text x="${CX}" y="${y}" font-family="Cormorant Garamond, serif" font-style="italic" font-size="58" fill="${ink}" text-anchor="middle">${esc(title)}</text>`);
      y += 58;
    }
    if (place) {
      cap.push(`<text x="${CX}" y="${y}" font-family="Space Mono, monospace" font-size="19" letter-spacing="5" fill="${ink}" text-anchor="middle">${esc(place.toUpperCase())}</text>`);
      y += 40;
    }
    cap.push(`<text x="${CX}" y="${y}" font-family="Space Mono, monospace" font-size="13" letter-spacing="1.5" fill="${faint}" text-anchor="middle">${esc(meta.toUpperCase())}</text>`);
    parts.push(cap.join(""));
  }

  const bg = opts.transparent === false ? `<rect width="${VB_W}" height="${VB_H}" fill="${garment.hex}"/>` : "";

  const w = opts.width ?? VB_W;
  const h = Math.round((w * VB_H) / VB_W);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VB_W} ${VB_H}" width="${w}" height="${h}">` +
    `<defs><clipPath id="sky"><circle cx="${CX}" cy="${CY}" r="${R}"/></clipPath></defs>` +
    bg +
    parts.join("") +
    `</svg>`
  );
}

/** Summary of the sky used for the "what's on your shirt" panel. */
export function describeSky(design: Design): { utc: string; visibleStars: number; constellations: string[] } {
  const utc = localToUtc(design.date, design.time, design.tz);
  const lst = lstDeg(utc, design.lon);
  let visible = 0;
  for (const s of STARS) if (toHorizontal(s.ra, s.dec, design.lat, lst).alt > 0) visible++;
  const cons = NAMES.filter((n) => toHorizontal(n.ra, n.dec, design.lat, lst).alt > 25).map((n) => n.name);
  return { utc: utc.toISOString(), visibleStars: visible, constellations: cons };
}
