// 4000 Fridays — deterministic life-calendar artwork.
//
// The same pure functions run in the browser (live preview) and on the
// server (print file), so what the customer sees is exactly what gets
// printed. The timeline is frozen at an explicit "as of" date so the
// print file is byte-stable from purchase to fulfilment.

import {
  ACCENTS,
  getAccent,
  getShirt,
  LIFESPAN_YEARS,
  PRINT_HEIGHT_PX,
  PRINT_WIDTH_PX,
  SHIRTS,
  SIZES,
  WEEKS_PER_YEAR,
} from "./config";

export interface DesignParams {
  /** 1–24 chars, shown as the headline. */
  name: string;
  /** Birth date, YYYY-MM-DD, 1900-01-01 … today. */
  born: string;
  /** Optional bottom caption, 0–48 chars. */
  caption: string;
  /** Garment colour id. */
  shirt: string;
  /** Garment size id. */
  size: string;
  /** Accent colour id. */
  accent: string;
  /** Copies, 1–5. */
  qty: number;
  /**
   * Timeline freeze date (YYYY-MM-DD). Set at checkout time on the server
   * so preview, order metadata and print file all agree. Defaults to today
   * for live previews.
   */
  asof: string;
}

export interface WeekStats {
  /** Full weeks completed since birth. */
  lived: number;
  /** Week currently in progress (1-based), or 0 when none. */
  current: number;
  /** Weeks remaining to LIFESPAN_YEARS (can be negative). */
  remaining: number;
  ageYears: number;
}

// ------------------------------------------------------------- validation ---

const NAME_MAX = 24;
const CAPTION_MAX = 48;
const MIN_BORN = "1900-01-01";

function isIsoDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + "T00:00:00Z");
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function clean(s: unknown, max: number): string {
  return String(s ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

/**
 * Validate raw (client) input into a DesignParams. `asof` is always set by
 * the server; here it defaults to today so previews render.
 */
export function parseDesignInput(raw: Record<string, unknown>): DesignParams | null {
  if (!raw || typeof raw !== "object") return null;
  const name = clean(raw.name, NAME_MAX);
  if (name.length < 1) return null;

  const born = clean(raw.born, 10);
  if (!isIsoDate(born)) return null;
  const today = utcToday();
  if (born < MIN_BORN || born > today) return null;

  const asofRaw = clean(raw.asof, 10);
  const asof = asofRaw && isIsoDate(asofRaw) ? asofRaw : today;
  if (born > asof) return null;

  const shirt = clean(raw.shirt, 12);
  if (!SHIRTS.some((s) => s.id === shirt)) return null;

  const size = clean(raw.size, 4).toLowerCase();
  if (!SIZES.includes(size as (typeof SIZES)[number])) return null;

  const accent = clean(raw.accent, 12);
  if (!ACCENTS.some((a) => a.id === accent)) return null;

  const qty = Number(raw.qty);
  if (!Number.isInteger(qty) || qty < 1 || qty > 5) return null;

  return {
    name,
    born,
    caption: clean(raw.caption, CAPTION_MAX),
    shirt,
    size,
    accent,
    qty,
    asof,
  };
}

/**
 * Decode the compact form carried in Stripe metadata / signed print URLs.
 * Keys: n name, b born, c caption, s shirt, z size, a accent, q qty, w asof.
 */
export function decodeDesign(compact: unknown): DesignParams | null {
  if (!compact || typeof compact !== "object") return null;
  const c = compact as Record<string, unknown>;
  return parseDesignInput({
    name: c.n,
    born: c.b,
    caption: c.c,
    shirt: c.s,
    size: c.z,
    accent: c.a,
    qty: c.q,
    asof: c.w,
  });
}

export function encodeDesign(d: DesignParams): Record<string, string | number> {
  return { n: d.name, b: d.born, c: d.caption, s: d.shirt, z: d.size, a: d.accent, q: d.qty, w: d.asof };
}

// ------------------------------------------------------------- week maths ---

const DAY_MS = 86_400_000;

export function weekStats(design: DesignParams): WeekStats {
  const born = new Date(design.born + "T00:00:00Z").getTime();
  const asof = new Date(design.asof + "T00:00:00Z").getTime();
  const days = Math.max(0, Math.floor((asof - born) / DAY_MS));
  const lived = Math.floor(days / 7);
  const total = LIFESPAN_YEARS * WEEKS_PER_YEAR;
  const ageYears = Math.floor(days / 365.2425);
  return {
    lived: Math.min(lived, total),
    current: lived < total ? lived + 1 : 0,
    remaining: total - lived,
    ageYears,
  };
}

/** Slug used for local preview filenames. */
export function printFileName(d: DesignParams): string {
  const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return `life-calendar-${slug(d.name)}-${d.born}-${d.shirt}-${d.size}-${d.accent}.png`;
}

// ------------------------------------------------------------------ SVG -----

const MONTHS = [
  "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY",
  "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
];

function fmtBorn(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

const nf = new Intl.NumberFormat("en-US");

export function renderDesignSVG(design: DesignParams): string {
  const shirt = getShirt(design.shirt) ?? getShirt("black")!;
  const accent = getAccent(design.accent) ?? getAccent("ember")!;

  const ink = shirt.dark ? "#f2ede2" : "#1b1c21";
  const W = PRINT_WIDTH_PX;
  const H = PRINT_HEIGHT_PX;
  const MX = 380; // side margin
  const CW = W - MX * 2; // content width

  const stats = weekStats(design);
  const name = design.name.toUpperCase();
  const caption = design.caption.toUpperCase();

  // ---- header ---------------------------------------------------------------
  // label
  const labelY = 460;
  const labelFs = 96;
  const labelLs = 44;
  const labelText = "LIFE CALENDAR";
  const labelW = labelText.length * (labelFs * 0.62) + (labelText.length - 1) * labelLs;
  // name (Archivo Black: uppercase caps average ~0.78em advance)
  const nameFs = Math.max(150, Math.min(400, Math.floor(CW / (name.length * 0.78))));
  const nameY = 460 + 120 + nameFs * 0.82; // baseline
  // stats line
  const statsFs = 104;
  const statsY = nameY + 210;
  const stats1 = `BORN ${fmtBorn(design.born)}  ·  ${nf.format(stats.lived)} WEEKS LIVED`;
  const stats2 =
    stats.current > 0
      ? `WEEK ${nf.format(stats.current)} IN PROGRESS  ·  ${nf.format(Math.max(0, stats.remaining))} TO COME`
      : `${nf.format(stats.lived)} OF ${nf.format(LIFESPAN_YEARS * WEEKS_PER_YEAR)} WEEKS`;
  const stats2Y = statsY + 150;
  const ruleY = stats2Y + 130;

  // ---- grid -----------------------------------------------------------------
  const gridTop = ruleY + 130;
  // footer
  const capFs = 122;
  const capY = H - 330;
  const brandFs = 74;
  const brandY = H - 150;
  const gridBottom = capY - 210;

  const rows = LIFESPAN_YEARS; // one row per year of life
  const cols = WEEKS_PER_YEAR; // one column per week of the year
  const gridH = gridBottom - gridTop;
  const pitchV = gridH / rows; // vertical pitch (the binding constraint)
  const pitchH = Math.min(CW / cols, pitchV * 1.3); // gentle horizontal stretch
  const gridW = pitchH * cols;
  const gridHActual = pitchV * rows;
  const gx0 = (W - gridW) / 2;
  const gy0 = gridTop + (gridH - gridHActual) / 2;
  const pitchMin = Math.min(pitchV, pitchH);

  const dotR = pitchMin * 0.33; // lived week
  const dotRFuture = pitchMin * 0.12; // week to come
  // ring around the week in progress
  const curIdx = stats.current - 1; // 0-based week index in progress
  const curRow = curIdx >= 0 ? Math.floor(curIdx / cols) : -1;
  const curCol = curIdx >= 0 ? curIdx % cols : -1;

  const dotX = (c: number) => gx0 + c * pitchH + pitchH / 2;
  const dotY = (r: number) => gy0 + r * pitchV + pitchV / 2;

  const parts: string[] = [];

  // Lived dots, one <circle> per week — grouped, ink fill.
  parts.push(`<g fill="${ink}">`);
  for (let w = 0; w < stats.lived; w++) {
    if (w === curIdx) continue; // accent dot drawn separately
    const r = Math.floor(w / cols);
    const c = w % cols;
    parts.push(
      `<circle cx="${dotX(c).toFixed(1)}" cy="${dotY(r).toFixed(1)}" r="${dotR.toFixed(1)}"/>`
    );
  }
  parts.push(`</g>`);

  // Future weeks — small, faint.
  parts.push(`<g fill="${ink}" opacity="0.38">`);
  for (let w = stats.lived; w < rows * cols; w++) {
    const r = Math.floor(w / cols);
    const c = w % cols;
    parts.push(
      `<circle cx="${dotX(c).toFixed(1)}" cy="${dotY(r).toFixed(1)}" r="${dotRFuture.toFixed(1)}"/>`
    );
  }
  parts.push(`</g>`);

  // The week in progress — accent ring + dot.
  if (curIdx >= 0) {
    const cx = dotX(curCol);
    const cyy = dotY(curRow);
    parts.push(
      `<circle cx="${cx.toFixed(1)}" cy="${cyy.toFixed(1)}" r="${(pitchMin * 0.52).toFixed(1)}" fill="none" stroke="${accent.hex}" stroke-width="${Math.max(6, pitchMin * 0.14).toFixed(1)}"/>`,
      `<circle cx="${cx.toFixed(1)}" cy="${cyy.toFixed(1)}" r="${dotR.toFixed(1)}" fill="${accent.hex}"/>`
    );
  }

  // Decade labels down the left edge (right-aligned outside the grid).
  parts.push(`<g font-family="Space Mono, monospace" font-size="70" fill="${ink}" opacity="0.6" text-anchor="end">`);
  for (let age = 0; age <= rows; age += 10) {
    const y = dotY(age) + 24;
    const x = gx0 - 110;
    parts.push(`<text x="${x.toFixed(1)}" y="${y.toFixed(1)}">AGE ${age}</text>`);
  }
  parts.push(`</g>`);

  // Accent tick + header label.
  parts.push(
    `<rect x="${(W - labelW) / 2 < MX ? MX : (W - labelW) / 2}" y="${labelY - 96}" width="240" height="14" fill="${accent.hex}"/>`,
    `<text x="${W / 2}" y="${labelY}" font-family="Space Mono, monospace" font-size="${labelFs}" letter-spacing="${labelLs}" fill="${ink}" opacity="0.72" text-anchor="middle">${esc(labelText)}</text>`
  );

  // Name.
  parts.push(
    `<text x="${W / 2}" y="${nameY.toFixed(1)}" font-family="Archivo Black, sans-serif" font-size="${nameFs}" fill="${ink}" text-anchor="middle">${esc(name)}</text>`
  );

  // Stats lines.
  parts.push(
    `<g font-family="Space Mono, monospace" fill="${ink}" text-anchor="middle">`,
    `<text x="${W / 2}" y="${statsY.toFixed(1)}" font-size="${statsFs}">${esc(stats1)}</text>`,
    `<text x="${W / 2}" y="${stats2Y.toFixed(1)}" font-size="${statsFs}" opacity="0.85">${esc(stats2)}</text>`,
    `</g>`
  );

  // Rule between header and grid.
  parts.push(
    `<line x1="${MX}" y1="${ruleY.toFixed(1)}" x2="${W - MX}" y2="${ruleY.toFixed(1)}" stroke="${ink}" stroke-width="4" opacity="0.55"/>`
  );

  // Footer caption + brand mark.
  if (caption) {
    const capLs = 14;
    parts.push(
      `<text x="${W / 2}" y="${capY.toFixed(1)}" font-family="Space Mono, monospace" font-size="${capFs}" letter-spacing="${capLs}" fill="${ink}" opacity="0.9" text-anchor="middle">${esc(caption)}</text>`
    );
  }
  parts.push(
    `<line x1="${MX}" y1="${(capY - 180).toFixed(1)}" x2="${W - MX}" y2="${(capY - 180).toFixed(1)}" stroke="${ink}" stroke-width="4" opacity="0.35"/>`,
    `<text x="${W / 2}" y="${brandY.toFixed(1)}" font-family="Space Mono, monospace" font-size="${brandFs}" letter-spacing="10" fill="${ink}" opacity="0.55" text-anchor="middle">4000FRIDAYS  ·  DTG PRINTED TO ORDER</text>`
  );

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Life calendar for ${esc(name)}">` +
    parts.join("") +
    `</svg>`
  );
}
