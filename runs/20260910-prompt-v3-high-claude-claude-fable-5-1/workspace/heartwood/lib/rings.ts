/**
 * Heartwood ring generator.
 *
 * Pure, deterministic, dependency-free. The same code renders the live preview in
 * the browser and the print-ready file on the server, so what the customer sees is
 * exactly what Prodigi prints.
 */

export type PaletteKey = "oak" | "ember" | "ocean" | "moss" | "aurora" | "ink" | "rose";
export type GrainKey = "fine" | "classic" | "bold";

export type Milestone = { year: number; label: string };

export type Design = {
  name: string;
  born: string; // YYYY-MM-DD
  milestones: Milestone[];
  palette: PaletteKey;
  grain: GrainKey;
  caption?: string;
  asOf: string; // YYYY-MM-DD, freezes the ring count at checkout time
};

export const LIMITS = {
  nameMax: 40,
  captionMax: 40,
  milestoneMax: 6,
  milestoneLabelMax: 24,
  minYear: 1900,
  maxRings: 110,
};

type HSL = [number, number, number];

export type Palette = {
  key: PaletteKey;
  label: string;
  blurb: string;
  light: HSL;
  dark: HSL;
  bark: HSL;
  accent: HSL;
  pith: HSL;
  cracks: boolean;
  /** Aurora cycles hue across rings instead of a fixed light colour. */
  hueSweep?: [number, number];
  /** Preview swatch colours for the UI. */
  swatch: [string, string, string];
};

export const PALETTES: Record<PaletteKey, Palette> = {
  oak: {
    key: "oak", label: "Oak", blurb: "Warm honey wood. The classic.",
    light: [36, 56, 72], dark: [26, 55, 33], bark: [22, 48, 18], accent: [14, 76, 46], pith: [22, 48, 18],
    cracks: true, swatch: ["#e5c497", "#82502a", "#c2431e"],
  },
  ember: {
    key: "ember", label: "Ember", blurb: "Burnt orange and deep red, like a fire's last hour.",
    light: [26, 84, 70], dark: [6, 66, 33], bark: [4, 55, 16], accent: [46, 96, 60], pith: [4, 55, 16],
    cracks: true, swatch: ["#f4b483", "#8c2a1c", "#fbd15a"],
  },
  ocean: {
    key: "ocean", label: "Tide", blurb: "Sea-glass blues with a coral marker.",
    light: [196, 58, 74], dark: [205, 62, 31], bark: [210, 60, 16], accent: [8, 82, 62], pith: [210, 60, 16],
    cracks: false, swatch: ["#98d0e3", "#1e5580", "#f0654a"],
  },
  moss: {
    key: "moss", label: "Moss", blurb: "Forest greens with a marigold marker.",
    light: [96, 40, 72], dark: [110, 40, 28], bark: [120, 40, 15], accent: [42, 88, 58], pith: [120, 40, 15],
    cracks: true, swatch: ["#bcd6a0", "#3f6b2b", "#f0b83a"],
  },
  aurora: {
    key: "aurora", label: "Aurora", blurb: "Every ring a new hue, teal to violet to rose. Made for full-colour DTG.",
    light: [190, 70, 62], dark: [260, 45, 30], bark: [265, 45, 16], accent: [48, 100, 84], pith: [265, 45, 16],
    cracks: false, hueSweep: [185, 345], swatch: ["#3ec7d6", "#7a5cc9", "#ea6fa4"],
  },
  ink: {
    key: "ink", label: "Ink", blurb: "Bone and black. Prints beautifully on any shirt colour.",
    light: [40, 30, 92], dark: [30, 8, 14], bark: [30, 8, 8], accent: [4, 70, 52], pith: [30, 8, 8],
    cracks: false, swatch: ["#f2ede4", "#221e1b", "#d8453b"],
  },
  rose: {
    key: "rose", label: "Rose", blurb: "Blush pinks with a deep-teal marker.",
    light: [345, 70, 84], dark: [335, 55, 40], bark: [330, 45, 18], accent: [182, 45, 40], pith: [330, 45, 18],
    cracks: false, swatch: ["#f7c9d6", "#9d2e5c", "#3a8a8e"],
  },
};

