// lib/design.ts
// Given a (DesignInput + SkySnapshot) produces an SVG sized for the
// Prodigi print area (4665 × 5844 px for Bella+Canvas 3001 front with
// Gildan 64000 the spec is identical). The same composition is reused
// for live preview at smaller scale.

import { constellationEdges, proceduralStars, FakeStar } from "./sky-model";
import { SkySnapshot } from "./astronomy";

export type Palette = "ink" | "ivory" | "rose" | "sage";

export interface PaletteColors {
  background: string;
  discA: string;
  discB: string;
  ink: string;
  inkSoft: string;
  gold: string;
  star: string;
  starBright: string;
  planetStroke: string;
}

export const PALETTES: Record<Palette, PaletteColors> = {
  ink: {
    background: "#0a1830",
    discA: "#1d2952",
    discB: "#0a1830",
    ink: "#f4ecd8",
    inkSoft: "#d9b67a",
    gold: "#e9c989",
    star: "#f3eedf",
    starBright: "#ffe9aa",
    planetStroke: "#d9b67a",
  },
  ivory: {
    background: "#f4ecd8",
    discA: "#e8dec3",
    discB: "#cbb98d",
    ink: "#241a0c",
    inkSoft: "#5d4423",
    gold: "#a37438",
    star: "#2c2010",
    starBright: "#5a3d18",
    planetStroke: "#5d4423",
  },
  rose: {
    background: "#f6e0d8",
    discA: "#f7d2c4",
    discB: "#cb6a76",
    ink: "#3b0a1a",
    inkSoft: "#7a2236",
    gold: "#a2324a",
    star: "#3b0a1a",
    starBright: "#621228",
    planetStroke: "#7a2236",
  },
  sage: {
    background: "#dfe3c8",
    discA: "#c8cf9e",
    discB: "#3a5942",
    ink: "#1c2a18",
    inkSoft: "#3a5942",
    gold: "#5a7548",
    star: "#1c2a18",
    starBright: "#2f4525",
    planetStroke: "#3a5942",
  },
};

export type GarmentColor =
  | "white"
  | "black"
  | "navy blue"
  | "natural"
  | "sand"
  | "military green";

export interface DesignInput {
  dateIso: string; // UTC date+time (the user-entered moment)
  lat: number;
  lng: number;
  placeName: string;
  headline: string;
  subtitle: string;
  message: string[]; // 0..4 lines
  palette: Palette;
  garment: GarmentColor;
}

export interface DesignOutput {
  /**
   * SVG markup sized to the Prodigi "front" print area (4665 × 5844 px).
   * Always PNG-able via /api/asset.
   */
  svg: string;
  /** Width / height, in pixels. */
  width: number;
  height: number;
  /** Short reproducible hash of the inputs. */
  hash: string;
  /** Lower-resolution raster preview, useful for the live-editing page. */
  preview: string;
}

// SGML-safe escaping for SVG text content.
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Compose the design. Pure function: same inputs in = same SVG out.
export function renderDesign(
  input: DesignInput,
  snapshot: SkySnapshot
): DesignOutput {
  const colors = PALETTES[input.palette];
  const seedKey = `${input.dateIso}|${input.lat.toFixed(3)}|${input.lng.toFixed(
    3
  )}|${input.headline}|${input.palette}`;
  const stars = proceduralStars(seedKey);
  const edges = constellationEdges(stars);

  // Real-time debugging only: log composition size.
  const width = 4665;
  const height = 5844;

  const headline = input.headline.trim().slice(0, 60);
  const subtitle = input.subtitle.trim().slice(0, 60);
  const messageLines = input.message
    .map((l) => l.trim().slice(0, 48))
    .filter((l) => l.length > 0)
    .slice(0, 4);


  const svg = renderSvgString({
    width,
    height,
    colors,
    stars,
    edges,
    snapshot,
    input,
    headline,
    subtitle,
    messageLines,
  });

  const hash = shortHash(svg);
  return { svg, width, height, hash, preview: "" };
}

