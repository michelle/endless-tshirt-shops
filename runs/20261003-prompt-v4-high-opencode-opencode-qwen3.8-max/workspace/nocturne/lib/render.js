// NOCTURNE artwork renderer.
// Turns a DESIGN SPEC (a moment in time + a place on Earth + customer choices) into a
// print-ready PNG at Prodigi's exact front-print-area resolution for the Bella+Canvas 3001
// (4680 × 5790 px @ 300 dpi). Deterministic: same spec => byte-identical artwork.
'use strict';

const fs = require('fs');
const path = require('path');
const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');
const astro = require('./astro');

// ---- fonts (OFL licensed, bundled in repo) ----
let fontsLoaded = false;
function loadFonts() {
  if (fontsLoaded) return;
  const dir = path.join(__dirname, 'fonts');
  GlobalFonts.register(fs.readFileSync(path.join(dir, 'CormorantGaramond-Light.ttf')), 'Cormorant Garamond', 300, 'normal');
  GlobalFonts.register(fs.readFileSync(path.join(dir, 'CormorantGaramond-Regular.ttf')), 'Cormorant Garamond', 400, 'normal');
  GlobalFonts.register(fs.readFileSync(path.join(dir, 'CormorantGaramond-SemiBold.ttf')), 'Cormorant Garamond', 600, 'normal');
  GlobalFonts.register(fs.readFileSync(path.join(dir, 'CormorantGaramond-LightItalic.ttf')), 'Cormorant Garamond', 300, 'italic');
  GlobalFonts.register(fs.readFileSync(path.join(dir, 'SpaceGrotesk-Regular.ttf')), 'Space Grotesk', 400, 'normal');
  GlobalFonts.register(fs.readFileSync(path.join(dir, 'SpaceGrotesk-Medium.ttf')), 'Space Grotesk', 500, 'normal');
  GlobalFonts.register(fs.readFileSync(path.join(dir, 'SpaceGrotesk-SemiBold.ttf')), 'Space Grotesk', 600, 'normal');
  fontsLoaded = true;
}

const SERIF = 'Cormorant Garamond';
const SANS = 'Space Grotesk';
const sin = (x) => Math.sin((x * Math.PI) / 180);
const cos = (x) => Math.cos((x * Math.PI) / 180);

// ---- print-area constants (Prodigi GLOBAL-TEE-BC-3001 front, 300 dpi) ----
const W = 4680;
const H = 5790;

// ---- themes ----
// ink    = line/star colour on fabric
// accent = secondary colour (rules, ornaments, star halos)
// fabric = garment colour we validate against
const THEMES = {
  'chart-cream': {
    id: 'chart-cream',
    shirt: 'natural',
    fabric: '#F1EADA',
    ink: '#141A22',
    accent: '#8C6A3F', // bronze
  },
  'chart-midnight': {
    id: 'chart-midnight',
    shirt: 'black',
    fabric: '#101012',
    ink: '#F1EADA',
    accent: '#C9A45C', // gold
  },
  'chart-sage': {
    id: 'chart-sage',
    shirt: 'military green',
    fabric: '#4A5240',
    ink: '#F1EADA',
    accent: '#D8B36A', // brass
  },
};

const MONTHS = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
const DAYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

// deterministic pseudo-random from integers
function srand(i, salt) {
  let h = (i * 374761393 + salt * 668265263) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  h = (h ^ (h >>> 16)) >>> 0;
  return h / 4294967296;
}

function rgba(hex, alpha) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

// Centered text with manual letter-spacing (works everywhere, no ctx.letterSpacing needed).
function spacedWidth(ctx, text, spacing) {
  let w = 0;
  for (const ch of text) w += ctx.measureText(ch).width + spacing;
  return w - spacing;
}
function drawSpaced(ctx, text, cx, y, spacing) {
  const total = spacedWidth(ctx, text, spacing);
  let x = cx - total / 2;
  for (const ch of text) {
    ctx.fillText(ch, x, y);
    x += ctx.measureText(ch).width + spacing;
  }
  return total;
}

