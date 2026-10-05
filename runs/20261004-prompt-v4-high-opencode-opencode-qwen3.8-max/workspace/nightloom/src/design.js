'use strict';
/**
 * NightLoom design renderer.
 *
 * Renders the personalized star-map artwork to a transparent-background PNG.
 * One code path serves both the web preview (small, fast) and the print file
 * (4680 x 5790 px = the Bella+Canvas 3001 front print area at 300 dpi).
 *
 * Design space is defined in print pixels; everything scales with
 * s = width / 4680, so preview and print are identical compositions.
 */
const path = require('path');
const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');
const config = require('./config');
const { computeSky } = require('./astro');

/* ---------- fonts ---------- */

const FONT_DIR = path.join(config.ROOT, 'public', 'fonts');
const FONT_FILES = [
  ['Cinzel-Regular', 'Cinzel-Regular.ttf'],
  ['Cinzel-SemiBold', 'Cinzel-SemiBold.ttf'],
  ['Cinzel-Bold', 'Cinzel-Bold.ttf'],
  ['Cormorant-Regular', 'CormorantGaramond-Regular.ttf'],
  ['Cormorant-SemiBold', 'CormorantGaramond-SemiBold.ttf'],
  ['Cormorant-Italic', 'CormorantGaramond-Italic.ttf'],
  ['Barlow-Regular', 'Barlow-Regular.ttf'],
  ['Barlow-Medium', 'Barlow-Medium.ttf'],
  ['Barlow-SemiBold', 'Barlow-SemiBold.ttf'],
];
let fontsReady = false;
function initFonts() {
  if (fontsReady) return;
  for (const [family, file] of FONT_FILES) {
    GlobalFonts.registerFromPath(path.join(FONT_DIR, file), family);
  }
  fontsReady = true;
}

/* ---------- palettes ---------- */

const PALETTES = {
  midnight: {
    label: 'Midnight Navy',
    sky: ['#080D26', '#1A2C5E'],
    additive: true,
    starTint: 'natural',
    lines: 'rgba(216,192,142,0.44)',
    labelText: 'rgba(233,222,196,',
    ring: 'rgba(237,228,204,',
    text: '#F1E9D6',
    textSoft: 'rgba(241,233,214,',
    accent: '#C9A86A',
    moon: '#F7F0DC',
    horizon: 'rgba(126,146,208,0.20)',
  },
  obsidian: {
    label: 'Obsidian',
    sky: ['#010208', '#0E1526'],
    additive: true,
    starTint: 'natural',
    lines: 'rgba(168,188,218,0.42)',
    labelText: 'rgba(214,222,236,',
    ring: 'rgba(216,222,234,',
    text: '#EAEFF8',
    textSoft: 'rgba(234,239,248,',
    accent: '#A7B6CF',
    moon: '#F4F6FF',
    horizon: 'rgba(92,112,164,0.18)',
  },
  dusk: {
    label: 'Dusk Plum',
    sky: ['#190D30', '#452663'],
    additive: true,
    starTint: 'natural',
    lines: 'rgba(243,190,207,0.42)',
    labelText: 'rgba(246,226,214,',
    ring: 'rgba(244,226,206,',
    text: '#F7EBDD',
    textSoft: 'rgba(247,235,221,',
    accent: '#E3A8B8',
    moon: '#FFF1E3',
    horizon: 'rgba(206,124,164,0.18)',
  },
  ivory: {
    label: 'Ivory Negative',
    sky: null, // transparent: the shirt fabric becomes the sky
    additive: false,
    starTint: 'navy',
    lines: 'rgba(26,40,74,0.50)',
    labelText: 'rgba(26,40,74,',
    ring: 'rgba(26,40,74,',
    text: '#1A284A',
    textSoft: 'rgba(26,40,74,',
    accent: '#9A7B3F',
    moon: '#243459',
    horizon: null,
  },
};

