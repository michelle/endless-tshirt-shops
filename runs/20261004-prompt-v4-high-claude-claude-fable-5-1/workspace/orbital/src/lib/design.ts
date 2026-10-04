import { solarSystemOn, type PlanetId, type PlanetPosition } from "./astro";
import { PRINT_HEIGHT_PX, PRINT_WIDTH_PX, shirtById } from "./catalog";

export type PaletteId = "auto" | "chalk" | "ink" | "gold" | "solar";
export type DateFormat = "us" | "intl" | "num";

export type Design = {
  v: 1;
  /** ISO date YYYY-MM-DD, 1800-01-01 .. 2050-12-31 */
  date: string;
  /** Customer caption, max 40 chars, may be empty */
  cap: string;
  pal: PaletteId;
  /** Shirt colour id from catalog */
  shirt: string;
  pluto: boolean;
  df: DateFormat;
};

export const CAPTION_MAX = 40;
export const DATE_MIN = "1800-01-01";
export const DATE_MAX = "2050-12-31";

export const PALETTES: { id: PaletteId; label: string; hint: string }[] = [
  { id: "auto", label: "Auto", hint: "Chalk on dark shirts, ink on light shirts" },
  { id: "chalk", label: "Chalk", hint: "Warm white, one colour" },
  { id: "ink", label: "Ink", hint: "Near-black, one colour" },
  { id: "gold", label: "Gold", hint: "Antique gold, one colour" },
  { id: "solar", label: "Solar", hint: "Each planet in its natural colour" },
];

export const DATE_FORMATS: { id: DateFormat; label: string; example: string }[] = [
  { id: "us", label: "US", example: "February 14, 2019" },
  { id: "intl", label: "International", example: "14 February 2019" },
  { id: "num", label: "Numeric", example: "14 · 02 · 2019" },
];

export function defaultDesign(): Design {
  return { v: 1, date: "1994-06-21", cap: "the day you were born", pal: "auto", shirt: "black", pluto: true, df: "us" };
}

/* ---------------- encoding ---------------- */

