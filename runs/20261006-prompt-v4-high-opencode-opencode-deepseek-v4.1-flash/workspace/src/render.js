// Echoform artwork engine.
// Renders the print-ready design (transparent PNG) and a shirt mockup preview
// using @napi-rs/canvas with bundled web fonts.

import { createCanvas, GlobalFonts, Path2D } from '@napi-rs/canvas';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { resolveTheme, GARMENTS } from './brand.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FONT_DIR = path.join(__dirname, '..', 'fonts');

let fontsReady = false;
export function registerFonts() {
  if (fontsReady) return;
  const reg = (file, family) => {
    try {
      GlobalFonts.registerFromPath(path.join(FONT_DIR, file), family);
    } catch (err) {
      console.warn('font register failed', file, err.message);
    }
  };
  reg('grotesk-700-normal.ttf', 'Grotesk');
  reg('grotesk-500-normal.ttf', 'GroteskMed');
  reg('playfair-400-normal.ttf', 'Playfair');
  reg('playfair-700-normal.ttf', 'PlayfairBold');
  reg('playfair-900-normal.ttf', 'PlayfairBlack');
  reg('playfair-400-italic.ttf', 'PlayfairItalic');
  reg('playfair-700-italic.ttf', 'PlayfairBoldItalic');
  reg('inter-400-normal.ttf', 'Inter');
  reg('inter-500-normal.ttf', 'InterMed');
  reg('inter-600-normal.ttf', 'InterSemi');
  reg('inter-700-normal.ttf', 'InterBold');
  reg('mono-400-normal.ttf', 'Mono');
  reg('mono-700-normal.ttf', 'MonoBold');
  reg('mono-400-italic.ttf', 'MonoItalic');
  fontsReady = true;
}

// ---------------------------------------------------------------------------
// deterministic signal generation
// ---------------------------------------------------------------------------

function hashStr(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Turn a phrase into a deterministic, organic-looking audio envelope.
export function buildSignal(text, variant, n) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim() || 'echoform';
  const rnd = mulberry32(hashStr(clean.toLowerCase() + '#' + variant));
  const raw = new Float64Array(n);

  // multi-octave value noise => speech-like rhythm
  const octaves = [5, 11, 23, 47, 89];
  for (const o of octaves) {
    const pts = new Float64Array(o + 1);
    for (let i = 0; i <= o; i++) pts[i] = rnd();
    const weight = 1 / o;
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * o;
      const i0 = Math.floor(x);
      const f = x - i0;
      const a = pts[i0];
      const b = pts[Math.min(i0 + 1, o)];
      const s = f * f * (3 - 2 * f);
      raw[i] += (a + (b - a) * s) * weight;
    }
  }

  // per-character modulation ties the shape to the actual words
  const chars = clean;
  for (let i = 0; i < n; i++) {
    const ci = Math.floor((i / n) * chars.length);
    const cc = chars.charCodeAt(ci) || 32;
    const f = 0.55 + 0.45 * (((cc * 7) % 17) / 16);
    raw[i] *= f;
  }

  // syllable envelope: one burst per word, with pauses between
  const words = Math.max(1, clean.split(' ').filter(Boolean).length);
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const env = 0.62 + 0.38 * Math.abs(Math.sin(Math.PI * words * t + 0.4));
    raw[i] *= env;
  }

  // smooth
  const out = new Float64Array(n);
  const k = Math.max(1, Math.round(n / 240));
  for (let i = 0; i < n; i++) {
    let acc = 0;
    let c = 0;
    for (let j = -k; j <= k; j++) {
      const idx = i + j;
      if (idx >= 0 && idx < n) {
        acc += raw[idx];
        c++;
      }
    }
    out[i] = acc / c;
  }

  // normalise to 0..1
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of out) {
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  const span = hi - lo || 1;
  for (let i = 0; i < n; i++) out[i] = (out[i] - lo) / span;
  return out;
}

// ---------------------------------------------------------------------------
// colour helpers
// ---------------------------------------------------------------------------

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const v = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}
function mix(a, b, t) {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  const c = A.map((x, i) => Math.round(x + (B[i] - x) * t));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}
function rgba(hex, alpha) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ---------------------------------------------------------------------------
// text helpers
// ---------------------------------------------------------------------------

