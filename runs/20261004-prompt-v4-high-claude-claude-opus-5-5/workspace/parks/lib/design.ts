/**
 * Personal Parks Service — generative "national park" badge.
 *
 * Everything is flat, opaque vector art (no gradients, no transparency inside the
 * badge) so it prints cleanly with DTG on any shirt colour. The landscape is
 * seeded from the park name, so every customer gets their own terrain.
 */
import { arcTextPath, capHeight, fonts, hasGlyphs, layout, textPath } from "./fonts";
import { DEFAULT_DESIGN, LIMITS, PALETTES, SCENES, type Design, type Palette, type PaletteKey, type Scene } from "./styles";

export { DEFAULT_DESIGN, LIMITS, PALETTES, SCENES };
export type { Design, PaletteKey, Scene };

function clean(s: unknown) {
  return String(s ?? "")
    .normalize("NFC")
    .replace(/['`´]/g, "’")
    .replace(/["“”]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export type NormalizeResult = { ok: true; design: Design } | { ok: false; error: string };

export function normalizeDesign(input: any): NormalizeResult {
  const { display, label } = fonts();
  const name = clean(input?.name);
  const motto = clean(input?.motto);
  const year = clean(input?.year);
  const scene = String(input?.scene ?? "") as Scene;
  const palette = String(input?.palette ?? "");
  const v = Math.max(0, Math.min(9999, Math.floor(Number(input?.v) || 0)));

  if (name.length < 2) return { ok: false, error: "Give your park a name (at least 2 characters)." };
  if ([...name].length > LIMITS.name) return { ok: false, error: `Park names can be up to ${LIMITS.name} characters.` };
  if (!hasGlyphs(display, name.toUpperCase()))
    return { ok: false, error: "Sorry — the park name uses a character our sign font can’t carve yet. Latin letters, numbers and basic punctuation work." };
  if ([...motto].length > LIMITS.motto) return { ok: false, error: `The motto can be up to ${LIMITS.motto} characters.` };
  if (motto && !hasGlyphs(label, motto.toUpperCase()))
    return { ok: false, error: "The motto uses a character our sign font can’t print. Latin letters, numbers and basic punctuation work." };
  if (year && !/^[12]\d{3}$/.test(year)) return { ok: false, error: "The established year should be 4 digits, like 1991." };
  if (!(scene in SCENES)) return { ok: false, error: "Pick a landscape." };
  if (!(palette in PALETTES)) return { ok: false, error: "Pick a colour palette." };
  return { ok: true, design: { name, motto, year, scene, palette, v } };
}

export function encodeDesign(d: Design) {
  return Buffer.from(JSON.stringify(d)).toString("base64url");
}
export function decodeDesign(s: string): NormalizeResult {
  try {
    return normalizeDesign(JSON.parse(Buffer.from(s, "base64url").toString("utf8")));
  } catch {
    return { ok: false, error: "Malformed design." };
  }
}

// ───────────────────────────── helpers ─────────────────────────────

function hashString(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    range: (lo: number, hi: number) => lo + (hi - lo) * next(),
    int: (lo: number, hi: number) => Math.floor(lo + (hi - lo + 1) * next()),
    pick: <T,>(arr: readonly T[]) => arr[Math.floor(next() * arr.length)],
  };
}
type Rng = ReturnType<typeof rng>;

function mix(a: string, b: string, t: number) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return "#" + pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, "0")).join("");
}

const f = (n: number) => n.toFixed(1);
type Pt = [number, number];

/** Closed polygon path. */
function poly(pts: Pt[]) {
  return "M" + pts.map(([x, y]) => `${f(x)} ${f(y)}`).join("L") + "Z";
}

/** Smooth curve through points (Catmull-Rom → cubic Bézier), open. */
function smooth(pts: Pt[]) {
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d;
}

// Scene space: badge centre is (0,0); the scene window is a circle of radius R.
const R = 1090;
const X0 = -R - 60;
const X1 = R + 60;
const FLOOR = R + 60; // anything filled to here covers the bottom of the window

/** Jagged mountain profile: max of triangular peaks plus midpoint-displacement noise. */
function peakProfile(
  r: Rng,
  base: number,
  peaks: { x: number; h: number; slope: number }[],
  rough: number,
  step = 24,
): Pt[] {
  const n = Math.ceil((X1 - X0) / step);
  const noise = new Array(n + 1).fill(0);
  // midpoint displacement for natural-looking ridgelines
  const md = (lo: number, hi: number, amp: number) => {
    if (hi - lo < 2) return;
    const mid = (lo + hi) >> 1;
    noise[mid] = (noise[lo] + noise[hi]) / 2 + r.range(-amp, amp);
    md(lo, mid, amp * 0.58);
    md(mid, hi, amp * 0.58);
  };
  md(0, n, rough);
  const pts: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const x = X0 + i * step;
    let h = 0;
    for (const p of peaks) h = Math.max(h, p.h - Math.abs(x - p.x) * p.slope);
    pts.push([x, base - Math.max(0, h) - noise[i] * (0.35 + Math.min(1, h / 300) * 0.65)]);
  }
  return pts;
}

