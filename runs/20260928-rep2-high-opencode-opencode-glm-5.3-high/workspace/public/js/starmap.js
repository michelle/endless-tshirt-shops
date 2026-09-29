// Nightshift's print renderer. Draws the same design at any resolution —
// the live preview and the 300 DPI print file are the same drawing, so what
// the customer approves is exactly what ships. The canvas is transparent
// everywhere except the sky disc and text; on light garments the margins
// stay unprinted, on dark ones Prodigi lays a white underbase behind the ink.
//
// Layout is authored in a fixed 3600 x 4800 design space (the print's pixel
// size) and scaled to whatever canvas it lands on.

import {
  toJulian,
  lstDeg,
  hadecToAltaz,
  altazToDisc,
  localToUTC,
  sunEquatorial,
  moonState,
  mod,
} from './starmath.js';
import { STARS } from './stars.js';
import { CONSTELLATION_LINES } from './constellations.js';

const DESIGN_W = 3600;
const DESIGN_H = 4800;

// Warm parchment ink for dark garments; themes carry their own for light ones.
const INK_ON_DARK = { text: '#f0ecdf', ring: '#d9d4c3' };

export function inkColors(theme, ink) {
  if (ink === 'light') return { text: INK_ON_DARK.text, ring: INK_ON_DARK.ring };
  return { text: theme.text, ring: theme.ring };
}

function phaseName(elongationDeg, illum) {
  const e = mod(elongationDeg, 360);
  if (illum < 0.06) return 'new moon';
  if (illum > 0.94) return 'full moon';
  const names = [
    'new moon', // 0-22.5
    'waxing crescent',
    'first quarter',
    'waxing gibbous',
    'full moon',
    'waning gibbous',
    'last quarter',
    'waning crescent',
  ];
  return names[Math.floor(((e + 22.5) % 360) / 45)];
}

// The resolved sky for a design spec — everything the renderer and the
// product page need, computed once.
export function computeSky(spec) {
  const utc = localToUTC(spec.wallISO, spec.timezone);
  if (!utc) return null;
  const jd = toJulian(utc.ms);
  const lst = lstDeg(jd, spec.lng);
  const sun = sunEquatorial(jd);
  const moon = moonState(jd, sun);
  const project = (ra, dec) => {
    const { altDeg, azDeg } = hadecToAltaz(ra, dec, lst, spec.lat);
    return { alt: altDeg, disc: altazToDisc(altDeg, azDeg) };
  };
  let visibleStars = 0;
  for (const [ra, dec] of STARS) {
    if (project(ra, dec).disc) visibleStars++;
  }
  const moonSky = project(moon.raDeg, moon.decDeg);
  const sunSky = project(sun.raDeg, sun.decDeg);
  return {
    jd,
    lst,
    sun,
    moon,
    sunSky,
    moonSky,
    visibleStars,
    moonPhase: phaseName(moon.elongationDeg, moon.illumFraction),
    moonUp: Boolean(moonSky.disc),
    moonIllum: moon.illumFraction,
    project,
    utcMs: utc.ms,
    offsetMinutes: utc.offsetMinutes,
  };
}

// Draws the full design onto a 2D context of any pixel size.
export function renderSky(ctx, width, height, spec, theme, ink) {
  const sky = computeSky(spec);
  if (!sky) throw new Error('could not resolve the sky for this design');

  ctx.save();
  ctx.clearRect(0, 0, width, height);
  ctx.scale(width / DESIGN_W, height / DESIGN_H);
  const { text, ring } = inkColors(theme, ink);

  // ---- layout -------------------------------------------------------
  const cx = DESIGN_W / 2;
  const cy = 2040;
  const R = 1320;
  const at = ([ux, uy]) => [cx + ux * R, cy + uy * R];
  const project = (ra, dec) => {
    const p = sky.project(ra, dec);
    return p.disc ? at(p.disc) : null;
  };

function lerpColor(from, to, t) {
  const parse = (hex) => [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));
  const [r1, g1, b1] = parse(from);
  const [r2, g2, b2] = parse(to);
  const mix = (a, b) => Math.round(a + (b - a) * t);
  return `rgb(${mix(r1, r2)}, ${mix(g1, g2)}, ${mix(b1, b2)})`;
}

