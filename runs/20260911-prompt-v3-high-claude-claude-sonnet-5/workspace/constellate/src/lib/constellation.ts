/**
 * Deterministic generative-art engine for Constellate.
 *
 * Every design is a pure function of its input text + a palette id: the same
 * inputs always render the same artwork. That lets the browser show a live
 * preview and the server independently re-render an identical, high-resolution
 * print file at checkout time without storing any image asset.
 */

export type PaletteId = "midnight" | "nebula" | "emerald" | "dusk";

export const PALETTES: Record<
  PaletteId,
  { name: string; bgTop: string; bgBottom: string; star: string; starCore: string; line: string; text: string }
> = {
  midnight: {
    name: "Midnight Navy",
    bgTop: "#0b1230",
    bgBottom: "#02030a",
    star: "#eaf2ff",
    starCore: "#ffffff",
    line: "#5b7bd8",
    text: "#f4f7ff",
  },
  nebula: {
    name: "Nebula Violet",
    bgTop: "#2a0e42",
    bgBottom: "#0a0414",
    star: "#f3e8ff",
    starCore: "#ffffff",
    line: "#b571e8",
    text: "#f8f0ff",
  },
  emerald: {
    name: "Emerald Noir",
    bgTop: "#052018",
    bgBottom: "#01090a",
    star: "#e4fff2",
    starCore: "#ffffff",
    line: "#3fd39a",
    text: "#eefff7",
  },
  dusk: {
    name: "Blood Orange Dusk",
    bgTop: "#3a0e12",
    bgBottom: "#0a0203",
    star: "#ffe9d6",
    starCore: "#ffffff",
    line: "#e8794f",
    text: "#fff4ec",
  },
};

export interface ConstellationInput {
  title: string; // e.g. "MAYA & JONAH"
  dateLabel: string; // e.g. "JUNE 14 2019"
  subtitle?: string; // e.g. "NEW YORK, NY"
  palette: PaletteId;
}

// Canvas is a fixed abstract unit grid; rasterization happens at any pixel size.
export const VIEW_W = 1000;
export const VIEW_H = 1250;

// ---- deterministic PRNG -----------------------------------------------

function hashSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Star {
  x: number;
  y: number;
  r: number;
}

interface Edge {
  a: number;
  b: number;
}

export interface ConstellationData {
  stars: Star[];
  edges: Edge[];
  dust: { x: number; y: number; r: number; o: number }[];
  seed: number;
  palette: PaletteId;
}

function normalizeText(s: string): string {
  return s.trim().replace(/\s+/g, " ");
}