function fillBelow(pts: Pt[]) {
  return poly([...pts, [X1, FLOOR], [X0, FLOOR]]);
}

function rollingProfile(r: Rng, base: number, amp: number, waves: number, step = 40): Pt[] {
  const ph = [r.range(0, 6.28), r.range(0, 6.28), r.range(0, 6.28)];
  const pts: Pt[] = [];
  for (let x = X0; x <= X1 + step; x += step) {
    const t = (x - X0) / (X1 - X0);
    const y =
      base -
      amp *
        (0.55 * Math.sin(t * Math.PI * waves + ph[0]) +
          0.3 * Math.sin(t * Math.PI * waves * 2.1 + ph[1]) +
          0.15 * Math.sin(t * Math.PI * waves * 4.3 + ph[2]));
    pts.push([Math.min(x, X1), y]);
  }
  return pts;
}

function profileY(pts: Pt[], x: number) {
  for (let i = 0; i < pts.length - 1; i++) {
    if (x >= pts[i][0] && x <= pts[i + 1][0]) {
      const t = (x - pts[i][0]) / (pts[i + 1][0] - pts[i][0] || 1);
      return pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t;
    }
  }
  return pts[pts.length - 1][1];
}

/** A stylised pine: stacked tiers with a short trunk. (x, y) is the base. */
function pine(x: number, y: number, h: number, w: number) {
  const tiers = h > 260 ? 4 : 3;
  const trunkH = h * 0.1;
  const top = y - h;
  let d = poly([
    [x - w * 0.07, y + 2],
    [x - w * 0.07, y - trunkH - 4],
    [x + w * 0.07, y - trunkH - 4],
    [x + w * 0.07, y + 2],
  ]);
  for (let i = 0; i < tiers; i++) {
    const t0 = i / tiers;
    const tierTop = top + (h - trunkH) * t0 * 0.85;
    const tierBot = top + (h - trunkH) * (0.3 + 0.7 * ((i + 1) / tiers));
    const tw = w * (0.45 + 0.55 * ((i + 1) / tiers)) * 0.5;
    d += poly([
      [x, tierTop],
      [x + tw, tierBot],
      [x + tw * 0.35, tierBot - (tierBot - tierTop) * 0.08],
      [x - tw * 0.35, tierBot - (tierBot - tierTop) * 0.08],
      [x - tw, tierBot],
    ]);
  }
  return d;
}

function treeLine(r: Rng, prof: Pt[], from: number, to: number, hMin: number, hMax: number, gap: number) {
  let d = "";
  for (let x = from; x < to; x += gap * r.range(0.55, 1.1)) {
    const h = r.range(hMin, hMax);
    d += pine(x, profileY(prof, x) + h * 0.12, h, h * 0.55);
  }
  return d;
}

function saguaro(x: number, y: number, h: number) {
  const w = h * 0.16;
  const capsule = (cx: number, top: number, bot: number, ww: number) => {
    const r2 = ww / 2;
    return `M${f(cx - r2)} ${f(bot)}L${f(cx - r2)} ${f(top + r2)}A${f(r2)} ${f(r2)} 0 0 1 ${f(cx + r2)} ${f(top + r2)}L${f(cx + r2)} ${f(bot)}Z`;
  };
  const armW = w * 0.78;
  const lx = x - w * 1.25;
  const rx = x + w * 1.25;
  const lTop = y - h * 0.72;
  const rTop = y - h * 0.85;
  const lElbow = y - h * 0.38;
  const rElbow = y - h * 0.5;
  return (
    capsule(x, y - h, y + 4, w) +
    capsule(lx, lTop, lElbow + armW / 2, armW) +
    `M${f(lx - armW / 2)} ${f(lElbow - armW / 2)}L${f(x)} ${f(lElbow - armW / 2)}L${f(x)} ${f(lElbow + armW / 2)}L${f(lx - armW / 2)} ${f(lElbow + armW / 2)}Z` +
    capsule(rx, rTop, rElbow + armW / 2, armW) +
    `M${f(x)} ${f(rElbow - armW / 2)}L${f(rx + armW / 2)} ${f(rElbow - armW / 2)}L${f(rx + armW / 2)} ${f(rElbow + armW / 2)}L${f(x)} ${f(rElbow + armW / 2)}Z`
  );
}

function star(cx: number, cy: number, rOut: number, points = 5, inner = 0.45) {
  const pts: Pt[] = [];
  for (let i = 0; i < points * 2; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / points;
    const rr = i % 2 === 0 ? rOut : rOut * inner;
    pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]);
  }
  return poly(pts);
}

