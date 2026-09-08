// The design itself: a pure function from customer choices to an SVG string.
// Used in the browser for live preview and on the server to rasterise the print file,
// so what the customer sees is exactly what gets printed.

import { PLANET_NAMES, PLANET_ORDER, solarSystemOn, type PlanetId } from "./astro";
import { ACCENTS, LAYOUTS, PRINT_HEIGHT_PX, PRINT_WIDTH_PX, SIZES, TEE_COLORS, accent, teeColor, type Layout, type Size } from "./catalog";

export interface Design {
  date: string;      // YYYY-MM-DD
  caption: string;   // up to 30 chars, printed above the date
  tee: string;       // Prodigi colour id
  accent: string;    // accent id (Earth highlight)
  layout: Layout;    // "full" = all planets, "inner" = Mercury–Mars
  pluto: boolean;    // include Pluto
  labels: boolean;   // print planet names
}

export interface Order extends Design {
  size: Size;
  qty: number;
}

export const CAPTION_MAX = 30;

export const DEFAULT_DESIGN: Design = {
  date: "1994-03-14",
  caption: "The day it all began",
  tee: "black",
  accent: "sky",
  layout: "full",
  pluto: false,
  labels: true,
};

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseDate(s: string): { y: number; m: number; d: number } | null {
  const m = DATE_RE.exec(s);
  if (!m) return null;
  const y = +m[1], mo = +m[2], d = +m[3];
  if (y < 1000 || y > 2999 || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  return { y, m: mo, d };
}

/** Coerce arbitrary input into a valid Design (falls back to defaults per field). */
export function sanitizeDesign(input: unknown): Design {
  const o = (typeof input === "object" && input) ? (input as Record<string, unknown>) : {};
  const date = typeof o.date === "string" && parseDate(o.date) ? o.date : DEFAULT_DESIGN.date;
  const captionRaw = typeof o.caption === "string" ? o.caption : DEFAULT_DESIGN.caption;
  const caption = captionRaw.replace(/[\r\n\t]/g, " ").replace(/\s+/g, " ").trim().slice(0, CAPTION_MAX);
  const tee = TEE_COLORS.some((c) => c.id === o.tee) ? (o.tee as string) : DEFAULT_DESIGN.tee;
  const acc = ACCENTS.some((a) => a.id === o.accent) ? (o.accent as string) : DEFAULT_DESIGN.accent;
  const layout = LAYOUTS.includes(o.layout as Layout) ? (o.layout as Layout) : DEFAULT_DESIGN.layout;
  return { date, caption, tee, accent: acc, layout, pluto: o.pluto === true || o.pluto === "1", labels: !(o.labels === false || o.labels === "0") };
}

export function sanitizeOrder(input: unknown): Order {
  const o = (typeof input === "object" && input) ? (input as Record<string, unknown>) : {};
  const size = SIZES.includes(o.size as Size) ? (o.size as Size) : "m";
  const qtyN = Number(o.qty);
  const qty = Number.isInteger(qtyN) ? Math.min(5, Math.max(1, qtyN)) : 1;
  return { ...sanitizeDesign(input), size, qty };
}

// Compact, URL-safe encoding so a design can live in a query string or Stripe metadata.
export function encodeDesign(d: Design): string {
  const json = JSON.stringify({ d: d.date, c: d.caption, t: d.tee, a: d.accent, l: d.layout, p: d.pluto ? 1 : 0, n: d.labels ? 1 : 0 });
  const bytes = new TextEncoder().encode(json);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  const b64 = typeof btoa === "function" ? btoa(bin) : Buffer.from(bin, "binary").toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeDesign(s: string | null | undefined): Design {
  if (!s) return DEFAULT_DESIGN;
  try {
    const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (s.length % 4)) % 4);
    const bin = typeof atob === "function" ? atob(b64) : Buffer.from(b64, "base64").toString("binary");
    const bytes = Uint8Array.from(bin, (ch) => ch.charCodeAt(0));
    const j = JSON.parse(new TextDecoder().decode(bytes));
    return sanitizeDesign({ date: j.d, caption: j.c, tee: j.t, accent: j.a, layout: j.l, pluto: j.p === 1, labels: j.n !== 0 });
  } catch {
    return DEFAULT_DESIGN;
  }
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function formatDate(date: string): string {
  const p = parseDate(date);
  if (!p) return date;
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  return `${String(p.d).padStart(2, "0")} ${months[p.m - 1]} ${p.y}`;
}

// Visual radius (in px on the print canvas) of each planet's dot, roughly ordered by real size.
const DOT: Record<PlanetId, number> = {
  mercury: 22, venus: 36, earth: 38, mars: 28, jupiter: 88, saturn: 74, uranus: 54, neptune: 52, pluto: 18,
};

export interface DesignPalette { ink: string; sun: string; accent: string; faint: string }

export function paletteFor(d: Design): DesignPalette {
  const tc = teeColor(d.tee);
  const ac = accent(d.accent);
  return tc.dark
    ? { ink: "#f5f2ea", sun: "#f3ba4c", accent: ac.onDark, faint: "#f5f2ea" }
    : { ink: "#17181c", sun: "#d99a1e", accent: ac.onLight, faint: "#17181c" };
}

/**
 * Build the print-ready SVG. Canvas = Prodigi front print area (4677×5881 px @ 300 dpi),
 * transparent background so DTG prints only the ink.
 */
export function designSvg(input: Design, opts: { fixedSize?: boolean } = {}): string {
  const d = sanitizeDesign(input);
  const W = PRINT_WIDTH_PX, H = PRINT_HEIGHT_PX;
  const pal = paletteFor(d);
  const p = parseDate(d.date)!;

  const ids: PlanetId[] = d.layout === "inner"
    ? ["mercury", "venus", "earth", "mars"]
    : PLANET_ORDER.filter((id) => id !== "pluto" || d.pluto);
  const planets = solarSystemOn(p.y, p.m, p.d, ids);

  const cx = W / 2, cy = 2330;
  const rMin = d.layout === "inner" ? 560 : 330;
  const rMax = 1960;
  const aMin = planets[0].a, aMax = planets[planets.length - 1].a;
  const pow = 0.42;
  const radius = (a: number) => rMin + (rMax - rMin) * ((Math.pow(a, pow) - Math.pow(aMin, pow)) / (Math.pow(aMax, pow) - Math.pow(aMin, pow) || 1));

  const parts: string[] = [];
  const sizeAttr = opts.fixedSize ? ` width="${W}" height="${H}"` : ` width="100%" height="100%"`;
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}"${sizeAttr} style="display:block">`);
  parts.push(`<style>text{font-family:'Space Mono',monospace}</style>`);

  // Orbits
  for (const pl of planets) {
    const r = radius(pl.a);
    parts.push(`<circle cx="${cx}" cy="${cy}" r="${r.toFixed(1)}" fill="none" stroke="${pal.faint}" stroke-width="5" opacity="0.55"/>`);
  }
  // Ecliptic reference: tick at 0° (direction of the vernal equinox), a quiet astronomer's touch
  parts.push(`<line x1="${cx + rMax + 40}" y1="${cy}" x2="${cx + rMax + 130}" y2="${cy}" stroke="${pal.ink}" stroke-width="6" stroke-linecap="round"/>`);
  parts.push(`<text x="${cx + rMax + 160}" y="${cy + 22}" font-size="58" fill="${pal.ink}" opacity="0.8">0°</text>`);

  // Sun
  parts.push(`<circle cx="${cx}" cy="${cy}" r="96" fill="${pal.sun}"/>`);
  parts.push(`<circle cx="${cx}" cy="${cy}" r="150" fill="none" stroke="${pal.sun}" stroke-width="6" opacity="0.5"/>`);

  // Planets at their true heliocentric longitude (ecliptic north up: 0° to the right, counter-clockwise)
  type Box = { x1: number; y1: number; x2: number; y2: number };
  const overlaps = (a: Box, b: Box) => a.x1 < b.x2 && a.x2 > b.x1 && a.y1 < b.y2 && a.y2 > b.y1;
  const placed: Box[] = [];
  const LABEL_SIZE = 64, LABEL_LS = 6;
  const labelWidth = (t: string) => t.length * LABEL_SIZE * 0.6 + (t.length - 1) * LABEL_LS;
  const bodies = planets.map((pl) => {
    const r = radius(pl.a);
    const th = pl.longitude * Math.PI / 180;
    return { pl, r, th, x: cx + r * Math.cos(th), y: cy - r * Math.sin(th), dot: DOT[pl.id] };
  });
  for (const b of bodies) placed.push({ x1: b.x - b.dot - 40, y1: b.y - b.dot - 40, x2: b.x + b.dot + 40, y2: b.y + b.dot + 40 });
  placed.push({ x1: cx - 170, y1: cy - 170, x2: cx + 170, y2: cy + 170 }); // the Sun

  for (const { pl, x, y, th, dot } of bodies) {
    const fill = pl.id === "earth" ? pal.accent : pal.ink;
    if (pl.id === "saturn") {
      const tilt = -22;
      parts.push(`<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${dot * 1.9}" ry="${dot * 0.55}" fill="none" stroke="${pal.ink}" stroke-width="12" transform="rotate(${tilt} ${x.toFixed(1)} ${y.toFixed(1)})"/>`);
    }
    parts.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${dot}" fill="${fill}"/>`);
    if (pl.id === "earth") {
      parts.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${dot + 34}" fill="none" stroke="${pal.accent}" stroke-width="7"/>`);
    }
    if (d.labels) {
      const text = PLANET_NAMES[pl.id].toUpperCase();
      const w = labelWidth(text), h = LABEL_SIZE;
      const off = dot + 60;
      // Candidate anchor points: outward from the Sun, then inward, then along the tangent either way.
      const dirs = [th, th + Math.PI, th + Math.PI / 2, th - Math.PI / 2, th + Math.PI / 4, th - Math.PI / 4, th + 3 * Math.PI / 4, th - 3 * Math.PI / 4];
      let chosen: { lx: number; ly: number; anchor: string; box: Box } | null = null;
      for (const ang of dirs) {
        const c = Math.cos(ang), sn = Math.sin(ang);
        const lx = x + off * c, ly = y - off * sn;
        const anchor = c > 0.25 ? "start" : c < -0.25 ? "end" : "middle";
        const dy = sn > 0.25 ? -10 : sn < -0.25 ? 60 : 24;
        const x1 = anchor === "start" ? lx : anchor === "end" ? lx - w : lx - w / 2;
        const box: Box = { x1, y1: ly + dy - h, x2: x1 + w, y2: ly + dy + 10 };
        const clash = placed.some((p) => overlaps(p, box)) || box.x1 < 120 || box.x2 > W - 120;
        if (!clash || ang === dirs[dirs.length - 1]) { chosen = { lx, ly: ly + dy, anchor, box }; if (!clash) break; }
      }
      if (chosen) {
        placed.push(chosen.box);
        parts.push(`<text x="${chosen.lx.toFixed(1)}" y="${chosen.ly.toFixed(1)}" font-size="${LABEL_SIZE}" letter-spacing="${LABEL_LS}" text-anchor="${chosen.anchor}" fill="${pal.ink}">${text}</text>`);
      }
    }
  }

  // Caption block
  const capY = 4790;
  if (d.caption) {
    parts.push(`<text x="${cx}" y="${capY}" font-size="150" font-weight="700" letter-spacing="26" text-anchor="middle" fill="${pal.ink}">${esc(d.caption.toUpperCase())}</text>`);
  }
  parts.push(`<text x="${cx}" y="${capY + 230}" font-size="118" letter-spacing="34" text-anchor="middle" fill="${pal.ink}">${formatDate(d.date)}</text>`);
  const lonList = planets.map((pl) => `${PLANET_NAMES[pl.id].slice(0, 2).toUpperCase()} ${Math.round(pl.longitude)}°`).join("  ·  ");
  parts.push(`<text x="${cx}" y="${capY + 400}" font-size="52" letter-spacing="8" text-anchor="middle" fill="${pal.ink}" opacity="0.75">${esc(lonList)}</text>`);
  parts.push(`<text x="${cx}" y="${capY + 500}" font-size="46" letter-spacing="10" text-anchor="middle" fill="${pal.ink}" opacity="0.6">HELIOCENTRIC ECLIPTIC LONGITUDE · 12:00 UTC</text>`);

  parts.push(`</svg>`);
  return parts.join("");
}

export function designSummary(d: Design): string {
  const tc = teeColor(d.tee);
  return `${formatDate(d.date)} · ${tc.label} tee · ${d.layout === "inner" ? "inner planets" : d.pluto ? "9 planets" : "8 planets"}`;
}