function trackedWidth(ctx, text, tracking) {
  let w = 0;
  for (const ch of text) w += ctx.measureText(ch).width + tracking;
  return w - tracking;
}

function drawTracked(ctx, text, x, y, tracking, align = 'left') {
  const total = trackedWidth(ctx, text, tracking);
  let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  for (const ch of text) {
    ctx.fillText(ch, cx, y);
    cx += ctx.measureText(ch).width + tracking;
  }
}

function wrap(ctx, text, maxWidth) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width <= maxWidth || !line) {
      line = test;
    } else {
      lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// ---------------------------------------------------------------------------
// artwork
// ---------------------------------------------------------------------------

function drawSoundprint(ctx, cx, cy, R, theme, signal, serial) {
  const n = 220;
  const inner = R * 0.52;
  const maxLen = R - inner;
  const lineW = Math.max(2, R * 0.022);
  ctx.lineCap = 'round';

  // soft inner disc
  const disc = ctx.createRadialGradient(cx, cy, inner * 0.1, cx, cy, R);
  disc.addColorStop(0, rgba(theme.a, 0.1));
  disc.addColorStop(0.75, rgba(theme.b, 0.05));
  disc.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fill();

  // radial bars
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const idx = Math.floor(t * signal.length);
    const a = 0.1 + 0.9 * signal[idx];
    const angle = -Math.PI / 2 + t * Math.PI * 2;
    const x1 = cx + Math.cos(angle) * inner;
    const y1 = cy + Math.sin(angle) * inner;
    const x2 = cx + Math.cos(angle) * (inner + a * maxLen);
    const y2 = cy + Math.sin(angle) * (inner + a * maxLen);
    const col = mix(theme.a, theme.b, 0.5 + 0.5 * Math.sin(t * Math.PI * 2 + 1.2));
    ctx.strokeStyle = col;
    ctx.globalAlpha = 0.92;
    ctx.lineWidth = lineW;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // baseline ring
  ctx.strokeStyle = rgba(theme.ink, 0.32);
  ctx.lineWidth = Math.max(1.5, R * 0.006);
  ctx.beginPath();
  ctx.arc(cx, cy, inner, 0, Math.PI * 2);
  ctx.stroke();

  // outer hairline ring
  ctx.strokeStyle = rgba(theme.ink, 0.14);
  ctx.lineWidth = Math.max(1, R * 0.0035);
  ctx.beginPath();
  ctx.arc(cx, cy, R * 0.995, 0, Math.PI * 2);
  ctx.stroke();

  // cardinal ticks
  ctx.strokeStyle = rgba(theme.ink, 0.4);
  ctx.lineWidth = Math.max(1.5, R * 0.006);
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2 - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * (R * 0.94), cy + Math.sin(angle) * (R * 0.94));
    ctx.lineTo(cx + Math.cos(angle) * R, cy + Math.sin(angle) * R);
    ctx.stroke();
  }

  // centre: play glyph + duration
  const tri = inner * 0.34;
  ctx.fillStyle = theme.ink;
  ctx.beginPath();
  ctx.moveTo(cx - tri * 0.42, cy - tri * 0.62);
  ctx.lineTo(cx + tri * 0.7, cy);
  ctx.lineTo(cx - tri * 0.42, cy + tri * 0.62);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = rgba(theme.ink, 0.55);
  ctx.font = `${Math.round(R * 0.055)}px Mono`;
  ctx.textAlign = 'center';
  const dur = 0.1 + (signal.reduce((s, v) => s + v, 0) / signal.length) * 0.35;
  const mm = Math.floor(dur);
  const ss = String(Math.floor((dur - mm) * 60)).padStart(2, '0');
  drawTracked(ctx, `${mm}:${ss}`, cx, cy + inner * 0.62, R * 0.006, 'center');
  ctx.textAlign = 'left';
}