function sparkle(cx: number, cy: number, r: number) {
  return star(cx, cy, r, 4, 0.28);
}

// ───────────────────────────── scene pieces ─────────────────────────────

interface Ctx {
  r: Rng;
  p: Palette;
  out: string[];
  id: string;
}

const path = (c: Ctx, d: string, fill: string, extra = "") => c.out.push(`<path d="${d}" fill="${fill}"${extra}/>`);

function sky(c: Ctx, sx: number, sy: number, sr: number, horizon: number) {
  const { p, r } = c;
  path(c, `M${X0} ${-FLOOR}H${X1}V${FLOOR}H${X0}Z`, p.sky);
  // concentric halo rings around the sun — the classic screenprint "gradient"
  const mid = mix(p.sky, p.halo, 0.5);
  c.out.push(`<circle cx="${f(sx)}" cy="${f(sy)}" r="${f(sr * 2.55)}" fill="${mid}"/>`);
  c.out.push(`<circle cx="${f(sx)}" cy="${f(sy)}" r="${f(sr * 1.75)}" fill="${p.halo}"/>`);

  if (p.night) {
    // stars, kept clear of the moon
    for (let i = 0; i < 46; i++) {
      const x = r.range(-R, R);
      const y = r.range(-R, horizon - 120);
      if (Math.hypot(x - sx, y - sy) < sr * 2.2 || Math.hypot(x, y) > R - 30) continue;
      if (r.next() < 0.28) path(c, sparkle(x, y, r.range(26, 44)), p.cream);
      else c.out.push(`<circle cx="${f(x)}" cy="${f(y)}" r="${f(r.range(7, 12))}" fill="${p.cream}"/>`);
    }
    // crescent moon
    const clip = `${c.id}-moon`;
    c.out.push(`<clipPath id="${clip}"><circle cx="${f(sx)}" cy="${f(sy)}" r="${f(sr)}"/></clipPath>`);
    c.out.push(`<circle cx="${f(sx)}" cy="${f(sy)}" r="${f(sr)}" fill="${p.sun}"/>`);
    c.out.push(
      `<circle clip-path="url(#${clip})" cx="${f(sx + sr * 0.42)}" cy="${f(sy - sr * 0.22)}" r="${f(sr * 0.86)}" fill="${p.halo}"/>`,
    );
  } else {
    const clip = `${c.id}-sun`;
    c.out.push(`<clipPath id="${clip}"><circle cx="${f(sx)}" cy="${f(sy)}" r="${f(sr)}"/></clipPath>`);
    c.out.push(`<circle cx="${f(sx)}" cy="${f(sy)}" r="${f(sr)}" fill="${p.sun}"/>`);
    // retro sun stripes, thickening toward the horizon
    let y = sy + sr * 0.12;
    for (let i = 0; i < 6; i++) {
      const t = 14 + i * 11;
      c.out.push(`<rect clip-path="url(#${clip})" x="${f(sx - sr)}" y="${f(y)}" width="${f(sr * 2)}" height="${t}" fill="${p.halo}"/>`);
      y += t + 46 - i * 4;
    }
    // a couple of long flat clouds
    const n = r.int(1, 2);
    for (let i = 0; i < n; i++) {
      const cw = r.range(380, 620);
      const cx = r.range(-R * 0.6, R * 0.6);
      const cy = r.range(-R * 0.72, horizon - 520);
      const ch = 56;
      const fill = mix(p.sky, p.cream, 0.55);
      c.out.push(`<rect x="${f(cx - cw / 2)}" y="${f(cy)}" width="${f(cw)}" height="${ch}" rx="${ch / 2}" fill="${fill}"/>`);
      c.out.push(
        `<rect x="${f(cx - cw * 0.3)}" y="${f(cy - ch * 0.75)}" width="${f(cw * 0.48)}" height="${ch}" rx="${ch / 2}" fill="${fill}"/>`,
      );
    }
  }
}

function birds(c: Ctx, n: number, near: Pt) {
  const { r, p } = c;
  for (let i = 0; i < n; i++) {
    const x = near[0] + r.range(-260, 260);
    const y = near[1] + r.range(-160, 160);
    const s = r.range(26, 40);
    c.out.push(
      `<path d="M${f(x - s)} ${f(y)}Q${f(x - s / 2)} ${f(y - s * 0.7)} ${f(x)} ${f(y)}Q${f(x + s / 2)} ${f(y - s * 0.7)} ${f(x + s)} ${f(y)}" fill="none" stroke="${p.ink}" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>`,
    );
  }
}

