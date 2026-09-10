// Deterministic generative-art engine: turns a phrase + subtitle into a
// unique constellation artwork. Same input -> byte-identical layout, always
// (this is the core "product") which also means orders are re-creatable.

import { getPalette } from "./palettes";

export const CANVAS_ASPECT = 0.8; // width / height, close to Prodigi's front print area

// FNV-1a 32-bit hash, deterministic across platforms.
function hashString(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// mulberry32 PRNG
function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function sanitizeText(input, maxLen) {
  return (input || "")
    .replace(/[^\p{L}\p{N}\s.,'&\-!?]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLen);
}

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// Build the deterministic star field + connection graph for a phrase/subtitle
// pair. Returns normalized (0-1) coordinates so it can be drawn at any
// resolution.
export function buildLayout({ phrase, subtitle }) {
  const p = sanitizeText(phrase, 24) || "Your Story";
  const s = sanitizeText(subtitle, 30) || "";
  const seed = hashString(`${p.toLowerCase()}|${s.toLowerCase()}`);
  const rand = mulberry32(seed);

  const lettersOnly = (p + s).replace(/\s/g, "").length;
  const starCount = Math.max(10, Math.min(22, 9 + Math.round(lettersOnly * 0.6)));

  const stars = [];
  let attempts = 0;
  while (stars.length < starCount && attempts < starCount * 40) {
    attempts++;
    const candidate = {
      x: 0.12 + rand() * 0.76,
      y: 0.08 + rand() * 0.5,
      r: 0.006 + rand() * 0.015,
      brightness: 0.55 + rand() * 0.45,
    };
    const tooClose = stars.some((st) => dist(st, candidate) < 0.075);
    if (!tooClose) stars.push(candidate);
  }

  // Greedy nearest-neighbor path through all stars (classic constellation look)
  const order = [Math.floor(rand() * stars.length)];
  const remaining = new Set(stars.map((_, i) => i));
  remaining.delete(order[0]);
  while (remaining.size) {
    const last = stars[order[order.length - 1]];
    let best = -1;
    let bestD = Infinity;
    for (const i of remaining) {
      const d = dist(last, stars[i]);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    order.push(best);
    remaining.delete(best);
  }
  const lines = [];
  for (let i = 0; i < order.length - 1; i++) lines.push([order[i], order[i + 1]]);

  // A few extra chords for a richer web, deterministic & sparse.
  const extra = Math.floor(stars.length / 5);
  for (let i = 0; i < extra; i++) {
    const a = Math.floor(rand() * stars.length);
    const b = Math.floor(rand() * stars.length);
    if (a !== b && rand() > 0.4) lines.push([a, b]);
  }

  const brightestIdx = [...stars.keys()]
    .sort((a, b) => stars[b].brightness - stars[a].brightness)
    .slice(0, 3);

  return { phrase: p, subtitle: s, seed, stars, lines, brightestIdx, starCount };
}

function drawSparkle(ctx, x, y, size, color) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const grad = ctx.createRadialGradient(x, y, 0, x, y, size);
  grad.addColorStop(0, color);
  grad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1, size * 0.08);
  ctx.beginPath();
  ctx.moveTo(x - size * 1.6, y);
  ctx.lineTo(x + size * 1.6, y);
  ctx.moveTo(x, y - size * 1.6);
  ctx.lineTo(x, y + size * 1.6);
  ctx.stroke();
  ctx.restore();
}

function fitFontSize(ctx, text, maxWidth, startPx, fontFamily, weight) {
  let size = startPx;
  ctx.font = `${weight} ${size}px ${fontFamily}`;
  while (ctx.measureText(text).width > maxWidth && size > 10) {
    size -= 1;
    ctx.font = `${weight} ${size}px ${fontFamily}`;
  }
  return size;
}

function drawSpacedText(ctx, text, cx, y, letterSpacingPx) {
  const widths = [...text].map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + letterSpacingPx * (text.length - 1);
  let x = cx - total / 2;
  for (let i = 0; i < text.length; i++) {
    ctx.textAlign = "left";
    ctx.fillText(text[i], x, y);
    x += widths[i] + letterSpacingPx;
  }
}

// Draws the full artwork onto a 2D canvas context sized `width` x `height`.
// `shirtIsDark` picks the ink variant with the best contrast.
export function drawConstellation(ctx, { width, height, layout, paletteKey, shirtIsDark, serifFont = '"Cormorant Garamond", Georgia, serif', sansFont = '"Space Grotesk", Arial, sans-serif' }) {
  const palette = getPalette(paletteKey);
  const ink = shirtIsDark ? palette.dark : palette.light;
  const { stars, lines, brightestIdx, phrase, subtitle } = layout;

  ctx.clearRect(0, 0, width, height);

  // connecting lines
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.strokeStyle = ink.line;
  ctx.lineWidth = width * 0.0016;
  ctx.lineCap = "round";
  for (const [a, b] of lines) {
    ctx.beginPath();
    ctx.moveTo(stars[a].x * width, stars[a].y * height);
    ctx.lineTo(stars[b].x * width, stars[b].y * height);
    ctx.stroke();
  }
  ctx.restore();

  // stars
  stars.forEach((st, i) => {
    const x = st.x * width;
    const y = st.y * height;
    const r = st.r * width;
    const color = ink.stars[i % ink.stars.length];
    if (brightestIdx.includes(i)) {
      drawSparkle(ctx, x, y, r * 5.5, ink.glow);
    }
    ctx.save();
    ctx.globalAlpha = st.brightness;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  // phrase
  const maxTextWidth = width * 0.84;
  const phraseSize = fitFontSize(ctx, phrase, maxTextWidth, width * 0.11, serifFont, 700);
  ctx.font = `700 ${phraseSize}px ${serifFont}`;
  ctx.fillStyle = ink.text;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  const phraseY = height * 0.74;
  ctx.fillText(phrase, width / 2, phraseY);

  // divider
  const dividerY = phraseY + phraseSize * 0.5;
  ctx.save();
  ctx.strokeStyle = ink.line;
  ctx.globalAlpha = 0.8;
  ctx.lineWidth = width * 0.0018;
  const dividerHalf = width * 0.09;
  ctx.beginPath();
  ctx.moveTo(width / 2 - dividerHalf, dividerY);
  ctx.lineTo(width / 2 - width * 0.02, dividerY);
  ctx.moveTo(width / 2 + width * 0.02, dividerY);
  ctx.lineTo(width / 2 + dividerHalf, dividerY);
  ctx.stroke();
  ctx.fillStyle = ink.line;
  ctx.beginPath();
  ctx.arc(width / 2, dividerY, width * 0.006, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // subtitle
  if (subtitle) {
    const subtitleText = subtitle.toUpperCase();
    const subtitleSize = fitFontSize(ctx, subtitleText, maxTextWidth, width * 0.032, sansFont, 500);
    ctx.font = `500 ${subtitleSize}px ${sansFont}`;
    ctx.fillStyle = ink.text;
    ctx.save();
    ctx.globalAlpha = 0.85;
    drawSpacedText(ctx, subtitleText, width / 2, dividerY + subtitleSize * 1.8, subtitleSize * 0.35);
    ctx.restore();
  }
}