// Draw the full artwork into a canvas of size W x H.
export function renderArtwork(ctx, W, H, opts) {
  registerFonts();
  const theme = resolveTheme(opts.theme, opts.garment);
  const message = (opts.message || 'Always look up').slice(0, 90);
  const dedication = (opts.dedication || '').slice(0, 60);
  const serial = opts.serial || '000000';
  const variant = Number(opts.variant) || 0;

  ctx.clearRect(0, 0, W, H);
  ctx.textBaseline = 'alphabetic';

  const pad = W * 0.085;

  // ---- header ----
  const hy = H * 0.108;
  ctx.fillStyle = theme.ink;
  ctx.font = `${Math.round(W * 0.05)}px Grotesk`;
  drawTracked(ctx, 'ECHOFORM', pad, hy, W * 0.012);

  ctx.fillStyle = rgba(theme.ink, 0.5);
  ctx.font = `${Math.round(W * 0.0165)}px Mono`;
  drawTracked(ctx, 'THE SHAPE OF YOUR VOICE', pad, hy + W * 0.033, W * 0.006);

  ctx.fillStyle = rgba(theme.ink, 0.5);
  ctx.font = `${Math.round(W * 0.0165)}px Mono`;
  drawTracked(ctx, 'SOUNDPRINT', W - pad, hy - W * 0.028, W * 0.006, 'right');
  ctx.fillStyle = theme.ink;
  ctx.font = `${Math.round(W * 0.028)}px MonoBold`;
  drawTracked(ctx, `NO. ${serial}`, W - pad, hy + W * 0.012, W * 0.004, 'right');

  // hairline under header
  ctx.strokeStyle = rgba(theme.ink, 0.18);
  ctx.lineWidth = Math.max(1, W * 0.0012);
  ctx.beginPath();
  ctx.moveTo(pad, hy + W * 0.052);
  ctx.lineTo(W - pad, hy + W * 0.052);
  ctx.stroke();

  // ---- hero soundprint ----
  const cx = W / 2;
  const cy = H * 0.435;
  const R = W * 0.36;
  const signal = buildSignal(message, variant, 320);
  drawSoundprint(ctx, cx, cy, R, theme, signal, serial);

  // ---- phrase ----
  const maxTextW = W - pad * 2;
  const textTop = cy + R + H * 0.045;
  const textBottom = H * 0.845;
  let size = Math.round(H * 0.062);
  let lines = [];
  for (; size > H * 0.028; size -= Math.max(2, Math.round(size * 0.04))) {
    ctx.font = `${size}px Playfair`;
    lines = wrap(ctx, message, maxTextW);
    const lineH = size * 1.16;
    const totalH = lines.length * lineH;
    const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
    if (lines.length <= 3 && totalH <= textBottom - textTop && widest <= maxTextW) break;
  }
  ctx.font = `${size}px Playfair`;
  ctx.fillStyle = theme.ink;
  const lineH = size * 1.16;
  const blockH = lines.length * lineH;
  let ty = textTop + (textBottom - textTop - blockH) / 2 + size;
  ctx.textAlign = 'center';
  for (const line of lines) {
    ctx.fillText(line, cx, ty);
    ty += lineH;
  }
  ctx.textAlign = 'left';

  // ---- dedication / date ----
  ctx.fillStyle = theme.muted;
  ctx.font = `${Math.round(W * 0.019)}px Mono`;
  ctx.textAlign = 'center';
  const dateStr = new Date().toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).toUpperCase();
  const dedLine = dedication ? `“${dedication}”  ·  ${dateStr}` : dateStr;
  drawTracked(ctx, dedLine, cx, H * 0.885, W * 0.004, 'center');
  ctx.textAlign = 'left';

  // ---- footer ----
  ctx.strokeStyle = rgba(theme.ink, 0.18);
  ctx.lineWidth = Math.max(1, W * 0.0012);
  ctx.beginPath();
  ctx.moveTo(pad, H * 0.925);
  ctx.lineTo(W - pad, H * 0.925);
  ctx.stroke();

  ctx.fillStyle = rgba(theme.ink, 0.5);
  ctx.font = `${Math.round(W * 0.0165)}px Mono`;
  drawTracked(ctx, 'MADE TO ORDER', pad, H * 0.958, W * 0.006);
  drawTracked(ctx, 'DTG PRINTED · 1 OF 1', W - pad, H * 0.958, W * 0.006, 'right');
}