/* ---------- text helpers ---------- */

function trackedWidth(ctx, text, tr) {
  let w = 0;
  for (const ch of text) w += ctx.measureText(ch).width + tr;
  return text.length ? w - tr : 0;
}

function drawTracked(ctx, text, cx, y, tr) {
  const w = trackedWidth(ctx, text, tr);
  let x = cx - w / 2;
  for (const ch of text) {
    ctx.fillText(ch, x, y);
    x += ctx.measureText(ch).width + tr;
  }
  return w;
}

/** Draw text centered, shrinking through `sizes` until it fits maxWidth. */
function drawTrackedFit(ctx, text, cx, y, trFactor, sizes, maxWidth, family) {
  for (const size of sizes) {
    ctx.font = `${size}px ${family}`;
    const w = trackedWidth(ctx, text, size * trFactor);
    if (w <= maxWidth) return drawTracked(ctx, text, cx, y, size * trFactor);
  }
  const size = sizes[sizes.length - 1];
  ctx.font = `${size}px ${family}`;
  let t = text;
  while (t.length > 1 && trackedWidth(ctx, t + '…', size * trFactor) > maxWidth) t = t.slice(0, -1);
  return drawTracked(ctx, t + '…', cx, y, size * trFactor);
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function formatDateLine(dateISO, timeHHMM) {
  const [y, m, d] = dateISO.split('-').map(Number);
  let timeStr = '';
  if (timeHHMM) {
    const [H, M] = timeHHMM.split(':').map(Number);
    const ampm = H >= 12 ? 'PM' : 'AM';
    const h12 = ((H + 11) % 12) + 1;
    timeStr = ` · ${h12}:${String(M).padStart(2, '0')} ${ampm}`;
  }
  return `${d} ${MONTHS[m - 1]} ${y}${timeStr}`.toUpperCase();
}

function formatCoords(lat, lon) {
  const la = `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'}`;
  const lo = `${Math.abs(lon).toFixed(4)}° ${lon >= 0 ? 'E' : 'W'}`;
  return `${la} · ${lo}`;
}

/* ---------- the renderer ---------- */

/**
 * @param {object} design validated design params
 * @param {object} opts { width, quality: 'print'|'preview' }
 * @returns {Buffer} PNG
 */
function renderDesign(design, opts = {}) {
  initFonts();
  const PW = config.prodigi.printWidth;    // 4680
  const PH = config.prodigi.printHeight;   // 5790
  const width = opts.width || PW;
  const quality = opts.quality || (width >= PW ? 'print' : 'preview');
  const s = width / PW;
  const height = Math.round(PH * s);

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, width, height);
  ctx.textBaseline = 'alphabetic';

  const pal = PALETTES[design.palette] || PALETTES.midnight;
  const CX = 2340 * s, CY = 2140 * s, R = 1590 * s;

  // Compute sky (preview trims the faintest stars for speed).
  const magLimit = quality === 'print' ? 7.6 : 6.2;
  const sky = computeSky(new Date(design.utcISO), design.lat, design.lon, {
    magLimit,
    withConstellations: !!design.constellations,
  });

  // Star radius in print px -> display px. Preview boosts tiny stars a little.
  const boost = quality === 'print' ? 1 : 1.9;
  const starR = (mag) => {
    const r = Math.min(11, 15.8 * Math.pow(10, -0.2 * mag));
    return Math.max(quality === 'print' ? 0.62 : 0.5, Math.min(r * s * boost, quality === 'print' ? 11 : 3.4));
  };
  const starColor = (st, alpha) => {
    if (pal.starTint === 'navy') return `rgba(26,40,74,${alpha})`;
    return `rgba(${st.rgb[0]},${st.rgb[1]},${st.rgb[2]},${alpha})`;
  };

  /* --- sky disk --- */
  ctx.save();
  ctx.beginPath();
  ctx.arc(CX, CY, R, 0, Math.PI * 2);
  ctx.clip();

  if (pal.sky) {
    const g = ctx.createRadialGradient(CX, CY - R * 0.18, R * 0.05, CX, CY, R * 1.02);
    g.addColorStop(0, pal.sky[0]);
    g.addColorStop(1, pal.sky[1]);
    ctx.fillStyle = g;
    ctx.fillRect(CX - R, CY - R, R * 2, R * 2);
    if (pal.horizon) {
      const hg = ctx.createLinearGradient(0, CY + R * 0.35, 0, CY + R);
      hg.addColorStop(0, 'rgba(0,0,0,0)');
      hg.addColorStop(1, pal.horizon);
      ctx.fillStyle = hg;
      ctx.fillRect(CX - R, CY + R * 0.35, R * 2, R * 0.65);
    }
  }

  if (pal.additive) ctx.globalCompositeOperation = 'lighter';

  /* --- milky way: soft cumulative glow from faint stars --- */
  for (const st of sky.stars) {
    if (st.mag <= 4.8) continue;
    const x = CX + st.x * R, y = CY + st.y * R;
    const r = starR(st.mag);
    const aBase = 0.022 * Math.min(1, (st.mag - 4.8) / 1.2 + 0.4);
    ctx.fillStyle = starColor(st, aBase * 0.7);
    ctx.beginPath(); ctx.arc(x, y, r * 6.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = starColor(st, aBase);
    ctx.beginPath(); ctx.arc(x, y, r * 2.6, 0, Math.PI * 2); ctx.fill();
  }

  /* --- star dots --- */
  for (const st of sky.stars) {
    const x = CX + st.x * R, y = CY + st.y * R;
    const r = starR(st.mag);
    let alpha = 1;
    if (st.mag > 5) alpha = Math.max(0.4, 1 - (st.mag - 5) / 4.2);
    if (pal.starTint === 'navy') alpha *= 0.92;
    ctx.fillStyle = starColor(st, alpha);
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }

  ctx.globalCompositeOperation = 'source-over';

  /* --- bright star halos + diffraction spikes --- */
  for (const st of sky.stars) {
    if (st.mag > 2.2) continue;
    const x = CX + st.x * R, y = CY + st.y * R;
    const r = starR(st.mag);
    const haloR = r * (quality === 'print' ? 7 : 5);
    const hg = ctx.createRadialGradient(x, y, 0, x, y, haloR);
    const haloA = pal.starTint === 'navy' ? 0.10 : (st.mag < 0 ? 0.30 : 0.22);
    hg.addColorStop(0, starColor(st, haloA));
    hg.addColorStop(1, starColor(st, 0));
    ctx.fillStyle = hg;
    ctx.beginPath(); ctx.arc(x, y, haloR, 0, Math.PI * 2); ctx.fill();
    if (st.mag < 0.6 && quality === 'print') {
      ctx.strokeStyle = starColor(st, 0.45);
      ctx.lineWidth = 1.8;
      const L = r * 9;
      ctx.beginPath();
      ctx.moveTo(x - L, y); ctx.lineTo(x + L, y);
      ctx.moveTo(x, y - L); ctx.lineTo(x, y + L);
      ctx.stroke();
      ctx.strokeStyle = starColor(st, 0.18);
      ctx.beginPath();
      const D = L * 0.42;
      ctx.moveTo(x - D, y - D); ctx.lineTo(x + D, y + D);
      ctx.moveTo(x - D, y + D); ctx.lineTo(x + D, y - D);
      ctx.stroke();
    }
  }

  /* --- constellation figures --- */
  if (design.constellations) {
    ctx.strokeStyle = pal.lines;
    ctx.lineWidth = quality === 'print' ? 2.6 : Math.max(0.8, 2.6 * s * boost);
    ctx.lineCap = 'round';
    for (const c of sky.constellations) {
      ctx.beginPath();
      for (const [ax, ay, bx, by] of c.segs) {
        ctx.moveTo(CX + ax * R, CY + ay * R);
        ctx.lineTo(CX + bx * R, CY + by * R);
      }
      ctx.stroke();
    }

    // Names: brightest constellations first, greedy overlap rejection.
    const labelSize = quality === 'print' ? 30 : Math.max(6, 30 * s * boost);
    ctx.font = `${labelSize}px Cinzel-Regular`;
    const placed = [];
    const ranked = sky.constellations
      .filter(c => c.label.inside && (c.latin || c.en))
      .sort((a, b) => (b.weight || 0) - (a.weight || 0));
    for (const c of ranked) {
      if (placed.length >= 14) break;
      const text = (c.latin || c.en).toUpperCase();
      const w = trackedWidth(ctx, text, labelSize * 0.3);
      const lx = CX + c.label.x * R, ly = CY + c.label.y * R + labelSize * 0.35;
      const box = [lx - w / 2 - labelSize * 0.4, ly - labelSize, lx + w / 2 + labelSize * 0.4, ly + labelSize * 0.5];
      let clash = false;
      for (const b of placed) {
        if (box[0] < b[2] && box[2] > b[0] && box[1] < b[3] && box[3] > b[1]) { clash = true; break; }
      }
      if (clash) continue;
      placed.push(box);
      ctx.fillStyle = `${pal.labelText}0.42)`;
      drawTracked(ctx, text, lx, ly, labelSize * 0.3);
    }
  }

  /* --- sun (daytime moments) --- */
  if (sky.sun.visible) {
    const x = CX + sky.sun.x * R, y = CY + sky.sun.y * R;
    const r = (quality === 'print' ? 34 : 34 * s * boost * 0.8);
    const gg = ctx.createRadialGradient(x, y, 0, x, y, r * 3.4);
    gg.addColorStop(0, 'rgba(255,238,190,0.55)');
    gg.addColorStop(1, 'rgba(255,238,190,0)');
    ctx.fillStyle = gg;
    ctx.beginPath(); ctx.arc(x, y, r * 3.4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(244,196,96,0.8)';
    ctx.lineWidth = Math.max(1, r * 0.1);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * r * 1.35, y + Math.sin(a) * r * 1.35);
      ctx.lineTo(x + Math.cos(a) * r * 1.85, y + Math.sin(a) * r * 1.85);
      ctx.stroke();
    }
    const sg = ctx.createRadialGradient(x, y, 0, x, y, r);
    sg.addColorStop(0, '#FFF8DE');
    sg.addColorStop(1, '#F3C452');
    ctx.fillStyle = sg;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }

  /* --- moon --- */
  if (sky.moon.visible) {
    const x = CX + sky.moon.x * R, y = CY + sky.moon.y * R;
    const r = quality === 'print' ? 30 : Math.max(2.2, 30 * s * boost);
    const k = sky.moon.k;

    // glow
    const gg = ctx.createRadialGradient(x, y, r * 0.4, x, y, r * 4.5);
    gg.addColorStop(0, pal.starTint === 'navy' ? 'rgba(36,52,89,0.16)' : 'rgba(247,240,220,0.20)');
    gg.addColorStop(1, 'rgba(247,240,220,0)');
    ctx.fillStyle = gg;
    ctx.beginPath(); ctx.arc(x, y, r * 4.5, 0, Math.PI * 2); ctx.fill();

    // dark disk
    ctx.fillStyle = pal.starTint === 'navy' ? 'rgba(26,40,74,0.22)' : 'rgba(210,214,228,0.16)';
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = pal.ring + '0.35)';
    ctx.lineWidth = Math.max(0.6, r * 0.045);
    ctx.stroke();

    // lit portion, oriented toward the sun
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(sky.moon.litAngle);
    const rx = r * Math.abs(2 * k - 1);
    ctx.beginPath();
    ctx.arc(0, 0, r, -Math.PI / 2, Math.PI / 2, false); // lit-side semicircle
    if (k >= 0.5) {
      ctx.ellipse(0, 0, rx, r, 0, Math.PI / 2, (3 * Math.PI) / 2, false); // bulges past the semicircle
    } else {
      ctx.ellipse(0, 0, rx, r, 0, Math.PI / 2, -Math.PI / 2, true); // carves into it
    }
    ctx.closePath();
    ctx.fillStyle = pal.moon;
    ctx.fill();
    // craters, clipped to the lit shape
    ctx.save();
    ctx.clip();
    ctx.fillStyle = pal.starTint === 'navy' ? 'rgba(10,18,40,0.16)' : 'rgba(150,142,116,0.28)';
    const craters = [[0.28, -0.22, 0.17], [-0.18, 0.3, 0.13], [0.12, 0.42, 0.09], [-0.34, -0.3, 0.08], [0.4, 0.15, 0.07]];
    for (const [cx0, cy0, cr] of craters) {
      ctx.beginPath(); ctx.arc(cx0 * r, cy0 * r, cr * r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    ctx.restore();
  }

  /* --- planets --- */
  for (const p of sky.planets) {
    const x = CX + p.x * R, y = CY + p.y * R;
    const r = Math.max(quality === 'print' ? 4.6 : 1.4, (quality === 'print' ? 4.6 : 4.6 * s * boost));
    const gg = ctx.createRadialGradient(x, y, 0, x, y, r * 4);
    gg.addColorStop(0, pal.starTint === 'navy' ? 'rgba(26,40,74,0.30)' : 'rgba(255,246,224,0.35)');
    gg.addColorStop(1, 'rgba(255,246,224,0)');
    ctx.fillStyle = gg;
    ctx.beginPath(); ctx.arc(x, y, r * 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = pal.starTint === 'navy' ? 'rgba(26,40,74,0.95)' : '#FFF6DE';
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    const size = quality === 'print' ? 26 : Math.max(6, 26 * s * boost);
    ctx.font = `${size}px Barlow-Medium`;
    ctx.fillStyle = `${pal.textSoft}0.72)`;
    drawTracked(ctx, p.name.toUpperCase(), x, y + r + size * 1.15, size * 0.28);
  }

  ctx.restore(); // un-clip disk

  /* --- rings, ticks, cardinals --- */
  ctx.strokeStyle = pal.ring + '0.85)';
  ctx.lineWidth = Math.max(1, 3 * s * boost);
  ctx.beginPath(); ctx.arc(CX, CY, R, 0, Math.PI * 2); ctx.stroke();

  ctx.strokeStyle = pal.ring + '0.5)';
  ctx.lineWidth = Math.max(0.7, 1.6 * s * boost);
  ctx.beginPath(); ctx.arc(CX, CY, R * 1.065, 0, Math.PI * 2); ctx.stroke();

  for (let d = 0; d < 360; d += 5) {
    const major = d % 15 === 0;
    const a = (d - 90) * Math.PI / 180;
    const r0 = R * 1.008;
    const r1 = R * (major ? 1.052 : 1.03);
    ctx.strokeStyle = pal.ring + (major ? '0.6)' : '0.35)');
    ctx.lineWidth = Math.max(0.6, (major ? 2 : 1.2) * s * boost);
    ctx.beginPath();
    ctx.moveTo(CX + Math.cos(a) * r0, CY + Math.sin(a) * r0);
    ctx.lineTo(CX + Math.cos(a) * r1, CY + Math.sin(a) * r1);
    ctx.stroke();
  }

  const cardSize = quality === 'print' ? 46 : Math.max(9, 46 * s * boost);
  ctx.font = `${cardSize}px Barlow-Medium`;
  ctx.fillStyle = pal.ring + '0.9)';
  const cardR = R * 1.125;
  const cardinals = [['N', 0, -1], ['E', -1, 0], ['S', 0, 1], ['W', 1, 0]];
  for (const [ch, ux, uy] of cardinals) {
    ctx.textAlign = 'center';
    ctx.fillText(ch, CX + ux * cardR, CY + uy * cardR + cardSize * 0.36);
  }
  ctx.textAlign = 'left';

  /* --- text block --- */
  const ORN_Y = 4040 * s;
  const TITLE_Y = 4230 * s;
  const DATE_Y = 4410 * s;
  const PLACE_Y = 4540 * s;
  const COORD_Y = 4680 * s;
  const SUB_Y = 4830 * s;
  const BRAND_Y = 5480 * s;

  // ornament: line — diamond — line
  const ornW = 820 * s;
  ctx.strokeStyle = `${pal.accent}`;
  ctx.globalAlpha = 0.65;
  ctx.lineWidth = Math.max(0.8, 1.7 * s * boost);
  ctx.beginPath();
  ctx.moveTo(CX - ornW / 2, ORN_Y); ctx.lineTo(CX - 34 * s, ORN_Y);
  ctx.moveTo(CX + 34 * s, ORN_Y); ctx.lineTo(CX + ornW / 2, ORN_Y);
  ctx.stroke();
  ctx.save();
  ctx.translate(CX, ORN_Y);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = pal.accent;
  const dia = 9 * s * boost * 0.9;
  ctx.fillRect(-dia, -dia, dia * 2, dia * 2);
  ctx.restore();
  ctx.globalAlpha = 1;

  // title
  if (design.title) {
    ctx.fillStyle = pal.text;
    drawTrackedFit(ctx, design.title.toUpperCase(), CX, TITLE_Y, 0.13,
      (quality === 'print' ? [150, 136, 122, 108, 96, 84, 74] : [150, 136, 122, 108, 96, 84, 74]).map(v => Math.max(6, v * s)),
      4150 * s, 'Cinzel-SemiBold');
  }

  // date line
  ctx.fillStyle = pal.textSoft + '0.92)';
  const dateText = formatDateLine(design.date, design.time);
  drawTrackedFit(ctx, dateText, CX, DATE_Y, 0.075,
    [100, 90, 80, 70, 60, 52].map(v => Math.max(6, v * s)), 4150 * s, 'Cormorant-Regular');

  // place line
  if (design.placeName) {
    ctx.fillStyle = pal.textSoft + '0.85)';
    const placeText = (design.placeName + (design.countryName ? ' · ' + design.countryName : '')).toUpperCase();
    drawTrackedFit(ctx, placeText, CX, PLACE_Y, 0.1,
      [84, 74, 64, 56, 48].map(v => Math.max(5, v * s)), 4150 * s, 'Cormorant-Regular');
  }

  // coordinates
  ctx.fillStyle = pal.textSoft + '0.72)';
  drawTrackedFit(ctx, formatCoords(design.lat, design.lon), CX, COORD_Y, 0.34,
    [60, 52, 46].map(v => Math.max(5, v * s)), 4150 * s, 'Barlow-Medium');

  // subtitle (personal message)
  if (design.subtitle) {
    ctx.fillStyle = pal.textSoft + '0.8)';
    drawTrackedFit(ctx, design.subtitle, CX, SUB_Y, 0.02,
      [66, 58, 50, 44].map(v => Math.max(5, v * s)), 4150 * s, 'Cormorant-Italic');
  }

  // brand signature
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = pal.textSoft + '1)';
  drawTrackedFit(ctx, 'NIGHTLOOM · WOVEN FROM YOUR NIGHT', CX, BRAND_Y, 0.42,
    [32, 28, 24].map(v => Math.max(4, v * s)), 4150 * s, 'Barlow-Medium');
  ctx.globalAlpha = 1;

  return canvas.toBuffer('image/png');
}

module.exports = { renderDesign, PALETTES, formatDateLine, formatCoords, initFonts };
