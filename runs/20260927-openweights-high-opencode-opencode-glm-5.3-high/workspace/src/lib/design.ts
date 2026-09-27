/**
 * The print generator. One function produces the artwork SVG for a design
 * spec; the browser injects it inline for the live preview and the server
 * rasterizes the same markup to a 300-dpi PNG for the print file, so what the
 * customer sees is exactly what gets printed.
 *
 * Design language: the moon is drawn with its true phase for the customer's
 * moment. Only the lit part is printed; the unlit part is left transparent, so
 * the garment itself becomes the dark side of the moon, scattered with a
 * seeded starfield unique to the date.
 */

import { PALETTES, PRINT_WIDTH, PRINT_HEIGHT } from "./products";
import { moonPhaseAt, formatDisplayDate } from "./moon";
import { specTimestamp, type DesignSpec } from "./params";

export interface FontMap {
  display: string;      // Cormorant Garamond (title, date)
  displayItalic: string; // italic for the personal line
  sans: string;         // IBM Plex Sans (brand, labels)
}

export const SERVER_FONTS: FontMap = {
  display: "Cormorant Garamond",
  displayItalic: "Cormorant Garamond",
  sans: "IBM Plex Sans",
};

/** Deterministic PRNG (mulberry32) so a date always yields the same sky. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFor(spec: DesignSpec): number {
  const key = `${spec.date}|${spec.time ?? ""}|${spec.hemisphere}|${spec.garment}`;
  let h = 2166136261;
  for (const ch of key) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

const f2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Region paths for the lit and unlit halves of the disc, in local
 * coordinates where the disc is centered at (0,0) with radius R and the sun is
 * to the right. `c` is the terminator ellipse x-radius: R at new moon, 0 at
 * quadrature, -R at full. `sweep` mirrors the terminator to the correct side.
 */
function regionPaths(R: number, c: number) {
  const b = Math.abs(c);
  // Right semicircle (top -> right -> bottom) then terminator (bottom -> top).
  const lit = `M 0 ${-R} A ${f2(R)} ${f2(R)} 0 0 1 0 ${f2(R)} A ${f2(b)} ${f2(R)} 0 0 ${c > 0 ? 0 : 1} 0 ${-R} Z`;
  // Left semicircle then the same terminator arc, enclosing the unlit part.
  const dark = `M 0 ${-R} A ${f2(R)} ${f2(R)} 0 0 0 0 ${f2(R)} A ${f2(b)} ${f2(R)} 0 0 ${c > 0 ? 0 : 1} 0 ${-R} Z`;
  // The terminator alone, for its gold hairline.
  const terminator = `M 0 ${f2(R)} A ${f2(b)} ${f2(R)} 0 0 ${c > 0 ? 0 : 1} 0 ${-R}`;
  return { lit, dark, terminator };
}

/** Is a local point on the unlit side (x left of the terminator)? */
function isDark(x: number, y: number, R: number, c: number): boolean {
  const edge = R * R - y * y;
  const term = edge > 0 ? c * Math.sqrt(edge / (R * R)) : 0;
  return x < term;
}

/** A four-pointed sparkle star. */
function sparkle(x: number, y: number, r: number, fill: string, opacity: number): string {
  return (
    `<g opacity="${opacity}">` +
    `<path d="M ${f2(x)} ${f2(y - r)} C ${f2(x + r * 0.18)} ${f2(y - r * 0.18)} ${f2(x + r * 0.18)} ${f2(y - r * 0.18)} ${f2(x + r)} ${f2(y)} ` +
    `C ${f2(x + r * 0.18)} ${f2(y + r * 0.18)} ${f2(x + r * 0.18)} ${f2(y + r * 0.18)} ${f2(x)} ${f2(y + r)} ` +
    `C ${f2(x - r * 0.18)} ${f2(y + r * 0.18)} ${f2(x - r * 0.18)} ${f2(y + r * 0.18)} ${f2(x - r)} ${f2(y)} ` +
    `C ${f2(x - r * 0.18)} ${f2(y - r * 0.18)} ${f2(x - r * 0.18)} ${f2(y - r * 0.18)} ${f2(x)} ${f2(y - r)} Z" fill="${fill}"/>` +
    `</g>`
  );
}

export interface SvgOptions {
  fonts?: FontMap;
  /** Preview mode omits the XML declaration for inline embedding. */
  inline?: boolean;
}

