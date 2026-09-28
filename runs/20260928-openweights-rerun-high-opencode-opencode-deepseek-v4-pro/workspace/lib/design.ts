// Renders the custom moon-phase design to a PNG using @napi-rs/canvas.
//
// The design is fully deterministic given its parameters, so the same URL
// always produces the same image — which is what lets us hand Prodigi a
// stable, publicly-accessible asset URL at checkout time.

import { createCanvas, GlobalFonts, SKRSContext2D } from '@napi-rs/canvas';
import { moonInfo, parseNight, formatDate } from './moon';
import { cormorant600, montserrat400, montserrat500 } from './fonts';
import { DesignParams, WIDTH, HEIGHT } from './design-params';

let fontsRegistered = false;
function ensureFonts() {
  if (fontsRegistered) return;
  GlobalFonts.register(Buffer.from(cormorant600, 'base64'), 'Cormorant Garamond');
  GlobalFonts.register(Buffer.from(montserrat500, 'base64'), 'Montserrat');
  GlobalFonts.register(Buffer.from(montserrat400, 'base64'), 'Montserrat');
  fontsRegistered = true;
}

interface Ink {
  main: string;
  crater: string;
  star: string;
}

const INKS: Record<'light' | 'dark', Ink> = {
  light: { main: '#f2e9d8', crater: '#d8ccb2', star: '#f2e9d8' },
  dark: { main: '#1b1a2e', crater: '#2c2b45', star: '#1b1a2e' },
};

// Deterministic PRNG (mulberry32) so the star field is stable per date.
function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Fixed crater positions (normalised to the moon radius), so the moon looks
// consistent across phases.
const CRATERS: Array<{ x: number; y: number; r: number }> = [
  { x: 0.35, y: -0.3, r: 0.15 },
  { x: -0.2, y: -0.45, r: 0.11 },
  { x: 0.5, y: 0.15, r: 0.19 },
  { x: -0.4, y: 0.1, r: 0.13 },
  { x: 0.15, y: 0.4, r: 0.1 },
  { x: -0.1, y: -0.08, r: 0.07 },
  { x: 0.62, y: -0.5, r: 0.09 },
  { x: -0.52, y: -0.2, r: 0.08 },
  { x: 0.3, y: 0.55, r: 0.12 },
  { x: -0.3, y: 0.45, r: 0.09 },
  { x: 0.05, y: 0.18, r: 0.06 },
  { x: 0.72, y: 0.3, r: 0.07 },
  { x: -0.6, y: 0.35, r: 0.1 },
  { x: 0.45, y: -0.6, r: 0.08 },
];

function drawMoon(
  ctx: SKRSContext2D,
  cx: number,
  cy: number,
  R: number,
  phase: number,
  ink: Ink,
) {
  const theta = 2 * Math.PI * phase;
  const sinT = Math.sin(theta);
  const cosT = Math.cos(theta);
  const a = R * Math.abs(cosT); // terminator semi-minor axis
  const illum = (1 - cosT) / 2;

  // Ghost of the full disc (the "dark side"), so the moon's shape reads even
  // when nearly new.
  ctx.save();
  ctx.globalAlpha = 0.14;
  ctx.fillStyle = ink.main;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, 2 * Math.PI);
  ctx.fill();
  ctx.restore();

  // Lit lune.
  const waxing = sinT >= 0;
  const terminatorRight = Math.sin(2 * theta) >= 0;

  const buildLune = () => {
    ctx.beginPath();
    if (waxing) {
      ctx.arc(cx, cy, R, -Math.PI / 2, Math.PI / 2, false); // right limb
    } else {
      ctx.arc(cx, cy, R, -Math.PI / 2, Math.PI / 2, true); // left limb
    }
    if (terminatorRight) {
      ctx.ellipse(cx, cy, a, R, 0, Math.PI / 2, -Math.PI / 2, true);
    } else {
      ctx.ellipse(cx, cy, a, R, 0, Math.PI / 2, (3 * Math.PI) / 2, false);
    }
    ctx.closePath();
  };

  if (illum > 0.004 && illum < 0.996) {
    buildLune();
    ctx.fillStyle = ink.main;
    ctx.fill();

    // Craters, clipped to the lit region.
    ctx.save();
    buildLune();
    ctx.clip();
    ctx.fillStyle = ink.crater;
    for (const c of CRATERS) {
      ctx.beginPath();
      ctx.arc(cx + c.x * R, cy + c.y * R, c.r * R, 0, 2 * Math.PI);
      ctx.fill();
    }
    ctx.restore();
  } else if (illum >= 0.996) {
    // Full moon.
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, 2 * Math.PI);
    ctx.fillStyle = ink.main;
    ctx.fill();
    ctx.fillStyle = ink.crater;
    for (const c of CRATERS) {
      ctx.beginPath();
      ctx.arc(cx + c.x * R, cy + c.y * R, c.r * R, 0, 2 * Math.PI);
      ctx.fill();
    }
  }
  // New moon: only the ghost is drawn.
}

function drawStars(
  ctx: SKRSContext2D,
  seed: number,
  ink: Ink,
  moonCx: number,
  moonCy: number,
  moonR: number,
) {
  const rand = mulberry32(seed);
  const count = 150;
  for (let i = 0; i < count; i++) {
    const x = 60 + rand() * (WIDTH - 120);
    const y = 60 + rand() * 2500;
    // Keep stars off the moon disc.
    const dx = x - moonCx;
    const dy = y - moonCy;
    if (dx * dx + dy * dy < (moonR + 50) * (moonR + 50)) continue;
    const r = 1 + rand() * 3.2;
    const alpha = 0.25 + rand() * 0.75;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = ink.star;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * Math.PI);
    ctx.fill();
    ctx.restore();
  }
}

function fitFontSize(
  ctx: SKRSContext2D,
  text: string,
  fontFamily: string,
  maxWidth: number,
  startSize: number,
  minSize: number,
): number {
  let size = startSize;
  while (size > minSize) {
    ctx.font = `${size}px "${fontFamily}"`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 4;
  }
  return size;
}

export function renderDesign(params: DesignParams): Buffer {
  ensureFonts();

  const ink = INKS[params.ink];
  const date = parseNight(params.date);
  const info = moonInfo(date);

  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');

  // Transparent background (the garment colour shows through).
  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  const moonCx = WIDTH / 2;
  const moonCy = 1500;
  const moonR = 800;

  drawStars(ctx, hashString(params.date), ink, moonCx, moonCy, moonR);
  drawMoon(ctx, moonCx, moonCy, moonR, info.phase, ink);

  // Text block.
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  const title = params.title.trim() || 'The Night We Met';
  const titleSize = fitFontSize(ctx, title, 'Cormorant Garamond', 2600, 150, 72);
  ctx.fillStyle = ink.main;
  ctx.font = `${titleSize}px "Cormorant Garamond"`;
  ctx.fillText(title, WIDTH / 2, 2900);

  ctx.font = '60px "Montserrat"';
  ctx.fillText(formatDate(date), WIDTH / 2, 3200);

  if (params.place && params.place.trim()) {
    ctx.font = '52px "Montserrat"';
    ctx.globalAlpha = 0.85;
    ctx.fillText(params.place.trim(), WIDTH / 2, 3380);
    ctx.globalAlpha = 1;
  }

  return canvas.toBuffer('image/png');
}