// ---- sky disc -----------------------------------------------------
// Painted as layered flat concentric circles (largest first) rather
// than one canvas gradient: browsers dither gradient fills, and that
// noise makes a 300-DPI PNG nearly incompressible (>4 MB). Flat layers
// look identical at print scale and compress to a fraction of the size.
const DISC_STEPS = 160;
for (let i = 0; i < DISC_STEPS; i++) {
  const t = i / (DISC_STEPS - 1);
  ctx.fillStyle = lerpColor(theme.disc.horizon, theme.disc.zenith, t);
  ctx.beginPath();
  ctx.arc(cx, cy, R * (1 - i / DISC_STEPS), 0, 2 * Math.PI);
  ctx.fill();
}

  // ---- stars --------------------------------------------------------
  const span = 5.25 - (-1.46); // catalogue magnitude range
  for (const [ra, dec, mag] of STARS) {
    const [x, y] = project(ra, dec) || [];
    if (x === undefined) continue;
    const bright = (5.25 - mag) / span; // 1 = brightest
    const radius = 2.6 + 8.0 * Math.max(0, bright);
    const alpha = 0.5 + 0.5 * bright;
    if (mag <= 1.0) {
      const halo = ctx.createRadialGradient(x, y, radius * 0.4, x, y, radius * 3.4);
      halo.addColorStop(0, theme.star.halo);
      halo.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = alpha * 0.5;
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(x, y, radius * 3.4, 0, 2 * Math.PI);
      ctx.fill();
    }
    ctx.globalAlpha = alpha;
    ctx.fillStyle = theme.star.core;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // ---- constellation stick figures ------------------------------------
  if (spec.showLines) {
    ctx.strokeStyle = theme.line;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (const figure of CONSTELLATION_LINES) {
      for (const line of figure) {
        let previous = null;
        for (const [ra, dec] of line) {
          const p = project(ra, dec);
          if (previous && p) {
            ctx.moveTo(previous[0], previous[1]);
            ctx.lineTo(p[0], p[1]);
          }
          previous = p;
        }
      }
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // ---- the Moon, with its real phase ---------------------------------
  if (spec.showMoon && sky.moonUp) {
    const [mx, my] = project(sky.moon.raDeg, sky.moon.decDeg);
    // Local scale: how far a small angular step moves on the projected disc.
    const [px] = project(sky.moon.raDeg, sky.moon.decDeg + sky.moon.angularRadiusDeg) || [];
    let mr = px !== undefined ? Math.abs(px - mx) : R * 0.028;
    mr = Math.max(mr, R * 0.02);
    const glow = ctx.createRadialGradient(mx, my, mr * 0.6, mx, my, mr * 2.8);
    glow.addColorStop(0, theme.star.halo);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(mx, my, mr * 2.8, 0, 2 * Math.PI);
    ctx.fill();
    // Earthshine: the whole disc, barely there.
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = theme.star.core;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(mx, my, mr, 0, 2 * Math.PI);
    ctx.stroke();
    // Lit crescent: right half-disc plus a terminator ellipse whose
    // semi-width |2k-1|*r collapses to a straight edge at quarter moons.
    const f = 2 * sky.moonIllum - 1;
    const sunPoint = sky.sunSky.disc ? at(sky.sunSky.disc) : null;
    const towardSun = sunPoint
      ? Math.atan2(sunPoint[1] - my, sunPoint[0] - mx)
      : Math.atan2(-my, -mx); // sun below the horizon: fall back to anti-zenith
    ctx.save();
    ctx.translate(mx, my);
    ctx.rotate(towardSun);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#f7f2e2';
    ctx.beginPath();
    ctx.moveTo(0, -mr);
    ctx.arc(0, 0, mr, -Math.PI / 2, Math.PI / 2, false);
    ctx.ellipse(0, 0, Math.abs(f) * mr, mr, 0, Math.PI / 2, -Math.PI / 2, f <= 0);
    ctx.closePath();
    ctx.fill();
    if (mr > 24) {
      ctx.fillStyle = 'rgba(148,140,120,0.35)';
      for (const [ox, oy, rr] of [
        [-0.32, 0.18, 0.16],
        [0.24, -0.36, 0.13],
        [0.1, 0.34, 0.2],
        [-0.05, -0.08, 0.09],
      ]) {
        ctx.beginPath();
        ctx.arc(ox * mr, oy * mr, rr * mr, 0, 2 * Math.PI);
        ctx.fill();
      }
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  // ---- rings, ticks, cardinal points ----------------------------------
  ctx.strokeStyle = ring;
  ctx.lineWidth = 3.6;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, 2 * Math.PI);
  ctx.stroke();
  ctx.lineWidth = 1.3;
  ctx.globalAlpha = 0.75;
  ctx.beginPath();
  ctx.arc(cx, cy, R + 22, 0, 2 * Math.PI);
  ctx.stroke();
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  for (let deg = 0; deg < 360; deg += 15) {
    const major = deg % 90 === 0;
    const a = (deg * Math.PI) / 180;
    const r0 = R + 22;
    const r1 = R + (major ? 64 : 44);
    ctx.moveTo(cx + r0 * Math.sin(a), cy - r0 * Math.cos(a));
    ctx.lineTo(cx + r1 * Math.sin(a), cy - r1 * Math.cos(a));
  }
  ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.fillStyle = ring;
  ctx.font = '600 84px "Cormorant Garamond", Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const [label, deg] of [
    ['N', 0],
    ['E', 90],
    ['S', 180],
    ['W', 270],
  ]) {
    const a = (deg * Math.PI) / 180;
    drawSpaced(ctx, label, cx + (R + 96) * Math.sin(a), cy - (R + 96) * Math.cos(a), 14);
  }

  // ---- text ---------------------------------------------------------
  ctx.fillStyle = text;

  drawSpaced(ctx, 'THE SKY ABOVE', cx, 420, 20, '500 46px Inter, system-ui, sans-serif', 0.78);

  fitText(ctx, spec.title.toUpperCase(), cx, 3768, {
    font: '600 168px "Cormorant Garamond", Georgia, serif',
    maxWidth: 2980,
    minSize: 68,
  });

  // divider: rule — diamond — rule
  ctx.globalAlpha = 0.65;
  ctx.strokeStyle = text;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - 560, 3888);
  ctx.lineTo(cx - 46, 3888);
  ctx.moveTo(cx + 46, 3888);
  ctx.lineTo(cx + 560, 3888);
  ctx.stroke();
  ctx.save();
  ctx.translate(cx, 3888);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = text;
  ctx.fillRect(-11, -11, 22, 22);
  ctx.restore();
  ctx.globalAlpha = 1;

  fitText(ctx, spec.placeLabel.toUpperCase(), cx, 4002, {
    font: '500 58px Inter, system-ui, sans-serif',
    spacing: 7,
    maxWidth: 3000,
    minSize: 34,
    alpha: 0.94,
  });

  const coords = formatCoords(spec.lat, spec.lng);
  drawSpaced(ctx, coords.toUpperCase(), cx, 4118, 5, '400 42px Inter, system-ui, sans-serif', 0.6);

  ctx.restore();
  return sky;
}