function renderSvgString(args: {
  width: number;
  height: number;
  colors: ReturnType<typeof pickColors>;
  stars: FakeStar[];
  edges: { a: number; b: number }[];
  snapshot: SkySnapshot;
  input: DesignInput;
  headline: string;
  subtitle: string;
  messageLines: string[];
}): string {  const {
    width,
    height,
    colors,
    stars,
    edges,
    snapshot,
    input,
    headline,
    subtitle,
    messageLines,
  } = args;
  const cx = width / 2;
  // Layout zones — height 5844 is split into:
  //   0 .. 720      : headline block (h1 + subtitle)
  //   720 .. 4524   : sky disc + planet dots
  //   4524 .. 5040  : date strip
  //   5040 .. 5440  : place + lat/lng + moon phase
  //   5440 .. 5660  : personal message (italic, optional, max 3 lines)
  //   5660 .. 5844  : brand stamp + DTG number
  const headlineY = 360;
  const subtitleY = 540;
  const discCenterY = 2620;
  const discRadius = 1900;
  const dateY = headerBottomOf(discCenterY, discRadius);
  const placeY = dateY + 280;
  const coordsY = placeY + 200;
  const messageStartY = coordsY + 220;
  const brandY = height - 180;

  // Build star dots and lines as SVG markup.
  const starMarkup = renderStarField(stars, edges, {
    cx,
    cy: discCenterY,
    r: discRadius,
    colors,
    siderealHours: snapshot.localSiderealHours,
  });

  // Planet + moon positions (use RA/Dec => polar coordinate on the disc).
  const lstShift = snapshot.localSiderealHours / 24; // 0..1 fraction of day
  function raDecToXY(ra: number, dec: number): [number, number] {
    // Project (RA, dec) as a polar coordinate on the disc; slash-time rotation
    // so north is up, east is right. Sidereal framing rotates all bodies by
    // lstShift so different longitudes see the sky at a different "angle".
    const phi = (ra / 24) * 2 * Math.PI + lstShift * Math.PI * 2;
    const theta = dec;
    const x = cx + discRadius * 0.92 * Math.cos(phi) * Math.cos(theta);
    const y = discCenterY - discRadius * 0.92 * Math.sin(phi) * Math.cos(theta);
    return [x, y];
  }

  const moonXY = raDecToXY(snapshot.moon.raHours, snapshot.moon.decDeg);
  const sunXY = raDecToXY(snapshot.sun.raHours, snapshot.sun.decDeg);
  const planetsXY = (Object.keys(snapshot.planets) as Array<
    keyof typeof snapshot.planets
  >).map((k) => {
    const [x, y] = raDecToXY(
      snapshot.planets[k].raHours,
      snapshot.planets[k].decDeg
    );
    return {
      label: snapshot.planets[k].label,
      glyph: snapshot.planets[k].glyph,
      x,
      y,
      visible: snapshot.altitudes[k]?.visible ?? true,
    };
  });

  const formattedDate = formatDate(snapshot.localDate);
  const phaseShape = renderMoonPhase(snapshot.moon.phaseFraction);

  const longPlace = esc(input.placeName);
  const headlineEsc = esc(headline);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}"
     width="${width}" height="${height}" fill="none">
  <defs>
    <radialGradient id="discGrad" cx="50%" cy="50%" r="55%">
      <stop offset="0%" stop-color="${colors.discA}" />
      <stop offset="100%" stop-color="${colors.discB}" />
    </radialGradient>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${colors.background}" />
      <stop offset="100%" stop-color="${colors.background}" />
    </linearGradient>
  </defs>

  <rect width="100%" height="100%" fill="url(#bgGrad)" />

  <!-- headline (top) -->
  <text x="${cx}" y="${headlineY}" font-family="serif"
        font-style="italic" font-weight="500"
        text-anchor="middle" font-size="320" letter-spacing="-4"
        fill="${colors.ink}">${esc(headline.toUpperCase())}</text>

  <!-- subtitle -->
  <text x="${cx}" y="${subtitleY}" font-family="serif"
        text-anchor="middle" font-size="120" letter-spacing="6"
        fill="${colors.inkSoft}">${subtitle ? esc(subtitle.toUpperCase()) : ""}</text>

  <!-- celestial disc -->
  <circle cx="${cx}" cy="${discCenterY}" r="${discRadius}" fill="url(#discGrad)" />
  <circle cx="${cx}" cy="${discCenterY}" r="${discRadius}"
          stroke="${colors.inkSoft}" stroke-width="6" fill="none" />

  <!-- horizon line + cardinal ticks -->
  <line x1="${cx - discRadius}" y1="${discCenterY}" x2="${cx + discRadius}" y2="${discCenterY}"
        stroke="${colors.inkSoft}" stroke-width="2" stroke-dasharray="20 30" />
  <text x="${cx}" y="${discCenterY - 30}" font-family="serif"
        font-size="80" letter-spacing="8" fill="${colors.inkSoft}" text-anchor="middle" opacity="0.55">N</text>
  <text x="${cx + discRadius - 80}" y="${discCenterY - 30}" font-family="serif"
        font-size="80" letter-spacing="8" fill="${colors.inkSoft}" text-anchor="middle" opacity="0.55">E</text>
  <text x="${cx}" y="${discCenterY + 100}" font-family="serif"
        font-size="80" letter-spacing="8" fill="${colors.inkSoft}" text-anchor="middle" opacity="0.55">S</text>
  <text x="${cx - discRadius + 80}" y="${discCenterY - 30}" font-family="serif"
        font-size="80" letter-spacing="8" fill="${colors.inkSoft}" text-anchor="middle" opacity="0.55">W</text>

  <!-- star field -->
  ${starMarkup}

  <!-- sun -->
  ${renderBodyDot(sunXY, "0.8", colors.gold, false)}
  <!-- moon (custom phase shape instead of a plain disc) -->
  ${renderMoonDot(moonXY, snapshot.moon.phaseFraction, colors)}

  <!-- planet glyphs -->
  ${planetsXY
    .map(
      (p) => renderPlanetGlyph(p.x, p.y, p.label, p.glyph, colors, p.visible)
    )
    .join("\n  ")}

  <!-- date strip -->
  <text x="${cx}" y="${dateY}" font-family="serif"
        text-anchor="middle" font-size="180" letter-spacing="14"
        fill="${colors.inkSoft}">${esc(formattedDate.toUpperCase())}</text>

  <!-- place name -->
  <text x="${cx}" y="${placeY}" font-family="serif"
        text-anchor="middle" font-size="180" letter-spacing="6"
        fill="${colors.ink}">${longPlace.toUpperCase()}</text>

  <!-- coordinates + moon phase -->
  <text x="${cx}" y="${coordsY}" font-family="serif"
        text-anchor="middle" font-size="100" letter-spacing="4"
        fill="${colors.inkSoft}">
    ${snapshot.lat.toFixed(2)}°${snapshot.lat >= 0 ? "N" : "S"}
    · ${Math.abs(snapshot.lng).toFixed(2)}°${snapshot.lng >= 0 ? "E" : "W"}
    · ${esc(snapshot.moon.phaseName.toUpperCase())}
  </text>

  <!-- personal message -->
  ${
    messageLines.length === 0
      ? ""
      : `<g font-family="serif" fill="${colors.ink}" font-style="italic">
        ${messageLines
          .slice(0, 2)
          .map(
            (line, idx) =>
              `<text x="${cx}" y="${messageStartY + idx * 140}" text-anchor="middle" font-size="130">${esc(line)}</text>`
          )
          .join("\n    ")}
      </g>`
  }

  <!-- footer: brand mark + DTG stamp -->
  <g font-family="serif" fill="${colors.inkSoft}">
    <text x="${cx}" y="${brandY}" text-anchor="middle" font-size="80" letter-spacing="12">UNDER · THIS · SKY</text>
    <text x="${cx}" y="${brandY + 110}" text-anchor="middle" font-size="56" letter-spacing="8" fill="${colors.inkSoft}">ASTRONOMICAL · DTG · SERIAL ${esc(((+args.stars[0].size * 1000) | 0).toString().padStart(4, "0"))}</text>
  </g>
