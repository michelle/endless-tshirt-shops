/**
 * Orbitday design renderer.
 *
 * Produces an SVG (as a string) in a 1000 x 1237 coordinate space, which maps
 * exactly onto the Prodigi front print area (4680 x 5790 px @ 300 DPI, i.e.
 * 15.6" x 19.3"). 1 unit ≈ 4.68 px ≈ 0.40 mm.
 *
 * DTG guidelines baked in: no strokes thinner than ~1.2 mm, no dots smaller
 * than ~2.4 mm, no semi-transparent ink, no gradients, transparent background.
 */
import { skySnapshot, type PlanetId } from "./astro";
import { ACCENTS, SHIRT_COLORS, formatDateLong, type Design } from "./design";
import { measureText, textPath } from "./fonts";

export const CANVAS = { w: 1000, h: 1237 }; // same aspect as 4680 x 5790

const PLANET_RADIUS: Record<PlanetId, number> = {
  mercury: 6.5,
  venus: 9.5,
  earth: 10.5,
  mars: 7.5,
  jupiter: 21,
  saturn: 17,
  uranus: 13,
  neptune: 12.5,
};

export interface RenderOptions {
  /** explicit pixel size for the root element (print file uses the exact Prodigi print-area size) */
  pixelSize?: { w: number; h: number };
  /** fill the background with the shirt colour (for previews / social images) */
  background?: boolean;
  /** omit width/height attributes (for inline responsive use) */
  responsive?: boolean;
}

const f2 = (n: number) => Math.round(n * 100) / 100;

/** Build the lit part of a moon disk as an SVG path, centered at cx,cy. */
function moonGlyph(cx: number, cy: number, r: number, phaseDeg: number, ink: string, stroke: number): string {
  const p = ((phaseDeg % 360) + 360) % 360;
  const waxing = p < 180;
  const k = Math.cos((p * Math.PI) / 180); // terminator x-scale
  const rx = Math.max(0.01, Math.abs(k) * r);
  // Build for right-side-lit; mirror for waning.
  const terminatorSweep = k > 0 ? 0 : 1;
  const lit = `M 0 ${-r} A ${r} ${r} 0 0 1 0 ${r} A ${f2(rx)} ${r} 0 0 ${terminatorSweep} 0 ${-r} Z`;
  const t = waxing ? `translate(${cx} ${cy})` : `translate(${cx} ${cy}) scale(-1 1)`;
  return (
    `<g transform="${t}">` +
    `<circle cx="0" cy="0" r="${r}" fill="none" stroke="${ink}" stroke-width="${stroke}"/>` +
    `<path d="${lit}" fill="${ink}"/>` +
    `</g>`
  );
}