/** Light-from-the-left facet shading on mountain peaks. */
function facets(c: Ctx, prof: Pt[], peaks: { x: number; h: number }[], base: number, color: string, clipD: string) {
  const clip = `${c.id}-f${c.out.length}`;
  c.out.push(`<clipPath id="${clip}"><path d="${clipD}"/></clipPath>`);
  let d = "";
  for (const pk of peaks) {
    // find actual apex near the peak
    let best: Pt = [pk.x, profileY(prof, pk.x)];
    for (const pt of prof) if (Math.abs(pt[0] - pk.x) < 90 && pt[1] < best[1]) best = pt;
    const drop = base - best[1];
    d += poly([best, [best[0] + drop * 0.12, base + 40], [best[0] + drop * 1.6, base + 40], [best[0] + drop * 1.6, best[1]]]);
  }
  c.out.push(`<path clip-path="url(#${clip})" d="${d}" fill="${color}"/>`);
}

function snow(c: Ctx, prof: Pt[], peaks: { x: number; h: number }[], clipD: string) {
  const { r, p } = c;
  const clip = `${c.id}-s${c.out.length}`;
  c.out.push(`<clipPath id="${clip}"><path d="${clipD}"/></clipPath>`);
  let d = "";
  for (const pk of peaks) {
    let apex: Pt = [pk.x, profileY(prof, pk.x)];
    for (const pt of prof) if (Math.abs(pt[0] - pk.x) < 90 && pt[1] < apex[1]) apex = pt;
    const depth = r.range(120, 170);
    const w = depth * 2.4;
    const pts: Pt[] = [
      [apex[0] - w, apex[1] - 40],
      [apex[0] + w, apex[1] - 40],
    ];
    // zig-zag lower edge, right to left
    const teeth = 5;
    for (let i = 0; i <= teeth * 2; i++) {
      const x = apex[0] + w - (i * 2 * w) / (teeth * 2);
      const y = apex[1] + depth * (i % 2 === 0 ? r.range(0.75, 1.05) : r.range(0.45, 0.6));
      pts.push([x, y]);
    }
    d += poly(pts);
  }
  c.out.push(`<path clip-path="url(#${clip})" d="${d}" fill="${mix(p.cream, p.layers[0], 0.12)}"/>`);
}

function makePeaks(r: Rng, n: number, hMin: number, hMax: number, sMin: number, sMax: number, spread = R * 0.95) {
  const peaks = [];
  for (let i = 0; i < n; i++) {
    const slot = -spread + ((i + 0.5) * 2 * spread) / n;
    peaks.push({ x: slot + r.range(-spread / n / 1.6, spread / n / 1.6), h: r.range(hMin, hMax), slope: r.range(sMin, sMax) });
  }
  return peaks;
}

function framingPines(c: Ctx, groundY: number) {
  const { r, p } = c;
  let d = "";
  for (const side of [-1, 1]) {
    const count = r.int(2, 3);
    for (let i = 0; i < count; i++) {
      const x = side * (R - 60 - i * r.range(110, 170));
      const h = r.range(560, 820) - i * 120;
      d += pine(x, groundY + 40, h, h * 0.5);
    }
  }
  path(c, d, p.layers[3]);
}

function groundWithHills(c: Ctx, base: number, amp: number) {
  const prof = rollingProfile(c.r, base, amp, 1.6);
  path(c, smooth(prof) + `L${X1} ${FLOOR}L${X0} ${FLOOR}Z`, c.p.layers[3]);
  return prof;
}

// ───────────────────────────── scenes ─────────────────────────────

function sceneMountains(c: Ctx) {
  const { r, p } = c;
  const sx = r.range(-380, 380);
  sky(c, sx, -300 + r.range(-80, 40), 300, 120);
  if (!p.night) birds(c, r.int(2, 4), [-sx * 0.8, -560]);

  const farBase = 120;
  const farPeaks = makePeaks(r, r.int(3, 4), 480, 760, 0.9, 1.35);
  const far = peakProfile(r, farBase, farPeaks, 70);
  const farD = fillBelow(far);
  path(c, farD, p.layers[0]);
  facets(c, far, farPeaks, farBase, mix(p.layers[0], p.ink, 0.16), farD);
  snow(c, far, [...farPeaks].sort((a, b) => b.h - a.h).slice(0, 2), farD);

  const midBase = 260;
  const midPeaks = makePeaks(r, r.int(3, 5), 260, 440, 0.75, 1.15);
  const mid = peakProfile(r, midBase, midPeaks, 45);
  const midD = fillBelow(mid);
  path(c, midD, p.layers[1]);
  facets(c, mid, midPeaks, midBase, mix(p.layers[1], p.ink, 0.16), midD);

  const hills = rollingProfile(r, 300, 60, 2.2);
  path(c, smooth(hills) + `L${X1} ${FLOOR}L${X0} ${FLOOR}Z`, p.layers[2]);
  path(c, treeLine(r, hills, X0, X1, 90, 150, 70), p.layers[2]);

  groundWithHills(c, 460, 40);
  framingPines(c, 460);
}