// four-point star ornament
function starOrnament(ctx, x, y, r, color, alpha) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = rgba(color, alpha);
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 - Math.PI / 2;
    const a2 = a + Math.PI / 4;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    ctx.lineTo(Math.cos(a2) * r * 0.22, Math.sin(a2) * r * 0.22);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// magnitude -> drawn radius (px) for a bright star
function starRadius(mag) {
  if (mag <= -1) return 34;
  if (mag <= 0) return 27;
  if (mag <= 1) return 22;
  if (mag <= 2) return 16.5;
  if (mag <= 3) return 12;
  if (mag <= 4) return 9.5;
  if (mag <= 5) return 7.4;
  return 5.8;
}

// B-V colour index -> subtle stellar tint (blue-white .. amber)
function starTint(ci, ink) {
  if (ci === null || ci === undefined) return null;
  const t = Math.max(0, Math.min(1, (ci + 0.35) / 1.9)); // 0 = hot blue, 1 = cool red
  const blue = [122, 152, 198];
  const warm = [206, 148, 104];
  const c = blue.map((b, i) => Math.round(b + (warm[i] - b) * t));
  return c;
}

// The illuminated-moon glyph. phase: 0=new 0.5=full 1=new.
// `southern` mirrors the orientation (southern hemisphere sees the terminator flipped).
function drawMoonIcon(ctx, cx, cy, R, phase, ink, southern) {
  const waxing = (phase < 0.5) !== !!southern;
  const f = phase < 0.5 ? phase / 0.5 : (phase - 0.5) / 0.5; // 0..1 within half cycle
  const a = R * Math.abs(Math.cos(Math.PI * f)); // terminator semi-minor
  const gibbous = f > 0.5;

  // faint full disc + limb
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fillStyle = rgba(ink, 0.08);
  ctx.fill();
  ctx.lineWidth = Math.max(4, R * 0.045);
  ctx.strokeStyle = rgba(ink, 0.75);
  ctx.stroke();

  // illuminated region
  const limbSideRight = waxing; // northern-hemisphere convention
  const termBulgeRight = limbSideRight ? !gibbous : gibbous;
  ctx.beginPath();
  if (limbSideRight) ctx.arc(cx, cy, R, -Math.PI / 2, Math.PI / 2, false); // right limb
  else ctx.arc(cx, cy, R, Math.PI / 2, Math.PI * 1.5, false); // left limb
  // terminator: from bottom point back to top point, bulging right or left
  ctx.ellipse(cx, cy, a, R, 0, Math.PI / 2, -Math.PI / 2, termBulgeRight);
  ctx.closePath();
  ctx.fillStyle = rgba(ink, 0.9);
  ctx.fill();
  ctx.restore();
}

// azimuthal-equidistant disc -> pixels
function projector(cx, cy, radius) {
  return (x, y) => [cx + x * radius, cy + y * radius];
}

function constellationLines(stars) {
  // group projected stars into coarse sky cells and join brightest neighbours:
  // yields plausible asterism strokes (Orion, Plough, Cassiopeia, Crux ...) without
  // external constellation data.
  const cells = new Map();
  for (const s of stars) {
    if (s.mag > 5.0) continue;
    // hex-ish offset grid keeps asterisms from snapping into boxy clusters
    const gy = Math.floor((s.y + 1) * 3);
    const gx = Math.floor((s.x + 1) * 3 + (gy % 2) * 0.5);
    const key = `${gx}:${gy}`;
    if (!cells.has(key)) cells.set(key, []);
    cells.get(key).push(s);
  }
  const segs = [];
  for (const members of cells.values()) {
    if (members.length < 2) continue;
    members.sort((a, b) => a.mag - b.mag);
    const top = members.slice(0, 8);
    const linked = new Set();
    for (const s of top) {
      let best = null;
      let bestD = Infinity;
      for (const t of top) {
        if (t === s) continue;
        const key = s.x < t.x ? `${s.x},${s.y}|${t.x},${t.y}` : `${t.x},${t.y}|${s.x},${s.y}`;
        if (linked.has(key)) continue;
        const d = Math.hypot(s.x - t.x, s.y - t.y);
        if (d < bestD) { bestD = d; best = t; best && linked.add(key); }
      }
      if (best && bestD < 0.34) segs.push([s, best]);
    }
  }
  return segs;
}