export const PRINT_W = 4680;
export const PRINT_H = 5790;

export function renderPrint(opts) {
  const canvas = createCanvas(PRINT_W, PRINT_H);
  const ctx = canvas.getContext('2d');
  renderArtwork(ctx, PRINT_W, PRINT_H, opts);
  return canvas.toBuffer('image/png');
}

// ---------------------------------------------------------------------------
// mockup
// ---------------------------------------------------------------------------

function drawShirt(ctx, W, H, garment) {
  const g = GARMENTS[garment] || GARMENTS.black;
  const X = (v) => v * W;
  const Y = (v) => v * H;

  // studio background
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#f6f4f1');
  bg.addColorStop(1, '#e7e3dd');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // soft shadow under shirt
  const sh = ctx.createRadialGradient(X(0.5), Y(0.94), 0, X(0.5), Y(0.94), W * 0.5);
  sh.addColorStop(0, 'rgba(0,0,0,0.16)');
  sh.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sh;
  ctx.beginPath();
  ctx.ellipse(X(0.5), Y(0.955), W * 0.42, H * 0.045, 0, 0, Math.PI * 2);
  ctx.fill();

  const shirt = new Path2D();
  shirt.moveTo(X(0.5), Y(0.085)); // neck centre front
  shirt.bezierCurveTo(X(0.455), Y(0.085), X(0.42), Y(0.088), X(0.395), Y(0.1));
  shirt.bezierCurveTo(X(0.36), Y(0.118), X(0.32), Y(0.13), X(0.285), Y(0.145));
  shirt.bezierCurveTo(X(0.22), Y(0.165), X(0.15), Y(0.2), X(0.105), Y(0.265));
  shirt.bezierCurveTo(X(0.085), Y(0.3), X(0.07), Y(0.345), X(0.075), Y(0.395));
  shirt.bezierCurveTo(X(0.14), Y(0.415), X(0.205), Y(0.425), X(0.255), Y(0.415));
  shirt.bezierCurveTo(X(0.255), Y(0.5), X(0.25), Y(0.6), X(0.248), Y(0.72));
  shirt.bezierCurveTo(X(0.246), Y(0.82), X(0.252), Y(0.9), X(0.256), Y(0.955));
  shirt.lineTo(X(0.744), Y(0.955));
  shirt.bezierCurveTo(X(0.748), Y(0.9), X(0.754), Y(0.82), X(0.752), Y(0.72));
  shirt.bezierCurveTo(X(0.75), Y(0.6), X(0.745), Y(0.5), X(0.745), Y(0.415));
  shirt.bezierCurveTo(X(0.795), Y(0.425), X(0.86), Y(0.415), X(0.925), Y(0.395));
  shirt.bezierCurveTo(X(0.93), Y(0.345), X(0.915), Y(0.3), X(0.895), Y(0.265));
  shirt.bezierCurveTo(X(0.85), Y(0.2), X(0.78), Y(0.165), X(0.715), Y(0.145));
  shirt.bezierCurveTo(X(0.68), Y(0.13), X(0.64), Y(0.118), X(0.605), Y(0.1));
  shirt.bezierCurveTo(X(0.58), Y(0.088), X(0.545), Y(0.085), X(0.5), Y(0.085));
  shirt.closePath();

  const base = ctx.createLinearGradient(X(0.25), 0, X(0.78), H);
  const light = shade(g.hex, 1.14);
  const dark = shade(g.hex, 0.8);
  base.addColorStop(0, dark);
  base.addColorStop(0.45, g.hex);
  base.addColorStop(0.72, light);
  base.addColorStop(1, shade(g.hex, 0.9));
  ctx.fillStyle = base;
  ctx.fill(shirt);

  // fabric folds
  ctx.save();
  ctx.clip(shirt);
  const fold = (x, w, alpha) => {
    const gr = ctx.createLinearGradient(X(x - w), 0, X(x + w), 0);
    gr.addColorStop(0, 'rgba(0,0,0,0)');
    gr.addColorStop(0.5, `rgba(0,0,0,${alpha})`);
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gr;
    ctx.fillRect(X(x - w), Y(0.3), X(w * 2), Y(0.68));
  };
  fold(0.28, 0.05, 0.1);
  fold(0.72, 0.05, 0.1);
  fold(0.5, 0.14, 0.05);
  // armpit shading
  const ap = ctx.createRadialGradient(X(0.26), Y(0.42), 0, X(0.26), Y(0.42), W * 0.1);
  ap.addColorStop(0, 'rgba(0,0,0,0.18)');
  ap.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = ap;
  ctx.fillRect(0, 0, W, H);
  const ap2 = ctx.createRadialGradient(X(0.74), Y(0.42), 0, X(0.74), Y(0.42), W * 0.1);
  ap2.addColorStop(0, 'rgba(0,0,0,0.18)');
  ap2.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = ap2;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  // collar ribbing (band between two arcs)
  const collar = new Path2D();
  collar.moveTo(X(0.392), Y(0.1));
  collar.bezierCurveTo(X(0.42), Y(0.158), X(0.58), Y(0.158), X(0.608), Y(0.1));
  collar.bezierCurveTo(X(0.575), Y(0.142), X(0.425), Y(0.142), X(0.392), Y(0.1));
  collar.closePath();
  ctx.fillStyle = shade(g.hex, g.dark ? 1.3 : 0.86);
  ctx.fill(collar);
  ctx.strokeStyle = 'rgba(0,0,0,0.14)';
  ctx.lineWidth = W * 0.002;
  ctx.stroke(collar);

  // seams: shoulders + sleeve joins + hem
  ctx.strokeStyle = 'rgba(0,0,0,0.1)';
  ctx.lineWidth = W * 0.0018;
  const seam = (pts) => {
    ctx.beginPath();
    ctx.moveTo(X(pts[0][0]), Y(pts[0][1]));
    for (let i = 1; i < pts.length; i++) ctx.lineTo(X(pts[i][0]), Y(pts[i][1]));
    ctx.stroke();
  };
  seam([[0.395, 0.104], [0.34, 0.126], [0.285, 0.145]]);
  seam([[0.285, 0.145], [0.268, 0.27], [0.255, 0.415]]);
  seam([[0.605, 0.104], [0.66, 0.126], [0.715, 0.145]]);
  seam([[0.715, 0.145], [0.732, 0.27], [0.745, 0.415]]);
  seam([[0.256, 0.955], [0.5, 0.948], [0.744, 0.955]]);

  // subtle outline
  ctx.strokeStyle = 'rgba(0,0,0,0.16)';
  ctx.lineWidth = W * 0.0025;
  ctx.stroke(shirt);
}

