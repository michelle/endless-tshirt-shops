'use strict';
const path = require('path');
const { GlobalFonts, createCanvas } = require('@napi-rs/canvas');
const { rngFrom, moonPhase, zodiacSign, CONSTELLATIONS, formatDateLong, formatCoords, hashSeed } = require('./util');

const FULL_W = 3600; // 12in @300dpi
const FULL_H = 4800; // 16in @300dpi

const PALETTES = {
  black: {
    bg: '#090c15', bgDeep: '#04060c', frame: 'rgba(216,196,138,0.9)', frameSoft: 'rgba(216,196,138,0.35)',
    ink: '#ece9df', dim: 'rgba(236,233,223,0.62)', faint: 'rgba(236,233,223,0.38)',
    star: '#ffffff', accent: '#d8c48a', shadow: '#05070d', glow: 'rgba(216,196,138,0.10)', dark: true,
  },
  navy: {
    bg: '#101f42', bgDeep: '#0a1430', frame: 'rgba(224,205,150,0.9)', frameSoft: 'rgba(224,205,150,0.35)',
    ink: '#f0ede3', dim: 'rgba(240,237,227,0.62)', faint: 'rgba(240,237,227,0.38)',
    star: '#ffffff', accent: '#e0cd96', shadow: '#0b1734', glow: 'rgba(224,205,150,0.10)', dark: true,
  },
  white: {
    bg: '#f5f2e9', bgDeep: '#e9e4d4', frame: 'rgba(43,58,96,0.85)', frameSoft: 'rgba(43,58,96,0.30)',
    ink: '#22335c', dim: 'rgba(34,51,92,0.62)', faint: 'rgba(34,51,92,0.40)',
    star: '#1e2c50', accent: '#7c6234', shadow: '#ddd7c4', glow: 'rgba(124,98,52,0.08)', dark: false,
  },
};

let fontsReady = false;
function loadFonts() {
  if (fontsReady) return;
  const base = path.join(__dirname, '..', 'node_modules', '@expo-google-fonts');
  const reg = (pkg, file, alias) => GlobalFonts.registerFromPath(path.join(base, pkg, file), alias);
  reg('playfair-display', '700Bold/PlayfairDisplay_700Bold.ttf', 'Playfair Display');
  reg('playfair-display', '400Regular/PlayfairDisplay_400Regular.ttf', 'Playfair Display Regular');
  reg('inter', '400Regular/Inter_400Regular.ttf', 'Inter');
  reg('inter', '600SemiBold/Inter_600SemiBold.ttf', 'Inter SemiBold');
  fontsReady = true;
}

// Letter-spaced text drawn glyph by glyph for even tracking.
function trackedText(ctx, text, cx, cy, font, tracking, fill) {
  ctx.font = font;
  ctx.fillStyle = fill;
  const chars = [...text];
  const widths = chars.map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + tracking * (chars.length - 1);
  let x = cx - total / 2;
  const prevAlign = ctx.textAlign;
  ctx.textAlign = 'left';
  chars.forEach((ch, i) => {
    ctx.fillText(ch, x, cy);
    x += widths[i] + tracking;
  });
  ctx.textAlign = prevAlign;
}