function b64urlEncode(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  const b64 = typeof btoa === "function" ? btoa(bin) : Buffer.from(bin, "binary").toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlDecode(s: string): string {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  const bin = typeof atob === "function" ? atob(b64) : Buffer.from(b64, "base64").toString("binary");
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeDesign(d: Design): string {
  return b64urlEncode(JSON.stringify(sanitizeDesign(d)));
}

export function decodeDesign(s: string): Design {
  try {
    return sanitizeDesign(JSON.parse(b64urlDecode(s)));
  } catch {
    return defaultDesign();
  }
}

export function isValidDate(s: unknown): s is string {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return false;
  return s >= DATE_MIN && s <= DATE_MAX;
}

export function sanitizeCaption(c: unknown): string {
  if (typeof c !== "string") return "";
  // strip control chars, collapse whitespace, clamp length
  return c.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, CAPTION_MAX);
}

export function sanitizeDesign(raw: unknown): Design {
  const def = defaultDesign();
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const pal = PALETTES.some((p) => p.id === r.pal) ? (r.pal as PaletteId) : def.pal;
  const df = DATE_FORMATS.some((f) => f.id === r.df) ? (r.df as DateFormat) : def.df;
  return {
    v: 1,
    date: isValidDate(r.date) ? r.date : def.date,
    cap: sanitizeCaption(r.cap),
    pal,
    shirt: shirtById(typeof r.shirt === "string" ? r.shirt : "").id,
    pluto: r.pluto === undefined ? def.pluto : Boolean(r.pluto),
    df,
  };
}

/* ---------------- formatting ---------------- */

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function formatDate(iso: string, df: DateFormat): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (df === "intl") return `${d} ${MONTHS[m - 1]} ${y}`;
  if (df === "num") return `${String(d).padStart(2, "0")} · ${String(m).padStart(2, "0")} · ${y}`;
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/* ---------------- palette ---------------- */

type Ink = {
  line: string; // orbits, rings, text
  sun: string;
  planets: Record<PlanetId, string>;
};

const SOLAR_PLANETS: Record<PlanetId, string> = {
  mercury: "#B8B1A5", venus: "#E9CFA0", earth: "#4C8FD9", mars: "#D7603A",
  jupiter: "#D9A26A", saturn: "#E5C57C", uranus: "#8ED2D9", neptune: "#4B6EE0", pluto: "#B3A598",
};

export function resolvePalette(d: Design): { id: Exclude<PaletteId, "auto">; ink: Ink } {
  const shirt = shirtById(d.shirt);
  const mono = (c: string): Ink => ({
    line: c, sun: c,
    planets: { mercury: c, venus: c, earth: c, mars: c, jupiter: c, saturn: c, uranus: c, neptune: c, pluto: c },
  });
  const CHALK = "#F4F0E6";
  const INK = "#17171C";
  const GOLD = "#D9B462";
  let id: Exclude<PaletteId, "auto"> = d.pal === "auto" ? (shirt.light ? "ink" : "chalk") : d.pal;
  // Gold on light shirts is low-contrast; keep it legal but it's the customer's call.
  if (id === "chalk") return { id, ink: mono(CHALK) };
  if (id === "ink") return { id, ink: mono(INK) };
  if (id === "gold") return { id, ink: { ...mono(GOLD), sun: "#F0CB74" } };
  // solar
  const line = shirt.light ? INK : CHALK;
  id = "solar";
  return { id, ink: { line, sun: "#F5B335", planets: SOLAR_PLANETS } };
}

/* ---------------- geometry ---------------- */

const W = PRINT_WIDTH_PX;
const H = PRINT_HEIGHT_PX;
const CX = W / 2;
const CY = 2540;
const R_MIN = 330;
const R_MAX = 2090;
const ORBIT_STROKE = 9; // ~0.76 mm at 300 dpi; safe for DTG
const PLANET_RADIUS: Record<PlanetId, number> = {
  mercury: 27, venus: 42, earth: 46, mars: 34, jupiter: 96, saturn: 80, uranus: 60, neptune: 58, pluto: 21,
};

export type Placed = PlanetPosition & { r: number; x: number; y: number };

export function layoutPlanets(positions: PlanetPosition[]): Placed[] {
  const n = positions.length;
  const la0 = Math.log(positions[0].a);
  const la1 = Math.log(positions[n - 1].a);
  return positions.map((p, i) => {
    const tEven = i / (n - 1);
    const tLog = (Math.log(p.a) - la0) / (la1 - la0);
    const t = 0.55 * tEven + 0.45 * tLog;
    const r = R_MIN + (R_MAX - R_MIN) * t;
    const th = (p.longitude * Math.PI) / 180;
    return { ...p, r, x: CX + r * Math.cos(th), y: CY - r * Math.sin(th) };
  });
}

/* ---------------- SVG ---------------- */

export type SvgOptions = {
  /** include @font-face rules pointing at /fonts (for browsers). Print rendering supplies fonts natively. */
  webFonts?: boolean;
  /** draw the shirt colour behind the art (preview only; print file is transparent) */
  background?: string;
};

const f2 = (n: number) => n.toFixed(1);

export function buildDesignSvg(d: Design, opts: SvgOptions = {}): string {
  const design = sanitizeDesign(d);
  const { ink } = resolvePalette(design);
  const placed = layoutPlanets(solarSystemOn(design.date, design.pluto));

  const parts: string[] = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">`);
  if (opts.webFonts) {
    parts.push(`<defs><style>
@font-face{font-family:'Space Grotesk';font-weight:400;src:url('/fonts/SpaceGrotesk-Regular.ttf') format('truetype')}
@font-face{font-family:'Space Grotesk';font-weight:500;src:url('/fonts/SpaceGrotesk-Medium.ttf') format('truetype')}
@font-face{font-family:'Instrument Serif';font-style:italic;src:url('/fonts/InstrumentSerif-Italic.ttf') format('truetype')}
</style></defs>`);
  }
  if (opts.background) parts.push(`<rect width="${W}" height="${H}" fill="${opts.background}"/>`);

  // Orbits
  parts.push(`<g fill="none" stroke="${ink.line}" stroke-width="${ORBIT_STROKE}">`);
  for (const p of placed) parts.push(`<circle cx="${f2(CX)}" cy="${f2(CY)}" r="${f2(p.r)}"/>`);
  parts.push(`</g>`);

  // Sun
  parts.push(`<circle cx="${f2(CX)}" cy="${f2(CY)}" r="86" fill="${ink.sun}"/>`);
  parts.push(`<circle cx="${f2(CX)}" cy="${f2(CY)}" r="134" fill="none" stroke="${ink.sun}" stroke-width="7"/>`);
  // Sun rays: 12 short ticks
  parts.push(`<g stroke="${ink.sun}" stroke-width="7" stroke-linecap="round">`);
  for (let i = 0; i < 12; i++) {
    const a = (i * 30 * Math.PI) / 180;
    const r1 = 166, r2 = 196;
    parts.push(`<line x1="${f2(CX + r1 * Math.cos(a))}" y1="${f2(CY + r1 * Math.sin(a))}" x2="${f2(CX + r2 * Math.cos(a))}" y2="${f2(CY + r2 * Math.sin(a))}"/>`);
  }
  parts.push(`</g>`);

  // Planets
  for (const p of placed) {
    const pr = PLANET_RADIUS[p.id];
    const c = ink.planets[p.id];
    // knock out the orbit line behind the planet so the dot reads cleanly (transparent gap)
    // -> done by drawing a slightly larger "halo" in the design's negative isn't possible on transparent
    //    backgrounds, so instead we simply draw the dot over the line; at this size that reads fine.
    if (p.id === "saturn") {
      const tilt = -22;
      parts.push(`<g transform="translate(${f2(p.x)} ${f2(p.y)}) rotate(${tilt})">`);
      parts.push(`<circle r="${pr}" fill="${c}"/>`);
      parts.push(`<ellipse rx="${pr * 1.95}" ry="${pr * 0.62}" fill="none" stroke="${c}" stroke-width="11"/>`);
      parts.push(`</g>`);
    } else if (p.id === "earth") {
      parts.push(`<circle cx="${f2(p.x)}" cy="${f2(p.y)}" r="${pr}" fill="${c}"/>`);
      parts.push(`<circle cx="${f2(p.x)}" cy="${f2(p.y)}" r="${pr + 34}" fill="none" stroke="${ink.line}" stroke-width="8"/>`);
    } else {
      parts.push(`<circle cx="${f2(p.x)}" cy="${f2(p.y)}" r="${pr}" fill="${c}"/>`);
    }
  }

  // Text block
  const cap = design.cap;
  const dateText = formatDate(design.date, design.df).toUpperCase();
  const sub = "THE SOLAR SYSTEM · HELIOCENTRIC · SEEN FROM ABOVE";
  let y = 4880;
  if (cap) {
    const size = Math.min(210, Math.floor(210 * 26 / Math.max(cap.length, 26)));
    parts.push(`<text x="${f2(CX)}" y="${y}" text-anchor="middle" font-family="'Instrument Serif', serif" font-style="italic" font-size="${size}" fill="${ink.line}">${esc(cap)}</text>`);
    y += 150;
    parts.push(`<line x1="${f2(CX - 150)}" y1="${y}" x2="${f2(CX + 150)}" y2="${y}" stroke="${ink.line}" stroke-width="6"/>`);
    y += 190;
  } else {
    y += 60;
  }
  parts.push(`<text x="${f2(CX)}" y="${y}" text-anchor="middle" font-family="'Space Grotesk', sans-serif" font-weight="500" font-size="128" letter-spacing="26" fill="${ink.line}">${esc(dateText)}</text>`);
  y += 150;
  parts.push(`<text x="${f2(CX)}" y="${y}" text-anchor="middle" font-family="'Space Grotesk', sans-serif" font-weight="400" font-size="60" letter-spacing="16" fill="${ink.line}">${esc(sub)}</text>`);

  parts.push(`</svg>`);
  return parts.join("\n");
}

/** Human readable summary used in Stripe line items and order pages. */
export function describeDesign(d: Design): string {
  const design = sanitizeDesign(d);
  const shirt = shirtById(design.shirt);
  const pal = resolvePalette(design).id;
  const bits = [
    `Solar system on ${formatDate(design.date, design.df)}`,
    design.cap ? `“${design.cap}”` : null,
    `${shirt.label} tee`,
    `${pal} ink`,
    design.pluto ? "with Pluto" : "without Pluto",
  ].filter(Boolean);
  return bits.join(" · ");
}