// Letter-spaced text, centered at x — drawn per character because canvas
// letterSpacing is still unevenly supported.
function drawSpaced(ctx, text, x, y, spacing, font = null, alpha = 1) {
  if (font) ctx.font = font;
  ctx.globalAlpha = alpha;
  const widths = [...text].map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (text.length - 1);
  let cursor = x - total / 2;
  const previousAlign = ctx.textAlign;
  ctx.textAlign = 'left';
  for (const [index, ch] of [...text].entries()) {
    ctx.fillText(ch, cursor, y);
    cursor += widths[index] + spacing;
  }
  ctx.textAlign = previousAlign;
  ctx.globalAlpha = 1;
}

// Draw centered text, shrinking it to fit maxWidth, with optional tracking.
function fitText(ctx, text, x, y, { font, spacing = 0, maxWidth = 3000, minSize = 40, alpha = 1 }) {
  ctx.font = font;
  const raw =
    ctx.measureText(text).width + spacing * Math.max(0, [...text].length - 1);
  if (raw > maxWidth) {
    const size = parseFontSize(font);
    const scaled = Math.max(minSize, Math.floor((size * maxWidth) / raw));
    font = font.replace(/(\d+)px/, `${scaled}px`);
    ctx.font = font;
  }
  drawSpaced(ctx, text, x, y, spacing, font, alpha);
}

function parseFontSize(font) {
  const match = font.match(/(\d+)px/);
  return match ? Number(match[1]) : 60;
}

function formatCoords(lat, lng) {
  const ns = lat >= 0 ? 'N' : 'S';
  const ew = lng >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(3)}° ${ns} · ${Math.abs(lng).toFixed(3)}° ${ew}`;
}