function sceneDesert(c: Ctx) {
  const { r, p } = c;
  sky(c, r.range(-420, 420), -260 + r.range(-60, 60), 320, 160);

  // far mesas: flat tops, steep stepped sides, strata bands
  const horizon = 180;
  path(c, `M${X0} ${horizon}H${X1}V${FLOOR}H${X0}Z`, p.layers[0]);
  const mesas = r.int(2, 3);
  let d = "";
  let strata = "";
  for (let i = 0; i < mesas; i++) {
    const cx = -R * 0.75 + (i + 0.5) * ((R * 1.5) / mesas) + r.range(-120, 120);
    const w = r.range(380, 620);
    const h = r.range(260, 470);
    const top = horizon - h;
    const shoulder = r.range(0.25, 0.45);
    const pts: Pt[] = [
      [cx - w / 2 - 130, horizon + 2],
      [cx - w / 2 - 40, horizon - h * shoulder],
      [cx - w / 2 + 10, horizon - h * shoulder],
      [cx - w / 2 + 40, top],
      [cx + w / 2 - 40, top],
      [cx + w / 2 - 10, horizon - h * (shoulder + 0.1)],
      [cx + w / 2 + 50, horizon - h * (shoulder + 0.1)],
      [cx + w / 2 + 150, horizon + 2],
    ];
    d += poly(pts);
    // strata: two bands across each mesa
    for (const t of [0.22, 0.55]) {
      const y = top + h * t;
      strata += `M${f(cx - w / 2 - 80)} ${f(y)}h${f(w + 220)}v${f(18 + 10 * t)}h${f(-(w + 220))}Z`;
    }
  }
  path(c, d, p.layers[0]);
  const clip = `${c.id}-mesa`;
  c.out.push(`<clipPath id="${clip}"><path d="${d}"/></clipPath>`);
  c.out.push(`<path clip-path="url(#${clip})" d="${strata}" fill="${mix(p.layers[0], p.ink, 0.18)}"/>`);

  // mid buttes & spires
  let bd = "";
  const spires = r.int(2, 4);
  for (let i = 0; i < spires; i++) {
    const cx = r.range(-R * 0.85, R * 0.85);
    const w = r.range(90, 170);
    const h = r.range(180, 320);
    bd += poly([
      [cx - w, 310],
      [cx - w * 0.45, 310 - h * 0.35],
      [cx - w * 0.35, 310 - h],
      [cx + w * 0.35, 310 - h],
      [cx + w * 0.45, 310 - h * 0.35],
      [cx + w, 310],
    ]);
  }
  const midGround = rollingProfile(r, 300, 26, 1.4);
  path(c, bd, p.layers[1]);
  path(c, smooth(midGround) + `L${X1} ${FLOOR}L${X0} ${FLOOR}Z`, p.layers[1]);

  const dune = rollingProfile(r, 400, 45, 1.2);
  path(c, smooth(dune) + `L${X1} ${FLOOR}L${X0} ${FLOOR}Z`, p.layers[2]);

  const ground = groundWithHills(c, 500, 30);
  let cacti = "";
  for (const side of [-1, 1]) {
    const x = side * r.range(R * 0.55, R * 0.72);
    cacti += saguaro(x, profileY(ground, x) + 30, r.range(520, 700));
  }
  const sx = r.range(-R * 0.3, R * 0.3);
  cacti += saguaro(sx, profileY(dune, sx) + 20, r.range(150, 210));
  path(c, cacti, p.layers[3]);
  if (!p.night) birds(c, r.int(1, 3), [r.range(-400, 400), -620]);
}