function wrapTitle(ctx, title, maxWidth) {
  const words = title.split(/\s+/);
  const lines = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? cur + ' ' + w : w;
    if (ctx.measureText(t).width > maxWidth && cur) {
      lines.push(cur);
      cur = w;
    } else cur = t;
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 2);
}

// The main event: spec -> PNG buffer
const MILKY_WAY_STRANDS = [
  { b: 0, widths: [[880, 0.05], [520, 0.05], [240, 0.055]] },
  { b: 10, widths: [[620, 0.035], [300, 0.04]] },
  { b: -12, widths: [[620, 0.035], [300, 0.04]] },
];

function milkyWayRuns(lst, lat, horizon) {
  const runs = [];
  for (const strand of MILKY_WAY_STRANDS) {
    let run = null;
    let bucket = null;
    for (let l = 0; l <= 360.0001; l += 0.5) {
      const { ra, dec } = astro.galacticToEquatorial(l, strand.b);
      const { alt, az } = astro.equatorialToHorizontal(ra, dec, lst, lat);
      if (alt >= horizon) {
        const r = (90 - alt) / 90;
        const pt = { x: -r * sin(az), y: -r * cos(az), l };
        if (!run) { run = []; bucket = { strand, pts: run }; runs.push(bucket); }
        run.push(pt);
      } else {
        run = null;
      }
    }
  }
  return runs;
}
function renderDesign(design) {
  loadFonts();
  const theme = THEMES[design.theme] || THEMES['chart-cream'];
  const { ink, accent, fabric } = theme;

  const when = new Date(design.utc);
  if (isNaN(when.getTime())) throw new Error('invalid utc date');
  const sky = astro.computeSky({ date: when, lat: design.lat, lng: design.lng });

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // fabric-matched background (what the DTG printer sees between ink strokes)
  ctx.fillStyle = fabric;
  ctx.fillRect(0, 0, W, H);

  // soft vignette for depth
  const vg = ctx.createRadialGradient(W / 2, H * 0.46, H * 0.22, W / 2, H * 0.5, H * 0.72);
  vg.addColorStop(0, rgba(ink, 0));
  vg.addColorStop(1, rgba(ink, 0.045));
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);

  // double plate frame
  ctx.strokeStyle = rgba(ink, 0.28);
  ctx.lineWidth = 5;
  ctx.strokeRect(150, 150, W - 300, H - 300);
  ctx.strokeStyle = rgba(ink, 0.16);
  ctx.lineWidth = 2;
  ctx.strokeRect(196, 196, W - 392, H - 392);

  const cx = W / 2;

  // ---------- header: brand wordmark with star ornaments ----------
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = rgba(ink, 0.88);
  ctx.font = `500 108px "${SANS}"`;
  const hw = drawSpaced(ctx, 'NOCTURNE', cx, 500, 46);
  starOrnament(ctx, cx - hw / 2 - 160, 462, 34, accent, 0.9);
  starOrnament(ctx, cx + hw / 2 + 160, 462, 34, accent, 0.9);
  ctx.fillStyle = rgba(ink, 0.5);
  ctx.font = `400 62px "${SANS}"`;
  drawSpaced(ctx, 'WHERE WERE YOU WHEN THE SKY WAS THIS?', cx, 610, 14);

  // ---------- moon emblem ----------
  drawMoonIcon(ctx, cx, 830, 105, sky.moon.phase, ink, design.lat < 0);

  // ---------- sky disc ----------
  const cy = 2640;
  const R = 1620;
  const P = projector(cx, cy, R);

  // horizon ring + ticks
  ctx.strokeStyle = rgba(ink, 0.6);
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 3;
  ctx.strokeStyle = rgba(ink, 0.3);
  for (let a = 0; a < 360; a += 15) {
    const len = a % 90 === 0 ? 46 : 24;
    const rd = (a * Math.PI) / 180;
    ctx.beginPath();
    ctx.moveTo(cx + Math.sin(rd) * R, cy - Math.cos(rd) * R);
    ctx.lineTo(cx + Math.sin(rd) * (R + len), cy - Math.cos(rd) * (R + len));
    ctx.stroke();
  }
  // cardinal points; EAST is drawn LEFT because the chart is "looking up"
  ctx.fillStyle = rgba(ink, 0.62);
  ctx.font = `600 74px "${SANS}"`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const [label, ang] of [['N', 0], ['E', 270], ['S', 180], ['W', 90]]) {
    const rd = (ang * Math.PI) / 180;
    ctx.fillText(label, cx + Math.sin(rd) * (R + 118), cy - Math.cos(rd) * (R + 118));
  }
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R - 2, 0, Math.PI * 2);
  ctx.clip();

  // Milky Way: soft wash bands along three galactic-latitude strands (b = +10°, 0°, −12°)
  const mwBuckets = milkyWayRuns(sky.lst, design.lat, 2);
  for (const bucket of mwBuckets) {
    const run = bucket.pts;
    if (run.length < 2) continue;
    for (const [width, alpha] of bucket.strand.widths) {
      ctx.strokeStyle = rgba(ink, alpha);
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      run.forEach((p, i) => {
        const [px, py] = P(p.x, p.y);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();
    }
    // dust speckle along the strand
    for (let i = 0; i < run.length * 6; i++) {
      const j = Math.floor(srand(i, 7) * run.length);
      const p = run[j];
      const q = run[Math.min(run.length - 1, j + 1)];
      const off = (srand(i, 11) - 0.5) * 0.36;
      const dx = q.x - p.x;
      const dy = q.y - p.y;
      const dl = Math.hypot(dx, dy) || 1;
      const [px, py] = P(p.x - (dy / dl) * off, p.y + (dx / dl) * off);
      ctx.fillStyle = rgba(ink, 0.08 + srand(i, 3) * 0.10);
      ctx.beginPath();
      ctx.arc(px, py, 2.5 + srand(i, 5) * 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // asterism strokes
  const segs = constellationLines(sky.stars);
  ctx.strokeStyle = rgba(ink, 0.30);
  ctx.lineWidth = 4.5;
  ctx.lineCap = 'round';
  for (const [a, b] of segs) {
    const [ax, ay] = P(a.x, a.y);
    const [bx, by] = P(b.x, b.y);
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.stroke();
  }

  // stars: faint to bright so the bright ones sit on top
  const ordered = [...sky.stars].sort((a, b) => b.mag - a.mag);
  ordered.forEach((s, i) => {
    const [px, py] = P(s.x, s.y);
    const r = starRadius(s.mag) * (0.86 + srand(i, 17) * 0.3);
    const tint = starTint(s.ci, ink);
    if (tint && s.mag <= 3.2) {
      ctx.fillStyle = `rgba(${tint[0]},${tint[1]},${tint[2]},0.30)`;
      ctx.beginPath();
      ctx.arc(px, py, r * 2.1, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = rgba(ink, s.mag <= 3 ? 0.95 : 0.8);
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
    if (s.mag <= 1.6) {
      // diffraction spikes on the brightest stars
      ctx.strokeStyle = rgba(ink, 0.55);
      ctx.lineWidth = 3;
      const L = r * 5.2;
      ctx.beginPath();
      ctx.moveTo(px - L, py); ctx.lineTo(px + L, py);
      ctx.moveTo(px, py - L); ctx.lineTo(px, py + L);
      ctx.stroke();
      ctx.strokeStyle = rgba(accent, 0.5);
      ctx.beginPath();
      ctx.arc(px, py, r * 3.1, 0, Math.PI * 2);
      ctx.stroke();
    }
  });
  ctx.restore();

  // ---------- caption ----------
  let y = 4720;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  // title
  let size = 236;
  ctx.font = `300 ${size}px "${SERIF}"`;
  let lines = wrapTitle(ctx, design.title, W - 1100);
  while (lines.length === 2 && ctx.measureText(lines[0]).width > W - 1000 && size > 150) {
    size -= 14;
    ctx.font = `300 ${size}px "${SERIF}"`;
    lines = wrapTitle(ctx, design.title, W - 1100);
  }
  ctx.fillStyle = rgba(ink, 0.96);
  const lh = size * 1.14;
  lines.forEach((ln, i) => ctx.fillText(ln, cx, y + i * lh));
  y += (lines.length - 1) * lh + 150;

  // rule with diamond
  ctx.strokeStyle = rgba(ink, 0.45);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx - 620, y);
  ctx.lineTo(cx - 90, y);
  ctx.moveTo(cx + 90, y);
  ctx.lineTo(cx + 620, y);
  ctx.stroke();
  ctx.save();
  ctx.translate(cx, y);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = rgba(accent, 0.9);
  ctx.fillRect(-16, -16, 32, 32);
  ctx.restore();
  y += 150;

  // coordinates
  const latAbs = Math.abs(design.lat).toFixed(4);
  const lngAbs = Math.abs(design.lng).toFixed(4);
  const coords = `${latAbs}°${design.lat >= 0 ? 'N' : 'S'}  ${lngAbs}°${design.lng >= 0 ? 'E' : 'W'}  ·  ${(design.place || '').toUpperCase()}`;
  ctx.fillStyle = rgba(ink, 0.82);
  ctx.font = `500 86px "${SANS}"`;
  drawSpaced(ctx, coords, cx, y, 8);
  y += 130;

  // the moment (rendered in the customer's LOCAL wall-clock time)
  const local = new Date(when.getTime() + (design.localOffsetMin || 0) * 60000);
  const hh = String(local.getUTCHours()).padStart(2, '0');
  const mm = String(local.getUTCMinutes()).padStart(2, '0');
  const whenLine = `${DAYS[local.getUTCDay()]}, ${local.getUTCDate()} ${MONTHS[local.getUTCMonth()]} ${local.getUTCFullYear()}  ·  ${hh}:${mm}  ·  ${sky.moon.name.toUpperCase()}  ·  ${Math.round(sky.moon.illuminated * 100)}% LIT`;
  ctx.fillStyle = rgba(ink, 0.68);
  ctx.font = `400 72px "${SANS}"`;
  drawSpaced(ctx, whenLine, cx, y, 6);

  // ---------- footer ----------
  ctx.fillStyle = rgba(ink, 0.45);
  ctx.font = `400 58px "${SANS}"`;
  drawSpaced(ctx, `Nº ${design.serial}  —  NOCTURNE  —  PRINTED UNDER YOUR SKY`, cx, H - 320, 10);

  return { buffer: canvas.toBuffer('image/png'), sky };
}

// Downscaled preview render (keeps the full-res render as single source of truth).
// NOTE: @napi-rs/canvas needs the explicit 9-arg drawImage for large source images;
// the 5-arg variant silently drops them.
async function renderPreview(design, pxWide) {
  const { buffer } = renderDesign(design);
  const { loadImage } = require('@napi-rs/canvas');
  const img = await loadImage(buffer);
  const pxHigh = Math.round((pxWide * H) / W);
  const canvas = createCanvas(pxWide, pxHigh);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, pxWide, pxHigh);
  return canvas.toBuffer('image/png');
}

module.exports = { renderDesign, renderPreview, THEMES, W, H, loadFonts };