/** Build the full print artwork SVG for a design spec. */
export function buildArtworkSvg(spec: DesignSpec, opts: SvgOptions = {}): string {
  const fonts = opts.fonts ?? SERVER_FONTS;
  const W = PRINT_WIDTH;
  const H = PRINT_HEIGHT;
  const p = PALETTES[spec.garment];
  const phase = moonPhaseAt(specTimestamp(spec));

  const cx = W / 2;
  const cy = 2050;
  const R = 1420;
  const R2 = R + 95;

  const rng = mulberry32(seedFor(spec));

  // The disc is built with the sun to the right (waxing, northern sky).
  // A waning moon mirrors that; and seen from the southern hemisphere the
  // whole sky mirrors again, canceling out. Both flips in one flag:
  const elong = phase.elongation;
  const cosE = Math.cos((elong * Math.PI) / 180);
  const c = R * cosE;                       // terminator x-radius, signed
  const mirror = !phase.waxing !== (spec.hemisphere === "S");
  const { lit, dark, terminator } = regionPaths(R, c);

  // ---- moon surface -----------------------------------------------------
  const maria: string[] = [];
  const MARIA = 9;
  for (let i = 0; i < MARIA; i++) {
    const ang = rng() * Math.PI * 2;
    const dist = Math.sqrt(rng()) * 0.72 * R;
    const rx = 130 + rng() * 300;
    const ry = rx * (0.55 + rng() * 0.4);
    const rot = Math.round(rng() * 180);
    const op = 0.14 + rng() * 0.13;
    maria.push(
      `<ellipse cx="${f2(Math.cos(ang) * dist)}" cy="${f2(Math.sin(ang) * dist)}" rx="${f2(rx)}" ry="${f2(ry)}" ` +
      `transform="rotate(${rot} ${f2(Math.cos(ang) * dist)} ${f2(Math.sin(ang) * dist)})" fill="${p.moonDeep}" opacity="${f2(op)}"/>`
    );
  }

  const craters: string[] = [];
  const CRATERS = 64;
  for (let i = 0; i < CRATERS; i++) {
    const ang = rng() * Math.PI * 2;
    const dist = Math.sqrt(rng()) * 0.9 * R;
    const x = Math.cos(ang) * dist;
    const y = Math.sin(ang) * dist;
    const r = 16 + Math.pow(rng(), 2.2) * 120;
    const opF = 0.10 + rng() * 0.13;
    const opR = 0.07 + rng() * 0.09;
    craters.push(
      `<circle cx="${f2(x)}" cy="${f2(y)}" r="${f2(r)}" fill="${p.moonDeep}" opacity="${f2(opF)}"/>` +
      `<circle cx="${f2(x - r * 0.07)}" cy="${f2(y - r * 0.07)}" r="${f2(r)}" fill="${p.moonHigh}" opacity="${f2(opR)}"/>`
    );
  }

  // ---- starfield in the unlit half ---------------------------------------
  const stars: string[] = [];
  let placed = 0;
  let attempts = 0;
  while (placed < 150 && attempts < 4000) {
    attempts++;
    const ang = rng() * Math.PI * 2;
    const dist = Math.sqrt(rng()) * 0.9 * R;
    const x = Math.cos(ang) * dist;
    const y = Math.sin(ang) * dist;
    if (!isDark(x, y, R, c)) continue;
    if (Math.hypot(x, y) < 0.1 * R) continue; // keep the heart of the shadow clear
    const gold = rng() < 0.22;
    const op = 0.45 + rng() * 0.5;
    if (rng() < 0.08) {
      stars.push(sparkle(x, y, 26 + rng() * 26, gold ? p.starGold : p.star, op));
    } else {
      const r = 5 + Math.pow(rng(), 2) * 17;
      stars.push(
        `<circle cx="${f2(x)}" cy="${f2(y)}" r="${f2(r)}" fill="${gold ? p.starGold : p.star}" opacity="${f2(op)}"/>`
      );
    }
    placed++;
  }

  // ---- orbit ring ---------------------------------------------------------
  const ringDots: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = rng() * Math.PI * 2;
    const x = Math.cos(a) * R2;
    const y = Math.sin(a) * R2;
    const r = 9 + rng() * 13;
    const op = 0.45 + rng() * 0.45;
    ringDots.push(`<circle cx="${f2(x)}" cy="${f2(y)}" r="${f2(r)}" fill="${p.gold}" opacity="${f2(op)}"/>`);
  }

  // ---- typography ---------------------------------------------------------
  const dateText = esc(
    formatDisplayDate(spec.date) + (spec.time ? ` · ${spec.time} UTC` : "")
  ).toUpperCase();
  const phaseText = esc(
    phase.phaseName.toUpperCase() + " · " + Math.round(phase.illumination * 100) + "% ILLUMINATED"
  );
  const lineText = spec.line ? esc(spec.line.trim()) : "";

  const text = (y: number, content: string, size: number, ls: number, fill: string, family: string, weight: number, italic = false) =>
    `<text x="${f2(cx + ls / 2)}" y="${f2(y)}" font-family="${family}, serif" font-size="${f2(size)}" ` +
    `font-weight="${weight}"${italic ? ` font-style="italic"` : ""} letter-spacing="${f2(ls)}" ` +
    `fill="${fill}" text-anchor="middle" xml:space="preserve">${content}</text>`;

  const moonGroup = (inner: string) =>
    `<g transform="translate(${f2(cx)} ${f2(cy)})">${mirror ? `<g transform="scale(-1 1)">` : ""}${inner}${mirror ? `</g>` : ""}</g>`;

  const svg =