export const GRAINS: Record<GrainKey, { label: string; blurb: string; late: number; jitter: number }> = {
  fine: { label: "Fine", blurb: "Thin, delicate ring lines.", late: 0.14, jitter: 0.10 },
  classic: { label: "Classic", blurb: "Balanced, like a real cross-section.", late: 0.24, jitter: 0.16 },
  bold: { label: "Bold", blurb: "Heavy lines, more organic wobble.", late: 0.36, jitter: 0.22 },
};

// ---------- deterministic helpers ----------

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hsl([h, s, l]: HSL): string {
  const hh = (((h % 360) + 360) % 360) / 360;
  const ss = Math.max(0, Math.min(100, s)) / 100;
  const ll = Math.max(0, Math.min(100, l)) / 100;
  const f = (n: number) => {
    const k = (n + hh * 12) % 12;
    const a = ss * Math.min(ll, 1 - ll);
    const c = ll - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(c * 255).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) =>
    c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === "&" ? "&amp;" : c === "'" ? "&apos;" : "&quot;",
  );
}

export function parseISODate(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || "");
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  if (d.getUTCFullYear() !== +m[1] || d.getUTCMonth() !== +m[2] - 1 || d.getUTCDate() !== +m[3]) return null;
  return d;
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Full years lived between `born` and `asOf`, plus the year in progress. */
export function ringCount(born: string, asOf: string): number {
  const b = parseISODate(born);
  const a = parseISODate(asOf);
  if (!b || !a) return 1;
  let years = a.getUTCFullYear() - b.getUTCFullYear();
  const beforeBirthday =
    a.getUTCMonth() < b.getUTCMonth() ||
    (a.getUTCMonth() === b.getUTCMonth() && a.getUTCDate() < b.getUTCDate());
  if (beforeBirthday) years -= 1;
  return Math.max(1, Math.min(LIMITS.maxRings, years + 1));
}

// ---------- validation ----------

export class DesignError extends Error {}

/** Accepts untrusted input (form state, URL param, token) and returns a clean Design or throws. */
export function parseDesign(input: unknown): Design {
  if (!input || typeof input !== "object") throw new DesignError("Design must be an object.");
  const o = input as Record<string, unknown>;
  const name = String(o.name ?? "").replace(/\s+/g, " ").trim().slice(0, LIMITS.nameMax);
  const born = String(o.born ?? "");
  const bornDate = parseISODate(born);
  if (!bornDate) throw new DesignError("Please enter a valid birth date.");
  const asOfRaw = typeof o.asOf === "string" && parseISODate(o.asOf) ? o.asOf : todayISO();
  const asOf = asOfRaw < born ? born : asOfRaw;
  const bornYear = bornDate.getUTCFullYear();
  const nowYear = new Date().getUTCFullYear();
  if (bornYear < LIMITS.minYear || born > todayISO()) throw new DesignError("Birth date must be between 1900 and today.");

  const rawMs = Array.isArray(o.milestones) ? o.milestones : [];
  const milestones: Milestone[] = [];
  for (const m of rawMs.slice(0, LIMITS.milestoneMax)) {
    if (!m || typeof m !== "object") continue;
    const mm = m as Record<string, unknown>;
    const year = Math.round(Number(mm.year));
    const label = String(mm.label ?? "").replace(/\s+/g, " ").trim().slice(0, LIMITS.milestoneLabelMax);
    if (!Number.isFinite(year) || year < bornYear || year > nowYear) continue;
    if (!label) continue;
    milestones.push({ year, label });
  }
  milestones.sort((a, b) => a.year - b.year);

  const palette = (typeof o.palette === "string" && o.palette in PALETTES ? o.palette : "oak") as PaletteKey;
  const grain = (typeof o.grain === "string" && o.grain in GRAINS ? o.grain : "classic") as GrainKey;
  const caption = String(o.caption ?? "").replace(/\s+/g, " ").trim().slice(0, LIMITS.captionMax) || undefined;

  return { name, born, milestones, palette, grain, caption, asOf };
}

// ---------- geometry ----------

export const VIEW = { w: 1200, h: 1120, cx: 600, cy: 500, R: 400 };

const TAU = Math.PI * 2;
const SAMPLES = 240;

type Boundary = { r: number; pts: string };

