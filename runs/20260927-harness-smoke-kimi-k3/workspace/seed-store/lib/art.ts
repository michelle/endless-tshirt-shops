// The SEED art engine. Deterministic: the same word + palette + garment tone
// always grows the same artwork, in the browser preview and in the print file.
// Environment-agnostic — works against any CanvasRenderingContext2D.

import { makeNoise2D, rngFromSeed } from './rng';
import type { Palette } from './catalogue';

export type ArtOptions = {
  word: string;
  palette: Palette;
  darkGarment: boolean;
  width: number;
  height: number;
  caption?: boolean; // default true
  captionFont?: string; // e.g. 'SeedMono' server-side, 'monospace' in browser
  detailScale?: number; // 1 = preview density; print uses more
};

type Ctx = Pick<
  CanvasRenderingContext2D,
  | 'beginPath' | 'moveTo' | 'lineTo' | 'stroke' | 'arc' | 'fill' | 'fillText'
  | 'save' | 'restore' | 'translate' | 'measureText'
  | 'strokeStyle' | 'fillStyle' | 'globalAlpha' | 'lineWidth' | 'lineCap'
  | 'lineJoin' | 'font' | 'textAlign' | 'textBaseline' | 'createRadialGradient'
  | 'fillRect'
>;

const TAU = Math.PI * 2;