function sceneCoast(c: Ctx) {
  const { r, p } = c;
  const side = r.next() < 0.5 ? -1 : 1;
  const horizon = -40;
  const sx = -side * r.range(120, 420);
  sky(c, sx, horizon - 120, 320, horizon);

  // sea
  const sea = mix(p.layers[0], p.layers[1], 0.35);
  path(c, `M${X0} ${horizon}H${X1}V${FLOOR}H${X0}Z`, sea);
  // sun glitter on the water
  let glitter = "";
  for (let i = 0; i < 7; i++) {
    const y = horizon + 30 + i * 30;
    const w = 520 - i * 50 + r.range(-40, 40);
    glitter += `M${f(sx - w / 2)} ${f(y)}h${f(w)}v${12 + i * 2}h${f(-w)}Z`;
  }
  path(c, glitter, p.night ? mix(sea, p.sun, 0.55) : mix(p.sun, sea, 0.15));
  // long swell lines
  let swell = "";
  for (let i = 0; i < 4; i++) {
    const y = horizon + 60 + i * 60 + r.range(-10, 10);
    const x = r.range(-R * 0.7, R * 0.4);
    swell += `M${f(x)} ${f(y)}h${f(r.range(180, 360))}v14h${f(-r.range(180, 360))}Z`;
  }
  path(c, swell, mix(sea, p.ink, 0.15));
  // distant islands
  let isl = "";
  for (let i = 0; i < r.int(1, 2); i++) {
    const x = -side * r.range(R * 0.3, R * 0.85);
    const w = r.range(220, 380);
    const h = r.range(50, 110);
    isl += `M${f(x - w)} ${horizon + 2}Q${f(x - w * 0.4)} ${f(horizon - h * 1.3)} ${f(x)} ${f(horizon - h)}Q${f(x + w * 0.5)} ${f(horizon - h * 0.9)} ${f(x + w)} ${horizon + 2}Z`;
  }
  path(c, isl, p.layers[1]);

  // headland with cliff face and lighthouse
  const edge = side * R * 0.08;
  const topY = horizon - r.range(170, 260);
  const outer = side * (R + 80);
  const cliffPts: Pt[] = [
    [outer, topY - 60],
    [side * R * 0.6, topY - 30],
    [side * R * 0.3, topY + 10],
    [edge + side * 40, topY + 40],
    [edge, topY + 110],
    [edge - side * 20, horizon + 160],
    [edge + side * 60, 380],
    [outer, 380],
  ];
  path(c, poly(cliffPts), p.layers[2]);
  path(
    c,
    poly([
      [edge + side * 40, topY + 40],
      [edge, topY + 110],
      [edge - side * 20, horizon + 160],
      [edge + side * 60, 380],
      [edge + side * 150, 380],
      [edge + side * 110, topY + 60],
    ]),
    mix(p.layers[2], p.ink, 0.2),
  );
  // lighthouse
  const lx = side * R * 0.42;
  const ly = profileY(side > 0 ? cliffPts.slice(0, 4).reverse() as Pt[] : (cliffPts.slice(0, 4) as Pt[]), lx) + 30;
  const lh = 400;
  const bw = 120;
  const tw = 76;
  const lt = ly - lh;
  const tower = poly([[lx - bw / 2, ly], [lx - tw / 2, lt], [lx + tw / 2, lt], [lx + bw / 2, ly]]);
  path(c, tower, p.cream);
  const tclip = `${c.id}-lh`;
  c.out.push(`<clipPath id="${tclip}"><path d="${tower}"/></clipPath>`);
  let bands = "";
  for (let i = 0; i < 3; i++) bands += `M${f(lx - 100)} ${f(lt + 50 + i * 120)}h200v60h-200Z`;
  c.out.push(`<path clip-path="url(#${tclip})" d="${bands}" fill="${p.ribbon}"/>`);
  path(c, `M${f(lx - 66)} ${f(lt + 8)}h132v-22h-132Z`, p.ink);
  path(c, `M${f(lx - 40)} ${f(lt - 14)}h80v-74h-80Z`, p.night ? p.sun : mix(p.sun, p.halo, 0.25));
  path(c, `M${f(lx - 58)} ${f(lt - 86)}L${f(lx)} ${f(lt - 150)}L${f(lx + 58)} ${f(lt - 86)}Z`, p.ink);
  if (p.night) {
    path(c, poly([[lx, lt - 52], [lx - side * 620, lt - 150], [lx - side * 620, lt + 30]]), mix(p.sky, p.sun, 0.35));
    path(c, `M${f(lx - 40)} ${f(lt - 14)}h80v-74h-80Z`, p.sun);
  }

  // dunes and grass in the foreground
  const dune = rollingProfile(r, 450, 50, 1.3);
  path(c, smooth(dune) + `L${X1} ${FLOOR}L${X0} ${FLOOR}Z`, p.layers[3]);
  let grass = "";
  for (let i = 0; i < 9; i++) {
    const x = r.range(-R * 0.85, R * 0.85);
    const y = profileY(dune, x) + 14;
    for (let j = -2; j <= 2; j++) {
      const h = r.range(80, 150) * (1 - Math.abs(j) * 0.18);
      grass += poly([[x + j * 16 - 8, y], [x + j * 34, y - h], [x + j * 16 + 8, y]]);
    }
  }
  path(c, grass, p.layers[3]);
  if (!p.night) birds(c, r.int(2, 4), [sx + side * 200, -520]);
}