</svg>`;
}

function headerBottomOf(centerY: number, r: number): number {
  return centerY + r + 240;
}

function renderStarField(
  stars: FakeStar[],
  edges: { a: number; b: number }[],
  args: {
    cx: number;
    cy: number;
    r: number;
    colors: PaletteColors;
    siderealHours: number;
  }
): string {
  const lstShift = args.siderealHours / 24;
  const parts: string[] = [];

  // Each star maps (theta, dec) to disc coordinates like the planets.
  const projected = stars.map((s) => {
    const phi = s.theta + lstShift * Math.PI * 2;
    const x = args.cx + args.r * 0.92 * Math.cos(phi) * Math.cos(s.dec);
    const y = args.cy - args.r * 0.92 * Math.sin(phi) * Math.cos(s.dec);
    return { x, y, size: s.size, warmth: s.warmth };
  });

  // Constellation dashed lines.
  for (const e of edges) {
    const a = projected[e.a];
    const b = projected[e.b];
    if (!a || !b) continue;
    parts.push(
      `<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(
        1
      )}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(
        1
      )}" stroke="${args.colors.gold}" stroke-width="6" stroke-dasharray="24 36" />`
    );
  }

  // Star dots: large / bright = warm cream, dim = cool grey-cream.
  for (const p of projected) {
    const color =
      p.warmth > 0.5 ? args.colors.starBright : args.colors.star;
    parts.push(
      `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(
        1
      )}" r="${p.size.toFixed(2)}" fill="${color}" />`
    );
  }
  return parts.join("\n  ");
}