export function renderSeedArt(ctx: Ctx, opts: ArtOptions): void {
  const {
    word,
    palette,
    darkGarment,
    width: W,
    height: H,
    caption = true,
    captionFont = 'monospace',
    detailScale = 1,
  } = opts;

  const seedKey = `${word.toLowerCase()}|${palette.id}`;
  const rand = rngFromSeed(seedKey);
  const noiseA = makeNoise2D(seedKey + ':field');
  const noiseB = makeNoise2D(seedKey + ':swirl');

  const minDim = Math.min(W, H);

  // The artwork lives in an organic elliptical region and dissolves toward
  // its edges, so the print fades into the garment instead of ending in a
  // hard rectangle. The caption band below stays quiet so the word reads.
  const regionCX = W * (0.42 + rand() * 0.16);
  const regionCY = H * (0.4 + rand() * 0.08);
  const regionRX = W * 0.46;
  const regionRY = H * 0.36;
  const captionBandTop = H * 0.82;

  const regionFade = (x: number, y: number): number => {
    const dx = (x - regionCX) / regionRX;
    const dy = (y - regionCY) / regionRY;
    const d = Math.sqrt(dx * dx + dy * dy);
    let f = 1 - d;
    if (f <= 0) return 0;
    f = Math.pow(Math.min(1, f * 1.35), 1.4);
    if (y > captionBandTop) {
      // fade threads out through the caption band
      const t = Math.min(1, (y - captionBandTop) / (H * 0.1));
      f *= 1 - t * 0.96;
    }
    return f;
  };

  // ---- soft radial glow behind the threads ---------------------------
  const glow = ctx.createRadialGradient(
    regionCX, regionCY, 0,
    regionCX, regionCY, minDim * 0.62,
  );
  glow.addColorStop(0, hexWithAlpha(palette.accent, darkGarment ? 0.12 : 0.08));
  glow.addColorStop(1, hexWithAlpha(palette.accent, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // ---- flow field ----------------------------------------------------
  const curlStrength = 0.6 + rand() * 1.4;
  const fieldFreq = 1.6 + rand() * 1.6;

  const angleAt = (x: number, y: number): number => {
    const u = x / W;
    const v = y / H;
    const base = noiseA(u * fieldFreq, v * fieldFreq) * TAU * 2;
    const dx = x - regionCX;
    const dy = y - regionCY;
    const dist = Math.sqrt(dx * dx + dy * dy) / minDim;
    const falloff = Math.exp(-dist * dist * 3.2);
    const curl = Math.atan2(dy, dx) + Math.PI / 2;
    const wobble = (noiseB(u * 4.5, v * 4.5) - 0.5) * 1.1;
    return base * (1 - falloff) + (curl * curlStrength + wobble) * falloff;
  };

  // ---- thread curves ---------------------------------------------------
  // Reference density is tuned for a 1200x1500 canvas; scale by sqrt(area).
  const areaFactor = Math.sqrt((W * H) / (1200 * 1500));
  const curveCount = Math.round(1250 * areaFactor * detailScale);
  const stepLen = minDim * 0.0085;
  const CHUNK = 6; // steps per stroke, so alpha can fade along a curve

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const colorCount = palette.colors.length;
  for (let i = 0; i < curveCount; i++) {
    // Start points drift toward the region centre for organic density.
    const clustered = rand() < 0.6;
    let x = clustered
      ? regionCX + (rand() + rand() - 1) * regionRX * 1.15
      : rand() * W;
    let y = clustered
      ? regionCY + (rand() + rand() - 1) * regionRY * 1.15
      : rand() * H * 0.86;
    if (x < 0 || x > W || y < 0 || y > H) continue;

    const steps = 20 + Math.floor(rand() * 70);
    const color = palette.colors[Math.floor(rand() * colorCount)];
    const widthBase = minDim * (0.0009 + rand() * 0.0018);
    const alpha = 0.5 + rand() * 0.4;

    ctx.lineWidth = widthBase;
    let drawn = 0;
    let chunkLen = 0;
    for (let s = 0; s < steps; s++) {
      const a = angleAt(x, y);
      x += Math.cos(a) * stepLen;
      y += Math.sin(a) * stepLen;
      if (x < 0 || x > W || y < 0 || y > H) break;
      if (chunkLen === 0) {
        const f = regionFade(x, y);
        if (f <= 0.02) continue; // invisible here; keep walking
        ctx.strokeStyle = hexWithAlpha(color, alpha * f);
        ctx.beginPath();
        ctx.moveTo(x - Math.cos(a) * stepLen, y - Math.sin(a) * stepLen);
        ctx.lineTo(x, y);
        chunkLen = 1;
      } else {
        ctx.lineTo(x, y);
        chunkLen += 1;
        if (chunkLen >= CHUNK) {
          ctx.stroke();
          drawn += 1;
          chunkLen = 0;
        }
      }
    }
    if (chunkLen > 0) ctx.stroke();
  }

  // ---- grain -----------------------------------------------------------
  const grainCount = Math.round(210 * areaFactor * detailScale);
  for (let i = 0; i < grainCount; i++) {
    const gx = rand() * W;
    const gy = rand() * H * 0.9;
    const f = regionFade(gx, gy);
    if (f <= 0.05) continue;
    const r = minDim * (0.0008 + rand() * 0.0014);
    const color = palette.colors[Math.floor(rand() * colorCount)];
    ctx.fillStyle = hexWithAlpha(color, (0.3 + rand() * 0.5) * f);
    ctx.beginPath();
    ctx.arc(gx, gy, r, 0, TAU);
    ctx.fill();
  }

  // ---- the seed mark: concentric broken rings ---------------------------
  const markR = minDim * 0.034;
  const markX = W / 2;
  const markY = H * 0.865;
  ctx.strokeStyle = hexWithAlpha(palette.accent, 0.95);
  for (let ring = 0; ring < 3; ring++) {
    const r = markR * (0.55 + ring * 0.42);
    const start = rand() * TAU;
    const span = TAU * (0.35 + rand() * 0.55);
    ctx.lineWidth = minDim * 0.0018;
    ctx.beginPath();
    ctx.arc(markX, markY, r, start, start + span);
    ctx.stroke();
  }

  // ---- caption: the word itself ------------------------------------------
  if (caption) {
    const label = word.toUpperCase();
    const ink = darkGarment ? '#f4f1e8' : '#16161a';
    const fontSize = Math.round(minDim * 0.03);
    ctx.font = `${fontSize}px ${captionFont}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const spacing = fontSize * 0.46;
    let total = 0;
    for (const ch of label) total += ctx.measureText(ch).width + spacing;
    total -= spacing;
    let cx = (W - total) / 2;
    const cy = H * 0.945;
    ctx.fillStyle = hexWithAlpha(ink, 0.94);
    for (const ch of label) {
      ctx.fillText(ch, cx, cy);
      cx += ctx.measureText(ch).width + spacing;
    }
  }
}

function hexWithAlpha(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, alpha))})`;
}