function sceneForest(c: Ctx) {
  const { r, p } = c;
  const sx = r.range(-360, 360);
  const shore = -60;
  sky(c, sx, shore - 260, 290, shore);

  // soft distant mountains
  const farPeaks = makePeaks(r, r.int(3, 4), 260, 470, 0.55, 0.85);
  const far = peakProfile(r, shore, farPeaks, 14, 30);
  path(c, smooth(far) + `L${X1} ${FLOOR}L${X0} ${FLOOR}Z`, p.layers[0]);

  // far shore tree line
  const fs = rollingProfile(r, shore, 18, 2);
  path(c, smooth(fs) + `L${X1} ${FLOOR}L${X0} ${FLOOR}Z`, p.layers[1]);
  path(c, treeLine(r, fs, X0, X1, 70, 130, 46), p.layers[1]);

  // lake with reflection stripes
  const lakeTop = shore + 20;
  const lake = mix(p.halo, p.layers[0], 0.35);
  path(c, `M${X0} ${lakeTop}H${X1}V${FLOOR}H${X0}Z`, lake);
  let refl = "";
  for (let i = 0; i < 6; i++) {
    const y = lakeTop + 26 + i * 32;
    const w = 420 - i * 46;
    refl += `M${f(sx - w / 2)} ${f(y)}h${f(w)}v${12 + i * 2}h${f(-w)}Z`;
  }
  path(c, refl, p.night ? mix(lake, p.sun, 0.5) : mix(p.sun, lake, 0.2));
  // a canoe, because of course
  const cx = sx + r.range(-260, 260) * (r.next() < 0.5 ? -1 : 1);
  const cy = lakeTop + 100;
  path(c, `M${f(cx - 150)} ${f(cy)}Q${f(cx)} ${f(cy + 50)} ${f(cx + 150)} ${f(cy)}Q${f(cx)} ${f(cy + 18)} ${f(cx - 150)} ${f(cy)}Z`, p.ink);
  path(c, `M${f(cx - 24)} ${f(cy + 6)}h48v-52a24 24 0 0 0 -48 0Z`, p.ink);

  // near shore hills
  const near = rollingProfile(r, 390, 70, 1.5);
  path(c, smooth(near) + `L${X1} ${FLOOR}L${X0} ${FLOOR}Z`, p.layers[2]);
  path(c, treeLine(r, near, X0, -R * 0.25, 120, 220, 70) + treeLine(r, near, R * 0.3, X1, 120, 220, 70), p.layers[2]);

  groundWithHills(c, 500, 30);
  framingPines(c, 500);
  if (!p.night) birds(c, r.int(1, 3), [sx, -600]);
}

const SCENE_FNS: Record<Scene, (c: Ctx) => void> = {
  mountains: sceneMountains,
  desert: sceneDesert,
  coast: sceneCoast,
  forest: sceneForest,
};

// ───────────────────────────── badge ─────────────────────────────

export const CANVAS = { w: 3600, h: 4500 };
// Badge is drawn around (0,0) then scaled into the top of the print canvas so it
// sits at chest height and ends up ~11" wide on a 15" print area.
const BADGE_SCALE = 0.8;
const BADGE_Y = 160 + 1340 * BADGE_SCALE;