export function buildConstellationData(input: ConstellationInput): ConstellationData {
  const title = normalizeText(input.title);
  const dateLabel = normalizeText(input.dateLabel);
  const subtitle = normalizeText(input.subtitle ?? "");
  const key = `${title}|${dateLabel}|${subtitle}|${input.palette}`;
  const seed = hashSeed(key);
  const rand = mulberry32(seed);

  // Star count derives from the text itself so every design feels tied to
  // what was typed, while staying in a visually pleasing range.
  const textWeight = title.replace(/[^a-z0-9]/gi, "").length + dateLabel.replace(/[^a-z0-9]/gi, "").length;
  const starCount = Math.max(10, Math.min(22, 9 + Math.round(textWeight / 3)));

  // Constellation occupies a central band, leaving room for title/date text.
  const margin = 90;
  const topBound = 260;
  const bottomBound = VIEW_H - 320;

  const stars: Star[] = [];
  let attempts = 0;
  const minDist = 70;
  while (stars.length < starCount && attempts < starCount * 60) {
    attempts++;
    const x = margin + rand() * (VIEW_W - margin * 2);
    const y = topBound + rand() * (bottomBound - topBound);
    const tooClose = stars.some((s) => Math.hypot(s.x - x, s.y - y) < minDist);
    if (tooClose) continue;
    const r = 3.2 + rand() * 5.2;
    stars.push({ x, y, r });
  }

  // Minimum-spanning-tree via Kruskal's algorithm so every star connects in
  // one unbroken constellation line, never a disjoint scatter.
  const pairs: { a: number; b: number; d: number }[] = [];
  for (let i = 0; i < stars.length; i++) {
    for (let j = i + 1; j < stars.length; j++) {
      pairs.push({ a: i, b: j, d: Math.hypot(stars[i].x - stars[j].x, stars[i].y - stars[j].y) });
    }
  }
  pairs.sort((p1, p2) => p1.d - p2.d);
  const parent = stars.map((_, i) => i);
  function find(x: number): number {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  }
  const edges: Edge[] = [];
  for (const p of pairs) {
    const ra = find(p.a);
    const rb = find(p.b);
    if (ra !== rb) {
      parent[ra] = rb;
      edges.push({ a: p.a, b: p.b });
    }
  }
  // A couple of extra short connections so it reads as a constellation web,
  // not a bare tree.
  const extras = Math.min(3, Math.floor(starCount / 6));
  let added = 0;
  for (const p of pairs) {
    if (added >= extras) break;
    const already = edges.some((e) => (e.a === p.a && e.b === p.b) || (e.a === p.b && e.b === p.a));
    if (!already && p.d < 160) {
      edges.push({ a: p.a, b: p.b });
      added++;
    }
  }

  // Faint background dust for atmosphere.
  const dust = Array.from({ length: 140 }, () => ({
    x: rand() * VIEW_W,
    y: rand() * VIEW_H,
    r: 0.5 + rand() * 1.3,
    o: 0.15 + rand() * 0.45,
  }));

  return { stars, edges, dust, seed, palette: input.palette };
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function fitTitleSize(title: string): number {
  if (title.length <= 10) return 84;
  if (title.length <= 16) return 68;
  if (title.length <= 22) return 54;
  return 42;
}

export function renderConstellationSVG(input: ConstellationInput, data: ConstellationData): string {
  const p = PALETTES[input.palette];
  const title = normalizeText(input.title).toUpperCase();
  const dateLabel = normalizeText(input.dateLabel).toUpperCase();
  const subtitle = normalizeText(input.subtitle ?? "").toUpperCase();
  const titleSize = fitTitleSize(title);

  const starEls = data.stars
    .map((s) => {
      return `<g>
        <circle cx="${s.x.toFixed(1)}" cy="${s.y.toFixed(1)}" r="${(s.r * 3.6).toFixed(1)}" fill="${p.star}" opacity="0.10"/>
        <circle cx="${s.x.toFixed(1)}" cy="${s.y.toFixed(1)}" r="${(s.r * 2).toFixed(1)}" fill="${p.star}" opacity="0.22"/>
        <circle cx="${s.x.toFixed(1)}" cy="${s.y.toFixed(1)}" r="${s.r.toFixed(1)}" fill="${p.starCore}"/>
      </g>`;
    })
    .join("");

  const edgeEls = data.edges
    .map((e) => {
      const a = data.stars[e.a];
      const b = data.stars[e.b];
      return `<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(
        1
      )}" stroke="${p.line}" stroke-width="1.6" stroke-opacity="0.55" stroke-linecap="round"/>`;
    })
    .join("");

  const dustEls = data.dust
    .map((d) => `<circle cx="${d.x.toFixed(1)}" cy="${d.y.toFixed(1)}" r="${d.r.toFixed(2)}" fill="${p.star}" opacity="${d.o.toFixed(2)}"/>`)
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEW_W} ${VIEW_H}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${p.bgTop}"/>
        <stop offset="100%" stop-color="${p.bgBottom}"/>
      </linearGradient>
      <radialGradient id="vignette" cx="50%" cy="42%" r="75%">
        <stop offset="55%" stop-color="#000000" stop-opacity="0"/>
        <stop offset="100%" stop-color="#000000" stop-opacity="0.55"/>
      </radialGradient>
    </defs>
    <rect x="0" y="0" width="${VIEW_W}" height="${VIEW_H}" fill="url(#bg)"/>
    ${dustEls}
    ${edgeEls}
    ${starEls}
    <rect x="0" y="0" width="${VIEW_W}" height="${VIEW_H}" fill="url(#vignette)"/>
    <rect x="36" y="36" width="${VIEW_W - 72}" height="${VIEW_H - 72}" fill="none" stroke="${p.text}" stroke-opacity="0.35" stroke-width="1.5"/>
    <text x="${VIEW_W / 2}" y="${VIEW_H - 176}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="${titleSize}" letter-spacing="4" fill="${p.text}">${esc(title)}</text>
    <text x="${VIEW_W / 2}" y="${VIEW_H - 128}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="26" letter-spacing="8" fill="${p.text}" opacity="0.85">${esc(dateLabel)}</text>
    ${
      subtitle
        ? `<text x="${VIEW_W / 2}" y="${VIEW_H - 92}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="18" letter-spacing="6" fill="${p.text}" opacity="0.6">${esc(
            subtitle
          )}</text>`
        : ""
    }
  </svg>`;
}

export function encodeDesignParams(input: ConstellationInput): URLSearchParams {
  const params = new URLSearchParams();
  params.set("title", input.title);
  params.set("date", input.dateLabel);
  if (input.subtitle) params.set("subtitle", input.subtitle);
  params.set("palette", input.palette);
  return params;
}

export function decodeDesignParams(params: URLSearchParams): ConstellationInput {
  const palette = (params.get("palette") as PaletteId) || "midnight";
  return {
    title: params.get("title") || "",
    dateLabel: params.get("date") || "",
    subtitle: params.get("subtitle") || "",
    palette: PALETTES[palette] ? palette : "midnight",
  };
}