function shade(hex, f) {
  const h = hex.replace('#', '');
  const v = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = Math.min(255, Math.round(parseInt(v.slice(0, 2), 16) * f));
  const g = Math.min(255, Math.round(parseInt(v.slice(2, 4), 16) * f));
  const b = Math.min(255, Math.round(parseInt(v.slice(4, 6), 16) * f));
  return `rgb(${r},${g},${b})`;
}

export function renderMockup(opts) {
  registerFonts();
  const W = 1100;
  const H = 1300;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  drawShirt(ctx, W, H, opts.garment);

  // render artwork offscreen and composite onto chest
  const AW = 900;
  const AH = Math.round(AW / (PRINT_W / PRINT_H));
  const art = createCanvas(AW, AH);
  renderArtwork(art.getContext('2d'), AW, AH, opts);

  const designW = W * 0.5;
  const designH = designW / (PRINT_W / PRINT_H);
  const dx = (W - designW) / 2;
  const dy = H * 0.2;
  ctx.save();
  // clip to shirt so the print never spills off the garment
  ctx.beginPath();
  ctx.rect(dx, dy, designW, designH);
  ctx.clip();
  ctx.globalAlpha = 0.97;
  ctx.drawImage(art, dx, dy, designW, designH);
  ctx.restore();
  return canvas.toBuffer('image/png');
}