function renderBodyDot(
  xy: [number, number],
  alpha: string,
  color: string,
  ring: boolean
): string {
  const [x, y] = xy;
  return `
  <g opacity="${alpha}">
    <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="22" fill="${color}" />
    ${
      ring
        ? `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(
            1
          )}" r="48" stroke="${color}" stroke-width="3" fill="none" />`
        : ""
    }
  </g>`;
}

function renderMoonDot(
  xy: [number, number],
  phaseFraction: number,
  colors: PaletteColors
): string {
  const [x, y] = xy;
  // SVG moon-phasing via two overlapping discs; we draw the bright portion
  // in the palette ink, dark portion in surrounding background tint. This
  // is purely cosmetic; we never claim it's the geometric moon phase.
  const r = 50;
  const lit = phaseFraction > 0.5 ? 1 : -1;
  const rx = Math.max(8, r * (Math.abs(phaseFraction - 0.5) * 2 + 0.4) - 8);
  return `
  <g>
    <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="${colors.discB}" />
    <ellipse cx="${x.toFixed(1) + lit * 8}" cy="${y.toFixed(
    1
  )}" rx="${rx}" ry="${r}" fill="${colors.inkSoft}" />
  </g>`;
}

function renderPlanetGlyph(
  x: number,
  y: number,
  label: string,
  glyph: string,
  colors: PaletteColors,
  visible: boolean
): string {
  return `
  <g opacity="${visible ? 1 : 0.4}">
    <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="48" fill="none" stroke="${colors.gold}" stroke-width="2" />
    <text x="${x.toFixed(1)}" y="${(y + 22).toFixed(
    1
  )}" font-family="serif" font-size="82" fill="${colors.gold}" text-anchor="middle">${esc(
    glyph
  )}</text>
    <text x="${x.toFixed(1)}" y="${(y + 110).toFixed(
    1
  )}" font-family="serif" font-size="50" letter-spacing="3" fill="${colors.inkSoft}" text-anchor="middle">${esc(
    label
  )}</text>
  </g>`;
}

function renderMoonPhase(_fraction: number): string {
  return "";
}

function formatDate(d: Date): string {
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${months[d.getUTCMonth()]} ${d
    .getUTCDate()
    .toString()
    .padStart(2, "0")}, ${d.getUTCFullYear()} · ${d
    .getUTCHours()
    .toString()
    .padStart(2, "0")}:${d.getUTCMinutes().toString().padStart(2, "0")} UTC`;
}

function pickColors(p: DesignInput): PaletteColors {
  return PALETTES[p.palette];
}

function escapeUpper(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Short, deterministic hash of the SVG payload (for cache-busting). */
export function shortHash(s: string): string {
  // FNV-1a 32-bit
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h.toString(16).padStart(8, "0");
}