function fitFont(ctx, text, family, weight, startPx, maxWidth) {
  let size = startPx;
  while (size > 120) {
    ctx.font = `${weight} ${size}px ${family}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 20;
  }
  return size;
}

function drawSparkle(ctx, x, y, r, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = Math.max(2, r * 0.16);
  const L = r * 3.4;
  ctx.beginPath();
  ctx.moveTo(x - L, y); ctx.lineTo(x + L, y);
  ctx.moveTo(x, y - L); ctx.lineTo(x, y + L);
  ctx.stroke();
  ctx.globalAlpha = 0.5;
  ctx.lineWidth *= 0.5;
  const D = L * 0.55;
  ctx.beginPath();
  ctx.moveTo(x - D, y - D); ctx.lineTo(x + D, y + D);
  ctx.moveTo(x - D, y + D); ctx.lineTo(x + D, y - D);
  ctx.stroke();
  ctx.restore();
}

function starColor(rng, P) {
  if (!P.dark) return P.star;
  const t = rng();
  if (t < 0.68) return '#ffffff';
  if (t < 0.84) return '#cfdcf7';
  if (t < 0.96) return '#f7e9cf';
  return '#f3c9a6';
}

// Milky-way band: quadratic curve sampled for placement.
function bandPoint(t, W, H, y0, y1, bulge) {
  const x = W * (0.08 + 0.84 * t);
  const yBase = y0 + (y1 - y0) * t;
  const y = yBase - Math.sin(t * Math.PI) * bulge;
  return [x, y];
}

async function renderDesign(params, opts = {}) {
  loadFonts();
  const scale = (opts.width || FULL_W) / FULL_W;
  const W = Math.round(FULL_W * scale);
  const H = Math.round(FULL_H * scale);
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const P = PALETTES[params.bg] || PALETTES.black;
  const rng = rngFrom(['starstamp', params.name, params.date, params.city, params.lat, params.lng, params.bg]);
  const name = (params.name || 'YOU').trim().toUpperCase() || 'YOU';
  const city = (params.city || '').trim().toUpperCase();
  const moon = moonPhase(params.date);
  const sign = zodiacSign(params.date);
  const edition = hashSeed([params.name, params.date, params.city, params.lat, params.lng].join('|')).toString('hex').slice(0, 6).toUpperCase();

  // ---------- background ----------
  const grad = ctx.createLinearGradient(0, 0, 0, FULL_H);
  grad.addColorStop(0, P.bg);
  grad.addColorStop(1, P.bgDeep);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, FULL_W, FULL_H);

  const vg = ctx.createRadialGradient(FULL_W / 2, FULL_H * 0.55, 200, FULL_W / 2, FULL_H * 0.55, 2600);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.28)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, FULL_W, FULL_H);

  // ---------- frame ----------
  ctx.strokeStyle = P.frame;
  ctx.lineWidth = 7;
  ctx.strokeRect(115, 115, FULL_W - 230, FULL_H - 230);
  ctx.strokeStyle = P.frameSoft;
  ctx.lineWidth = 2.5;
  ctx.strokeRect(158, 158, FULL_W - 316, FULL_H - 316);

  const cornerStar = (x, y) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = P.accent;
    const s = 26;
    ctx.fillRect(-s / 2, -s / 2, s, s);
    ctx.restore();
  };
  cornerStar(136, 136); cornerStar(FULL_W - 136, 136);
  cornerStar(136, FULL_H - 136); cornerStar(FULL_W - 136, FULL_H - 136);

  // ---------- header ----------
  trackedText(ctx, 'STARSTAMP', FULL_W / 2, 305, '600 74px "Inter SemiBold"', 34, P.accent);

  trackedText(ctx, 'THE NIGHT SKY OVER', FULL_W / 2, 640, '400 84px "Inter"', 22, P.faint);

  const nameSize = fitFont(ctx, name, '"Playfair Display"', 700, 560, 2860);
  ctx.font = `700 ${nameSize}px "Playfair Display"`;
  ctx.fillStyle = P.ink;
  ctx.fillText(name, FULL_W / 2, 1020);

  trackedText(ctx, formatDateLong(params.date), FULL_W / 2, 1560, '400 76px "Inter"', 10, P.dim);
  if (city) trackedText(ctx, city, FULL_W / 2, 1715, '600 96px "Inter SemiBold"', 6, P.ink);
  trackedText(ctx, formatCoords(params.lat, params.lng), FULL_W / 2, 1855, '400 62px "Inter"', 12, P.faint);

  // divider ornament
  ctx.strokeStyle = P.frameSoft;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(700, 1985); ctx.lineTo(1650, 1985);
  ctx.moveTo(1950, 1985); ctx.lineTo(2900, 1985);
  ctx.stroke();
  ctx.save();
  ctx.translate(FULL_W / 2, 1985);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = P.accent;
  ctx.fillRect(-17, -17, 34, 34);
  ctx.restore();

  // ---------- star field ----------
  const fieldTop = 2120, fieldBottom = 4150, fieldX0 = 300, fieldX1 = FULL_W - 300;
  ctx.save();
  ctx.beginPath();
  ctx.rect(190, fieldTop - 140, FULL_W - 380, fieldBottom - fieldTop + 260);
  ctx.clip();

  const bandY0 = 3550, bandY1 = 2650, bandBulge = 420;
  const STAR_COUNT = 640;
  let drawn = 0, guard = 0;
  while (drawn < STAR_COUNT && guard++ < STAR_COUNT * 4) {
    let x, y;
    if (rng() < 0.38) { // milky way cluster
      const t = rng();
      const [bx, by] = bandPoint(t, FULL_W, FULL_H, bandY0, bandY1, bandBulge);
      const off = (rng() + rng() + rng() - 1.5) * 300;
      x = bx + off * 0.9;
      y = by + off;
    } else {
      x = fieldX0 + rng() * (fieldX1 - fieldX0);
      y = fieldTop + rng() * (fieldBottom - fieldTop);
    }
    if (x < fieldX0 || x > fieldX1 || y < fieldTop || y > fieldBottom) continue;
    const mag = rng();
    const r = mag < 0.82 ? 2 + rng() * 3.2 : mag < 0.96 ? 6 + rng() * 4 : 10 + rng() * 5;
    const a = mag < 0.82 ? 0.35 + rng() * 0.45 : 0.7 + rng() * 0.3;
    ctx.globalAlpha = a;
    ctx.fillStyle = starColor(rng, P);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    if (r > 13 && rng() < 0.75) drawSparkle(ctx, x, y, r, P.star);
    drawn++;
  }
  ctx.globalAlpha = 1;

  // faint band haze
  ctx.save();
  ctx.globalAlpha = P.dark ? 0.05 : 0.04;
  ctx.strokeStyle = P.dark ? '#aebfdc' : '#22335c';
  for (let i = 0; i < 5; i++) {
    ctx.lineWidth = 130 + i * 60;
    ctx.beginPath();
    for (let s = 0; s <= 20; s++) {
      const [px, py] = bandPoint(s / 20, FULL_W, FULL_H, bandY0, bandY1, bandBulge);
      if (s === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  ctx.restore();

  // occasional shooting star
  if (rng() < 0.45) {
    const sx = fieldX0 + rng() * 1800, sy = fieldTop + rng() * 900;
    const len = 380 + rng() * 320, ang = Math.PI * (0.18 + rng() * 0.14);
    const ex = sx + Math.cos(ang) * len, ey = sy + Math.sin(ang) * len;
    const lg = ctx.createLinearGradient(sx, sy, ex, ey);
    lg.addColorStop(0, P.dark ? 'rgba(255,255,255,0.9)' : 'rgba(34,51,92,0.8)');
    lg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.strokeStyle = lg;
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
  }
  ctx.restore();

  // ---------- zodiac constellation ----------
  const fig = CONSTELLATIONS[sign] || CONSTELLATIONS.ARIES;
  const cw = 1250, chh = 780, ccx = FULL_W / 2, ccy = 2620;
  ctx.save();
  ctx.strokeStyle = P.accent;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 4;
  for (const [a, b] of fig.lines) {
    ctx.beginPath();
    ctx.moveTo(ccx + (fig.stars[a][0] - 0.5) * cw, ccy + (fig.stars[a][1] - 0.5) * chh);
    ctx.lineTo(ccx + (fig.stars[b][0] - 0.5) * cw, ccy + (fig.stars[b][1] - 0.5) * chh);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  for (const [nx, ny] of fig.stars) {
    const x = ccx + (nx - 0.5) * cw, y = ccy + (ny - 0.5) * chh;
    ctx.fillStyle = P.star;
    ctx.beginPath(); ctx.arc(x, y, 13, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = P.star;
    ctx.globalAlpha = 0.4;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(x, y, 26, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  // ---------- moon (real phase) ----------
  if (moon) {
    const mx = FULL_W / 2, my = 3600, r = 320;
    ctx.save();
    const glowR = r * 2.7;
    const glow = ctx.createRadialGradient(mx, my, r * 0.6, mx, my, glowR);
    glow.addColorStop(0, P.glow);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(mx, my, glowR, 0, Math.PI * 2); ctx.fill();

    // lit disc
    const mg = ctx.createRadialGradient(mx - r * 0.35, my - r * 0.35, r * 0.2, mx, my, r);
    if (P.dark) {
      mg.addColorStop(0, '#f5f1e4');
      mg.addColorStop(1, '#cfc9b6');
    } else {
      mg.addColorStop(0, '#fdfbf4');
      mg.addColorStop(1, '#ddd7c2');
    }
    ctx.fillStyle = mg;
    ctx.beginPath(); ctx.arc(mx, my, r, 0, Math.PI * 2); ctx.fill();

    // craters (under the shadow, so they fade naturally)
    const crng = rngFrom(['craters', params.date]);
    ctx.globalAlpha = 0.10;
    ctx.fillStyle = P.dark ? '#8f8a78' : '#9a947f';
    for (let i = 0; i < 7; i++) {
      const a = crng() * Math.PI * 2, d = crng() * r * 0.75;
      ctx.beginPath();
      ctx.arc(mx + Math.cos(a) * d, my + Math.sin(a) * d, 12 + crng() * 34, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // shadow disc -> crescent/terminator
    const p = moon.fraction;
    const sx = moon.waxing ? mx - 4 * r * p : mx + 4 * r * (1 - p);
    ctx.fillStyle = P.shadow;
    ctx.beginPath(); ctx.arc(sx, my, r + 1, 0, Math.PI * 2); ctx.fill();

    // rim
    ctx.strokeStyle = P.dark ? 'rgba(255,255,255,0.25)' : 'rgba(34,51,92,0.25)';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(mx, my, r, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  // edition number, tucked into the field corner
  ctx.textAlign = 'right';
  ctx.font = '400 52px "Inter"';
  ctx.fillStyle = P.faint;
  ctx.fillText(`EDITION No. ${edition}`, FULL_W - 320, 4090);
  ctx.textAlign = 'center';

  // ---------- footer ----------
  const phaseLine = moon ? `${moon.label} MOON · ${sign}` : sign;
  trackedText(ctx, phaseLine, FULL_W / 2, 4320, '600 88px "Inter SemiBold"', 16, P.ink);
  trackedText(ctx, 'THIS SKY IS YOURS ALONE', FULL_W / 2, 4475, '400 58px "Inter"', 18, P.faint);

  return await canvas.encode('png');
}

module.exports = { renderDesign, FULL_W, FULL_H, PALETTES };