export function renderBadge(d: Design, idPrefix = "b") {
  const p = PALETTES[d.palette];
  const { display, label } = fonts();
  const seed = hashString(`${d.name.toUpperCase()}|${d.scene}|${d.v}`);
  const ctx: Ctx = { r: rng(seed), p, out: [], id: idPrefix };
  SCENE_FNS[d.scene](ctx);

  const RO = 1320; // outer radius of ring
  const parts: string[] = [];
  // outer ring + scene window
  parts.push(`<circle r="${RO}" fill="${p.ink}"/>`);
  parts.push(`<circle r="${RO - 34}" fill="none" stroke="${p.cream}" stroke-width="20"/>`);
  parts.push(`<clipPath id="${idPrefix}-win"><circle r="${R}"/></clipPath>`);
  parts.push(`<g clip-path="url(#${idPrefix}-win)">${ctx.out.join("")}</g>`);
  parts.push(`<circle r="${R + 2}" fill="none" stroke="${p.cream}" stroke-width="22"/>`);

  // ring text
  const ringR = (RO - 34 + R) / 2;
  const ringCap = 112;
  const ringSize = ringCap / (capHeight(label, 1));
  const topText = (d.motto || "").toUpperCase();
  const bottomText = d.year ? `EST. ${d.year}` : "";
  let top = topText ? arcTextPath(label, topText, 0, 0, ringR, ringSize, ringSize * 0.1, true) : null;
  if (top && top.span > (150 * Math.PI) / 180) {
    const s = ringSize * ((150 * Math.PI) / 180 / top.span);
    top = arcTextPath(label, topText, 0, 0, ringR, s, s * 0.1, true);
  }
  const bottom = bottomText ? arcTextPath(label, bottomText, 0, 0, ringR, ringSize, ringSize * 0.16, false) : null;
  parts.push(`<g fill="${p.cream}">${top?.svg ?? ""}${bottom?.svg ?? ""}</g>`);
  // ring stars: flank the text, or fill the ring if there is none
  const ringStars = (center: number, span: number) => {
    let s = "";
    if (span > 0) {
      for (const sgn of [-1, 1]) {
        const a = center + sgn * (span / 2 + 0.085);
        s += star(ringR * Math.cos(a), ringR * Math.sin(a), 46);
      }
    } else {
      for (const k of [-1, 0, 1]) {
        const a = center + k * 0.16;
        s += star(ringR * Math.cos(a), ringR * Math.sin(a), k === 0 ? 62 : 46);
      }
    }
    return s;
  };
  parts.push(
    `<path d="${ringStars(-Math.PI / 2, top?.span ?? 0) + ringStars(Math.PI / 2, bottom?.span ?? 0)}" fill="${p.cream}"/>`,
  );

  // ribbon banner across the lower half
  const ry = 330; // ribbon centre
  const rh = 340;
  const rw = 1450; // half-width of the main band
  const tail = 300;
  const drop = 110;
  const notch = 110;
  const ribDark = mix(p.ribbon, p.ink, 0.35);
  const ribbonTail = (s: number) =>
    poly([
      [s * (rw - 120), ry - rh / 2 + drop],
      [s * (rw + tail), ry - rh / 2 + drop],
      [s * (rw + tail - notch), ry + drop],
      [s * (rw + tail), ry + rh / 2 + drop],
      [s * (rw - 120), ry + rh / 2 + drop],
    ]);
  const fold = (s: number) => poly([[s * rw, ry + rh / 2], [s * (rw - 120), ry + rh / 2 + drop], [s * (rw - 120), ry + rh / 2]]);
  const inkStroke = `stroke="${p.ink}" stroke-width="26" stroke-linejoin="round"`;
  parts.push(`<path d="${ribbonTail(-1) + ribbonTail(1)}" fill="${ribDark}" ${inkStroke}/>`);
  parts.push(`<path d="${fold(-1) + fold(1)}" fill="${mix(p.ribbon, p.ink, 0.6)}" ${inkStroke}/>`);
  // main band with a gentle arch
  const arch = 60;
  const band = `M${-rw} ${ry - rh / 2}Q0 ${ry - rh / 2 - arch * 2} ${rw} ${ry - rh / 2}L${rw} ${ry + rh / 2}Q0 ${ry + rh / 2 - arch * 2} ${-rw} ${ry + rh / 2}Z`;
  parts.push(`<path d="${band}" fill="${p.ribbon}" ${inkStroke}/>`);
  // stitched edge lines
  const inset = 30;
  parts.push(
    `<path d="M${-rw + 40} ${ry - rh / 2 + inset}Q0 ${ry - rh / 2 + inset - arch * 2} ${rw - 40} ${ry - rh / 2 + inset}M${-rw + 40} ${ry + rh / 2 - inset}Q0 ${ry + rh / 2 - inset - arch * 2} ${rw - 40} ${ry + rh / 2 - inset}" fill="none" stroke="${p.cream}" stroke-width="10" stroke-dasharray="38 26" stroke-linecap="round"/>`,
  );

  // park name, fitted to the band
  const nameText = d.name.toUpperCase();
  const maxCap = 200;
  const maxW = rw * 2 - 260;
  let size = maxCap / capHeight(display, 1);
  const tr = (s: number) => s * 0.03;
  const w0 = layout(display, nameText, size, tr(size)).width;
  if (w0 > maxW) size *= maxW / w0;
  const cap = capHeight(display, size);
  const baseline = ry - arch + cap / 2; // optical centre under the arch
  parts.push(`<path d="${textPath(display, nameText, 12, baseline + 12, size, tr(size))}" fill="${p.ink}"/>`);
  parts.push(`<path d="${textPath(display, nameText, 0, baseline, size, tr(size))}" fill="${p.cream}"/>`);

  // "NATIONAL PARK" on the foreground
  const npCap = 128;
  const npSize = npCap / capHeight(label, 1);
  const npY = ry + rh / 2 + 70 + npCap;
  parts.push(`<path d="${textPath(label, "NATIONAL PARK", 0, npY, npSize, npSize * 0.14)}" fill="${p.cream}"/>`);
  const npW = layout(label, "NATIONAL PARK", npSize, npSize * 0.14).width;
  const lineY = npY + 70;
  parts.push(`<rect x="${f(-npW * 0.32)}" y="${lineY}" width="${f(npW * 0.64)}" height="16" rx="8" fill="${p.cream}"/>`);

  return `<g transform="translate(${CANVAS.w / 2} ${BADGE_Y}) scale(${BADGE_SCALE})">${parts.join("")}</g>`;
}

/** Full print canvas: transparent background, badge in the chest area. */
export function renderDesignSvg(d: Design) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS.w}" height="${CANVAS.h}" viewBox="0 0 ${CANVAS.w} ${CANVAS.h}">${renderBadge(d)}</svg>`;
}

/** Tight crop around the badge (for previews and the Stripe product image). */
export function renderBadgeSvg(d: Design, px = 1200) {
  const bw = 1820 * 2 * BADGE_SCALE;
  const vb = `${CANVAS.w / 2 - bw / 2} ${BADGE_Y - bw / 2} ${bw} ${bw}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="${vb}">${renderBadge(d)}</svg>`;
}