export function buildDesignSVG(d: Design, opts: RenderOptions = {}): string {
  const { w: W, h: H } = CANVAS;
  const shirt = SHIRT_COLORS[d.shirt];
  const ink = shirt.ink;
  const accent = d.accent === "mono" ? ink : ACCENTS[d.accent].hex;
  const sky = skySnapshot(d.date);

  const parts: string[] = [];
  if (opts.background) parts.push(`<rect width="${W}" height="${H}" fill="${shirt.hex}"/>`);

  // ---- Orbit diagram ----
  const cx = W / 2;
  const cy = 455;
  const rMin = 62;
  const rMax = 362;
  const strokeW = 3; // ≈ 1.2 mm
  const n = sky.planets.length;
  const logA = sky.planets.map((p) => Math.log10(p.a));
  const logMin = logA[0];
  const logMax = logA[n - 1];

  const orbitRadius = (i: number) => {
    const lin = i / (n - 1);
    const log = (logA[i] - logMin) / (logMax - logMin);
    const mix = 0.55 * lin + 0.45 * log; // keeps inner planets readable
    return rMin + (rMax - rMin) * mix;
  };

  const rings: string[] = [];
  const bodies: string[] = [];
  const labels: string[] = [];

  // Sun
  bodies.push(`<circle cx="${cx}" cy="${cy}" r="24" fill="${accent}"/>`);
  if (d.style !== "minimal") {
    bodies.push(`<circle cx="${cx}" cy="${cy}" r="36" fill="none" stroke="${accent}" stroke-width="${strokeW}"/>`);
  }

  sky.planets.forEach((p, i) => {
    const r = orbitRadius(i);
    const dash = d.style === "minimal" ? ` stroke-dasharray="7 11" stroke-linecap="round"` : "";
    rings.push(`<circle cx="${cx}" cy="${cy}" r="${f2(r)}" fill="none" stroke="${ink}" stroke-width="${strokeW}"${dash}/>`);
    // ecliptic longitude: 0° to the right, counter-clockwise (y flipped for screen)
    const th = (p.longitude * Math.PI) / 180;
    const px = cx + r * Math.cos(th);
    const py = cy - r * Math.sin(th);
    const pr = PLANET_RADIUS[p.id];
    const isEarth = p.id === "earth";
    const fill = isEarth ? accent : ink;

    if (p.id === "saturn") {
      // ring: ellipse tilted, drawn as a stroke behind the body plus the body on top
      bodies.push(
        `<g transform="translate(${f2(px)} ${f2(py)}) rotate(-22)">` +
          `<ellipse rx="${pr * 1.95}" ry="${pr * 0.62}" fill="none" stroke="${ink}" stroke-width="${strokeW + 0.5}"/>` +
          `<circle r="${pr}" fill="${ink}"/>` +
          `</g>`,
      );
    } else if (isEarth) {
      // Earth: accent dot with a small halo ring so it reads as "you are here"
      if (d.style !== "minimal") {
        bodies.push(`<circle cx="${f2(px)}" cy="${f2(py)}" r="${pr + 9}" fill="none" stroke="${accent}" stroke-width="${strokeW}"/>`);
      }
      bodies.push(`<circle cx="${f2(px)}" cy="${f2(py)}" r="${pr + (d.style === "minimal" ? 3 : 0)}" fill="${fill}"/>`);
    } else {
      bodies.push(`<circle cx="${f2(px)}" cy="${f2(py)}" r="${pr}" fill="${fill}"/>`);
    }

    if (d.style === "annotated") {
      // small label placed just outside the planet, away from the sun
      const off = pr + (isEarth ? 22 : 13);
      const lx = px + off * Math.cos(th);
      const ly = py - off * Math.sin(th);
      const anchor = Math.cos(th) > 0.25 ? "start" : Math.cos(th) < -0.25 ? "end" : "middle";
      const dy = Math.sin(th) > 0.25 ? -2 : Math.sin(th) < -0.25 ? 12 : 5;
      labels.push(
        textPath(p.label.toUpperCase(), {
          x: lx,
          y: ly + dy,
          size: 11.5,
          weight: "medium",
          tracking: 0.16,
          anchor,
          fill: ink,
        }),
      );
    }
  });

  parts.push(`<g>${rings.join("")}</g>`);
  parts.push(`<g>${bodies.join("")}</g>`);
  if (labels.length) parts.push(`<g>${labels.join("")}</g>`);

  // ---- Caption block ----
  const maxWidth = 820;
  let y = cy + rMax + 92;

  const name = d.name.trim().toUpperCase();
  if (name) {
    let size = 60;
    const tracking = 0.2;
    while (size > 28 && measureText(name, size, "medium", tracking) > maxWidth) size -= 2;
    parts.push(textPath(name, { x: cx, y, size, weight: "medium", tracking, anchor: "middle", fill: ink }));
    y += 58;
  } else {
    y -= 10;
  }

  if (d.showDate) {
    const dateText = formatDateLong(d.date).toUpperCase();
    const size = 27;
    const tracking = 0.32;
    const moonR = 11;
    const gap = 20;
    const textW = measureText(dateText, size, "light", tracking);
    const total = textW + gap + moonR * 2;
    const startX = cx - total / 2;
    // moon glyph sits to the left of the date, vertically centred on the caps
    parts.push(moonGlyph(startX + moonR, y - size * 0.35, moonR, sky.moon.phase, ink, 2.6));
    parts.push(
      textPath(dateText, {
        x: startX + moonR * 2 + gap,
        y,
        size,
        weight: "light",
        tracking,
        anchor: "start",
        fill: ink,
      }),
    );
    y += 46;
  }

  const sub = d.subtitle.trim().toUpperCase();
  if (sub) {
    let size = 20;
    const tracking = 0.34;
    while (size > 14 && measureText(sub, size, "light", tracking) > maxWidth) size -= 1;
    parts.push(textPath(sub, { x: cx, y, size, weight: "light", tracking, anchor: "middle", fill: ink }));
  }

  const dims = opts.responsive
    ? ""
    : opts.pixelSize
      ? ` width="${opts.pixelSize.w}" height="${opts.pixelSize.h}"`
      : ` width="${W}" height="${H}"`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}"${dims}>` +
    parts.join("") +
    `</svg>`
  );
}

/* ---------- Shirt mockup (preview only, never printed) ---------- */

export function buildMockupSVG(d: Design): string {
  const shirt = SHIRT_COLORS[d.shirt];
  const design = buildDesignSVG(d, { responsive: true });
  // Print area 15.6" x 19.3" on a ~20" wide body → 22 units per inch in this mockup
  const pa = { x: 332, y: 258, w: 336, h: 415 };
  const shade = shirt.dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)";
  const seam = shirt.dark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.12)";
  const body =
    "M262 120 L110 300 L165 395 L285 335 L285 1040 L715 1040 L715 335 L835 395 L890 300 L738 120 " +
    "L585 120 C570 180 535 205 500 205 C465 205 430 180 415 120 Z";
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="95 105 810 950">` +
    `<defs><clipPath id="body"><path d="${body}"/></clipPath></defs>` +
    `<path d="${body}" fill="${shirt.hex}"/>` +
    // soft shading on sleeves and side folds
    `<g clip-path="url(#body)">` +
    `<path d="M110 300 L165 395 L285 335 L262 120 Z" fill="${shade}"/>` +
    `<path d="M890 300 L835 395 L715 335 L738 120 Z" fill="${shade}"/>` +
    `<rect x="285" y="335" width="22" height="705" fill="${shade}"/>` +
    `<rect x="693" y="335" width="22" height="705" fill="${shade}"/>` +
    `</g>` +
    // collar ribbing and hems
    `<path d="M415 120 C430 190 465 220 500 220 C535 220 570 190 585 120" fill="none" stroke="${seam}" stroke-width="7"/>` +
    `<path d="M285 1026 L715 1026" stroke="${seam}" stroke-width="3"/>` +
    `<path d="M170 388 L285 330 M830 388 L715 330" stroke="${seam}" stroke-width="3"/>` +
    `<svg x="${pa.x}" y="${pa.y}" width="${pa.w}" height="${pa.h}" viewBox="0 0 ${CANVAS.w} ${CANVAS.h}">${design.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "")}</svg>` +
    `</svg>`
  );
}