function polar(cx: number, cy: number, r: number, deg: number): [number, number] {
  const a = (deg * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

function fmt(n: number): string {
  return (Math.round(n * 10) / 10).toString();
}

export type RenderOptions = {
  /** Whether the shirt behind the design is dark; controls text colour. */
  onDark: boolean;
  /** Emit as a standalone <svg> root (true) or nested <svg> with x/y/width/height (false). */
  standalone?: boolean;
  nested?: { x: number; y: number; width: number; height: number };
  id?: string;
};

export type Rendered = { svg: string; rings: number; bornYear: number };

/** Build the SVG markup for a design. */
export function renderRings(design: Design, opts: RenderOptions): Rendered {
  const { cx, cy, R } = VIEW;
  const pal = PALETTES[design.palette];
  const grain = GRAINS[design.grain];
  const N = ringCount(design.born, design.asOf);
  const bornYear = parseISODate(design.born)!.getUTCFullYear();
  const rnd = mulberry32(hashStr(`${design.name}|${design.born}|${design.palette}|${design.grain}`));

  // Global cross-section shape shared by every ring so they nest without crossing.
  const shapeAmp = [0.040, 0.022, 0.013, 0.008];
  const shapePhase = shapeAmp.map(() => rnd() * TAU);
  const shape = (t: number) =>
    shapeAmp.reduce((acc, a, k) => acc + a * Math.sin((k + 1) * t + shapePhase[k]), 0);

  // Ring widths: young trees grow fast, so early rings are wider, with a little randomness.
  const weights: number[] = [];
  for (let i = 0; i < N; i++) {
    const trend = 1.3 - 0.6 * (i / Math.max(1, N - 1));
    const noise = 0.62 + rnd() * 0.76;
    weights.push(trend * noise);
  }
  // The year in progress is only partly grown.
  if (N > 1) weights[N - 1] *= 0.45;

  const barkW = Math.max(10, Math.min(18, R * 0.035));
  const innerR = R - barkW;
  const pithR = Math.max(6, Math.min(14, innerR / (N + 2)));
  const usable = innerR - pithR;
  const sum = weights.reduce((a, b) => a + b, 0);
  const widths = weights.map((w) => (w / sum) * usable);

  const boundaries: Boundary[] = [];
  let r = pithR;
  for (let i = 0; i < N; i++) {
    r += widths[i];
    const jitterAmp = widths[i] * grain.jitter;
    const jk = [3, 5, 7, 11];
    const jp = jk.map(() => rnd() * TAU);
    const ja = jk.map(() => rnd());
    const jaSum = ja.reduce((a, b) => a + b, 0) || 1;
    const parts: string[] = [];
    for (let s = 0; s < SAMPLES; s++) {
      const t = (s / SAMPLES) * TAU;
      const jitter = jk.reduce((acc, k, idx) => acc + (ja[idx] / jaSum) * Math.sin(k * t + jp[idx]), 0);
      const rr = r * (1 + shape(t)) + jitter * jitterAmp;
      parts.push(`${s === 0 ? "M" : "L"}${fmt(cx + rr * Math.cos(t))} ${fmt(cy + rr * Math.sin(t))}`);
    }
    boundaries.push({ r, pts: parts.join("") + "Z" });
  }

  // Bark: rough outer edge.
  const barkParts: string[] = [];
  const bk = [9, 13, 17, 23];
  const bp = bk.map(() => rnd() * TAU);
  for (let s = 0; s < SAMPLES; s++) {
    const t = (s / SAMPLES) * TAU;
    const rough = bk.reduce((acc, k, idx) => acc + Math.sin(k * t + bp[idx]) / bk.length, 0);
    const rr = R * (1 + shape(t)) + rough * barkW * 0.45;
    barkParts.push(`${s === 0 ? "M" : "L"}${fmt(cx + rr * Math.cos(t))} ${fmt(cy + rr * Math.sin(t))}`);
  }
  const barkPath = barkParts.join("") + "Z";

  // Colours.
  const milestoneRing = new Map<number, Milestone>();
  for (const m of design.milestones) {
    const idx = Math.max(0, Math.min(N - 1, m.year - bornYear));
    if (!milestoneRing.has(idx)) milestoneRing.set(idx, m);
  }
  const ringLight = (i: number): HSL => {
    if (pal.hueSweep) {
      const [h0, h1] = pal.hueSweep;
      const h = h0 + (h1 - h0) * (N === 1 ? 0 : i / (N - 1));
      return [h + (rnd() - 0.5) * 6, pal.light[1], pal.light[2] + (rnd() - 0.5) * 8];
    }
    return [pal.light[0] + (rnd() - 0.5) * 6, pal.light[1], pal.light[2] + (rnd() - 0.5) * 9];
  };
  const ringDark = (i: number): HSL => {
    if (pal.hueSweep) {
      const [h0, h1] = pal.hueSweep;
      const h = h0 + (h1 - h0) * (N === 1 ? 0 : i / (N - 1));
      return [h, pal.dark[1] + 10, pal.dark[2]];
    }
    return pal.dark;
  };

  const out: string[] = [];
  const idp = opts.id ?? "hw";
  const textColor = opts.onDark ? "#f3ede2" : "#1f1a15";
  const leaderColor = opts.onDark ? "#f3ede2" : "#2b241d";

  // Bark + fills, outermost first (painter's algorithm).
  out.push(`<path d="${barkPath}" fill="${hsl(pal.bark)}"/>`);
  for (let i = N - 1; i >= 0; i--) {
    const m = milestoneRing.get(i);
    const fill = m ? hsl(pal.accent) : hsl(ringLight(i));
    out.push(`<path d="${boundaries[i].pts}" fill="${fill}"/>`);
  }
  // Latewood lines on every boundary.
  for (let i = 0; i < N; i++) {
    const w = Math.max(1.1, widths[i] * grain.late);
    const stroke = hsl(ringDark(i));
    out.push(`<path d="${boundaries[i].pts}" fill="none" stroke="${stroke}" stroke-width="${fmt(w)}" stroke-linejoin="round" opacity="0.9"/>`);
  }
  // Pith.
  out.push(`<circle cx="${cx}" cy="${cy}" r="${fmt(pithR)}" fill="${hsl(pal.pith)}"/>`);
  out.push(`<circle cx="${cx}" cy="${cy}" r="${fmt(pithR * 0.45)}" fill="${hsl(pal.light)}" opacity="0.7"/>`);

  // Radial checks (cracks), only for wood palettes.
  if (pal.cracks && N > 6) {
    const cracks = 2 + Math.floor(rnd() * 2);
    for (let c = 0; c < cracks; c++) {
      const ang = rnd() * TAU;
      const len = innerR * (0.35 + rnd() * 0.45);
      const start = pithR + innerR * 0.12 * rnd();
      const wid = 1.2 + rnd() * 2.2;
      const wob = (rnd() - 0.5) * 0.12;
      const pts: string[] = [];
      const steps = 14;
      for (let s = 0; s <= steps; s++) {
        const f = s / steps;
        const rr = start + len * f;
        const a = ang + wob * Math.sin(f * 3.1);
        const ww = wid * (1 - f) * (1 + shape(a) * 2);
        pts.push(`${fmt(cx + rr * Math.cos(a) - ww * Math.sin(a))} ${fmt(cy + rr * Math.sin(a) + ww * Math.cos(a))}`);
      }
      for (let s = steps; s >= 0; s--) {
        const f = s / steps;
        const rr = start + len * f;
        const a = ang + wob * Math.sin(f * 3.1);
        const ww = wid * (1 - f) * (1 + shape(a) * 2);
        pts.push(`${fmt(cx + rr * Math.cos(a) + ww * Math.sin(a))} ${fmt(cy + rr * Math.sin(a) - ww * Math.cos(a))}`);
      }
      out.push(`<polygon points="${pts.join(" ")}" fill="${hsl(pal.bark)}" opacity="0.85"/>`);
    }
  }

  // Milestone markers and labels.
  const angles = [-48, 144, 36, 216, -118, 80];
  const sorted = [...milestoneRing.entries()].sort((a, b) => a[0] - b[0]);
  sorted.forEach(([idx, m], j) => {
    const ang = angles[j % angles.length];
    const rr = boundaries[idx].r * (1 + shape((ang * Math.PI) / 180));
    const [x1, y1] = polar(cx, cy, rr - widths[idx] * 0.5, ang);
    const [x2, y2] = polar(cx, cy, R + 34, ang);
    const right = Math.cos((ang * Math.PI) / 180) >= 0;
    const x3 = right ? x2 + 22 : x2 - 22;
    const tx = right ? x3 + 8 : x3 - 8;
    const anchor = right ? "start" : "end";
    out.push(
      `<polyline points="${fmt(x1)} ${fmt(y1)} ${fmt(x2)} ${fmt(y2)} ${fmt(x3)} ${fmt(y2)}" fill="none" stroke="${leaderColor}" stroke-width="1.6" opacity="0.75" stroke-linejoin="round"/>`,
    );
    out.push(`<circle cx="${fmt(x1)}" cy="${fmt(y1)}" r="4.2" fill="${hsl(pal.accent)}" stroke="${leaderColor}" stroke-width="1.4"/>`);
    out.push(
      `<text x="${fmt(tx)}" y="${fmt(y2 - 4)}" text-anchor="${anchor}" font-family="IBM Plex Sans" font-weight="600" font-size="19" letter-spacing="1" fill="${textColor}">${m.year}</text>`,
    );
    out.push(
      `<text x="${fmt(tx)}" y="${fmt(y2 + 18)}" text-anchor="${anchor}" font-family="IBM Plex Sans" font-weight="400" font-size="18" fill="${textColor}" opacity="0.88">${escapeXml(m.label)}</text>`,
    );
  });

  // Name and caption.
  const name = design.name.trim();
  if (name) {
    const upper = name.toUpperCase();
    const est = upper.length * 0.74 * 48 + (upper.length - 1) * 7;
    const size = est > 900 ? Math.max(22, Math.floor((48 * 900) / est)) : 48;
    out.push(
      `<text x="${cx}" y="${cy + R + 112}" text-anchor="middle" font-family="Libre Baskerville" font-weight="700" font-size="${size}" letter-spacing="7" fill="${textColor}">${escapeXml(upper)}</text>`,
    );
  }
  const caption = (design.caption || `Est. ${bornYear} · ${N} ${N === 1 ? "ring" : "rings"}`).toUpperCase();
  out.push(
    `<text x="${cx}" y="${cy + R + (name ? 152 : 118)}" text-anchor="middle" font-family="IBM Plex Sans" font-weight="500" font-size="19" letter-spacing="5" fill="${textColor}" opacity="0.8">${escapeXml(caption)}</text>`,
  );

  const body = `<g id="${idp}-art">${out.join("")}</g>`;
  const viewBox = `0 0 ${VIEW.w} ${VIEW.h}`;
  let svg: string;
  if (opts.nested) {
    const n = opts.nested;
    svg = `<svg x="${n.x}" y="${n.y}" width="${n.width}" height="${n.height}" viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
  } else {
    svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" role="img" aria-label="${escapeXml(
      `${N} growth rings for ${name || "you"}`,
    )}">${body}</svg>`;
  }
  return { svg, rings: N, bornYear };
}

/** Compact, URL-safe encoding of a design (for share links and cancel URLs). Not signed. */
export function encodeDesignParam(d: Design): string {
  const compact = { n: d.name, b: d.born, m: d.milestones.map((m) => [m.year, m.label]), p: d.palette, g: d.grain, c: d.caption, a: d.asOf };
  return toBase64Url(JSON.stringify(compact));
}

export function decodeDesignParam(s: string): Design {
  const raw = JSON.parse(fromBase64Url(s)) as { n?: string; b?: string; m?: [number, string][]; p?: string; g?: string; c?: string; a?: string };
  return parseDesign({
    name: raw.n,
    born: raw.b,
    milestones: (raw.m ?? []).map(([year, label]) => ({ year, label })),
    palette: raw.p,
    grain: raw.g,
    caption: raw.c,
    asOf: raw.a,
  });
}

export function toBase64Url(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  const b64 = typeof btoa === "function" ? btoa(bin) : Buffer.from(bin, "binary").toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function fromBase64Url(s: string): string {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  const bin = typeof atob === "function" ? atob(b64) : Buffer.from(b64, "base64").toString("binary");
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}
