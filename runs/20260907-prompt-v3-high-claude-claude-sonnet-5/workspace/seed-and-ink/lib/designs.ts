import { hashSeedText, mulberry32, seedCode } from './seed';
import { drawDotText, dotTextWidth } from './dotfont';

// This module is isomorphic: it's imported by a browser <canvas> component
// (lib/designs used with a real CanvasRenderingContext2D) AND by the
// server-side PNG renderer (app/api/design-image, using @napi-rs/canvas's
// context object, which implements the same drawing API). Given the same
// seed text + style + palette, both call sites draw pixel-for-pixel the
// same design - that's what lets the server regenerate the exact artwork
// the customer previewed, on demand, with no need to store the image
// anywhere between checkout and print.

export const STYLES = [
  { key: 'bloom', name: 'Bloom', blurb: 'Layered petals, radiating out from center.' },
  { key: 'flow', name: 'Flow Field', blurb: 'Wind-swept ribbons of color.' },
  { key: 'circuit', name: 'Circuit', blurb: 'Right-angle traces, like a hidden board.' },
  { key: 'nebula', name: 'Nebula', blurb: 'Soft drifting clouds and pinpoint stars.' },
] as const;

export type StyleKey = (typeof STYLES)[number]['key'];

export function isStyleKey(v: string): v is StyleKey {
  return STYLES.some((s) => s.key === v);
}

type RNG = () => number;