`${opts.inline ? "" : '<?xml version="1.0" encoding="UTF-8"?>\n'}
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="surface" cx="38%" cy="34%" r="80%">
      <stop offset="0%" stop-color="${p.moonHigh}" stop-opacity="0.38"/>
      <stop offset="55%" stop-color="${p.moonBase}" stop-opacity="1"/>
      <stop offset="100%" stop-color="${p.moonDeep}" stop-opacity="0.9"/>
    </radialGradient>
    <radialGradient id="limb">
      <stop offset="0%" stop-color="${p.moonDeep}" stop-opacity="0"/>
      <stop offset="90%" stop-color="${p.moonDeep}" stop-opacity="0"/>
      <stop offset="100%" stop-color="${p.moonDeep}" stop-opacity="0.55"/>
    </radialGradient>
    <clipPath id="litClip"><path d="${lit}"/></clipPath>
    <clipPath id="darkClip"><path d="${dark}"/></clipPath>
  </defs>

  <!-- brand -->
  ${text(470, "UNDER THIS MOON", 104, 44, p.gold, `${fonts.sans}`, 600)}
  <line x1="${f2(cx - 820)}" y1="580" x2="${f2(cx - 60)}" y2="580" stroke="${p.inkSoft}" stroke-width="4" opacity="0.7"/>
  <path d="M ${cx} 566 L ${cx + 14} 580 L ${cx} 594 L ${cx - 14} 580 Z" fill="${p.gold}"/>
  <line x1="${f2(cx + 60)}" y1="580" x2="${f2(cx + 820)}" y2="580" stroke="${p.inkSoft}" stroke-width="4" opacity="0.7"/>

  <!-- the moon, phase-true; the unlit half is the shirt itself -->
  ${moonGroup(`
    <circle r="${f2(R2)}" fill="none" stroke="${p.gold}" stroke-width="7" opacity="0.75"/>
    ${ringDots.join("\n    ")}
    <g clip-path="url(#litClip)">
      <circle r="${f2(R)}" fill="url(#surface)"/>
      ${maria.join("\n      ")}
      ${craters.join("\n      ")}
      <circle r="${f2(R)}" fill="url(#limb)"/>
    </g>
    <g clip-path="url(#darkClip)">
      ${stars.join("\n      ")}
    </g>
    <path d="${terminator}" fill="none" stroke="${p.gold}" stroke-width="8" opacity="0.9"/>
  `)}

  <!-- from the sky to the date -->
  <line x1="${f2(cx)}" y1="${f2(cy + R2 + 70)}" x2="${f2(cx)}" y2="${f2(cy + R2 + 190)}" stroke="${p.inkSoft}" stroke-width="4" opacity="0.7"/>

  <!-- the moment -->
  ${text(3905, dateText, 248, 26, p.ink, `${fonts.display}`, 300)}
  ${text(4105, phaseText, 96, 32, p.inkSoft, `${fonts.sans}`, 500)}
  ${lineText ? text(4330, lineText, 132, 10, p.ink, `${fonts.displayItalic}`, 500, true) : ""}

  <!-- footer -->
  ${text(5478, "PRINTED FROM YOUR MOMENT · UNDER THIS MOON", 64, 24, p.inkSoft, `${fonts.sans}`, 400)}
</svg>`;
  return svg.replace(/\n{2,}/g, "\n").trim();
}