function pick<T>(rng: RNG, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function rgba(hex: string, a: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

// A cheap deterministic pseudo-noise field built from stacked sine waves.
// Not "real" perlin noise, but smooth, seeded, and dependency-free -
// exactly what's needed for both the browser and the serverless renderer.
function makeNoise2D(rng: RNG) {
  const terms = Array.from({ length: 4 }, () => ({
    fx: lerp(0.6, 2.2, rng()),
    fy: lerp(0.6, 2.2, rng()),
    phase: rng() * Math.PI * 2,
    amp: lerp(0.4, 1, rng()),
  }));
  return (x: number, y: number) => {
    let v = 0;
    for (const t of terms) {
      v += t.amp * Math.sin(x * t.fx + y * t.fy + t.phase);
    }
    return v / terms.length; // roughly in [-1, 1]
  };
}

function drawBloom(ctx: any, w: number, h: number, rng: RNG, colors: string[]) {
  const cx = w / 2;
  const cy = h / 2;
  const layers = 5 + Math.floor(rng() * 5);
  const maxRadius = Math.min(w, h) * 0.46;
  for (let layer = 0; layer < layers; layer++) {
    const t = layer / (layers - 1 || 1);
    const radius = lerp(maxRadius * 0.18, maxRadius, t);
    const petals = 5 + Math.floor(rng() * 10);
    const rotation = rng() * Math.PI * 2;
    const petalLen = radius * lerp(0.5, 0.95, rng());
    const color = pick(rng, colors);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation);
    ctx.globalAlpha = lerp(0.35, 0.85, rng());
    ctx.fillStyle = color;
    for (let p = 0; p < petals; p++) {
      const angle = (p / petals) * Math.PI * 2;
      ctx.save();
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(radius * 0.35, -petalLen * 0.35, radius * 0.15, -petalLen);
      ctx.quadraticCurveTo(0, -petalLen * 1.08, -radius * 0.15, -petalLen);
      ctx.quadraticCurveTo(-radius * 0.35, -petalLen * 0.35, 0, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }
  // bright core
  ctx.save();
  ctx.globalAlpha = 0.9;
  const core = pick(rng, colors);
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxRadius * 0.16);
  grad.addColorStop(0, rgba(core, 1));
  grad.addColorStop(1, rgba(core, 0));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, maxRadius * 0.16, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawFlow(ctx: any, w: number, h: number, rng: RNG, colors: string[]) {
  const noise = makeNoise2D(rng);
  const lines = 90 + Math.floor(rng() * 60);
  const steps = 140;
  const scale = lerp(0.006, 0.014, rng());
  for (let i = 0; i < lines; i++) {
    let x = rng() * w;
    let y = rng() * h;
    const color = pick(rng, colors);
    ctx.strokeStyle = color;
    ctx.globalAlpha = lerp(0.15, 0.5, rng());
    ctx.lineWidth = lerp(1, 4, rng());
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let s = 0; s < steps; s++) {
      const angle = noise(x * scale, y * scale) * Math.PI * 2;
      x += Math.cos(angle) * 4;
      y += Math.sin(angle) * 4;
      if (x < -20 || x > w + 20 || y < -20 || y > h + 20) break;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

function drawCircuit(ctx: any, w: number, h: number, rng: RNG, colors: string[]) {
  const cell = Math.min(w, h) / (10 + Math.floor(rng() * 6));
  const cols = Math.floor(w / cell);
  const rows = Math.floor(h / cell);
  ctx.lineCap = 'square';
  const traceCount = 26 + Math.floor(rng() * 18);
  for (let i = 0; i < traceCount; i++) {
    let gx = Math.floor(rng() * cols);
    let gy = Math.floor(rng() * rows);
    const color = pick(rng, colors);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.globalAlpha = lerp(0.4, 0.9, rng());
    ctx.lineWidth = lerp(cell * 0.08, cell * 0.18, rng());
    const segments = 4 + Math.floor(rng() * 8);
    ctx.beginPath();
    ctx.moveTo(gx * cell, gy * cell);
    let horizontal = rng() > 0.5;
    for (let s = 0; s < segments; s++) {
      const step = 1 + Math.floor(rng() * 3);
      if (horizontal) gx += rng() > 0.5 ? step : -step;
      else gy += rng() > 0.5 ? step : -step;
      gx = Math.max(0, Math.min(cols, gx));
      gy = Math.max(0, Math.min(rows, gy));
      ctx.lineTo(gx * cell, gy * cell);
      horizontal = !horizontal;
    }
    ctx.stroke();
    // via pad at the end
    ctx.beginPath();
    ctx.arc(gx * cell, gy * cell, cell * 0.16, 0, Math.PI * 2);
    ctx.fill();
  }
  // a couple of "chip" rounded rects for visual anchoring
  const chips = 2 + Math.floor(rng() * 2);
  for (let i = 0; i < chips; i++) {
    const cw = cell * lerp(2, 3.5, rng());
    const ch = cell * lerp(2, 3.5, rng());
    const x = rng() * (w - cw);
    const y = rng() * (h - ch);
    ctx.globalAlpha = lerp(0.5, 0.85, rng());
    ctx.fillStyle = pick(rng, colors);
    const r = cell * 0.25;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(x, y, cw, ch, r);
    } else {
      ctx.rect(x, y, cw, ch);
    }
    ctx.fill();
  }
}

function drawNebula(ctx: any, w: number, h: number, rng: RNG, colors: string[]) {
  const clouds = 10 + Math.floor(rng() * 8);
  for (let i = 0; i < clouds; i++) {
    const x = rng() * w;
    const y = rng() * h;
    const r = lerp(w * 0.08, w * 0.32, rng());
    const color = pick(rng, colors);
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, rgba(color, lerp(0.35, 0.6, rng())));
    grad.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const stars = 120 + Math.floor(rng() * 160);
  for (let i = 0; i < stars; i++) {
    const x = rng() * w;
    const y = rng() * h;
    const r = lerp(0.6, 2.6, rng());
    ctx.globalAlpha = lerp(0.5, 1, rng());
    ctx.fillStyle = pick(rng, colors);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

export type RenderOptions = {
  width: number;
  height: number;
  seedText: string;
  style: StyleKey;
  colors: string[];
};

/** Renders the main front-of-shirt artwork onto a transparent canvas so
 * the garment's own fabric color shows through everywhere the design
 * doesn't paint - the way real DTG ink works. */
export function renderFrontDesign(ctx: any, opts: RenderOptions) {
  const { width, height, seedText, style, colors } = opts;
  ctx.clearRect(0, 0, width, height);
  const rng = mulberry32(hashSeedText(`${seedText}::${style}::front`));
  ctx.save();
  switch (style) {
    case 'bloom':
      drawBloom(ctx, width, height, rng, colors);
      break;
    case 'flow':
      drawFlow(ctx, width, height, rng, colors);
      break;
    case 'circuit':
      drawCircuit(ctx, width, height, rng, colors);
      break;
    case 'nebula':
      drawNebula(ctx, width, height, rng, colors);
      break;
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

/** Renders the small back-of-neck mark: a miniature badge in the same
 * style/palette plus the seed's numeric serial, in the dependency-free
 * dot-matrix font (no system fonts needed for the serverless print file). */
export function renderBackMark(ctx: any, opts: RenderOptions) {
  const { width, height, seedText, style, colors } = opts;
  ctx.clearRect(0, 0, width, height);
  const badgeSize = Math.min(width, height) * 0.4;
  const rng = mulberry32(hashSeedText(`${seedText}::${style}::back`));
  ctx.save();
  ctx.translate(width / 2 - badgeSize / 2, height * 0.12);
  switch (style) {
    case 'bloom':
      drawBloom(ctx, badgeSize, badgeSize, rng, colors);
      break;
    case 'flow':
      drawFlow(ctx, badgeSize, badgeSize, rng, colors);
      break;
    case 'circuit':
      drawCircuit(ctx, badgeSize, badgeSize, rng, colors);
      break;
    case 'nebula':
      drawNebula(ctx, badgeSize, badgeSize, rng, colors);
      break;
  }
  ctx.restore();
  ctx.globalAlpha = 1;

  const code = seedCode(seedText);
  const dot = Math.max(2, Math.round(width * 0.012));
  const textWidth = dotTextWidth(code, dot);
  ctx.globalAlpha = 0.92;
  drawDotText(
    ctx,
    code,
    width / 2 - textWidth / 2,
    height * 0.12 + badgeSize + height * 0.06,
    dot,
    colors[colors.length - 1] ?? '#111111',
  );
  ctx.globalAlpha = 1;
}
