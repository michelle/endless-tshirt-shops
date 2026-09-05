import type { ThemeId } from '@/lib/catalog';
import { getTimeParts } from '@/lib/timeParts';
import type { ClockFormat } from '@/lib/catalog';

export type DrawOptions = {
  date: Date;
  timeZone: string;
  format: ClockFormat;
  showMs: boolean;
};

type Star = { x: number; y: number; r: number; phase: number; speed: number };

// Deterministic-ish starfield so stars don't jump between frames — generated
// once at module load and reused (twinkling comes from time, not position).
function makeStars(count: number, seed: number): Star[] {
  let s = seed;
  const rand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  return Array.from({ length: count }, () => ({
    x: rand(),
    y: rand() * 0.8,
    r: 0.5 + rand() * 1.8,
    phase: rand() * Math.PI * 2,
    speed: 0.6 + rand() * 1.2,
  }));
}

const STARS = makeStars(140, 42);
const CLOUDS = makeStars(10, 7);

function clear(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.clearRect(0, 0, w, h);
}

function timeString(date: Date, timeZone: string, format: ClockFormat, showMs: boolean) {
  const t = getTimeParts(date, timeZone, format);
  const base = `${t.hour}:${t.minute}:${t.second}`;
  return {
    clock: showMs ? `${base}.${t.ms}` : base,
    suffix: t.dayPeriod,
    dateLine: `${t.weekday}, ${t.month} ${t.day} ${t.year}`,
    hourNum: t.hourNum,
    ms: t.ms,
  };
}

// ---------- Theme: Midnight Terminal ----------
function drawTerminal(ctx: CanvasRenderingContext2D, w: number, h: number, opts: DrawOptions) {
  clear(ctx, w, h);
  const g = ctx.createRadialGradient(w * 0.5, h * 0.42, h * 0.05, w * 0.5, h * 0.5, h * 0.75);
  g.addColorStop(0, '#0d1f18');
  g.addColorStop(1, '#040608');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // scanlines
  ctx.globalAlpha = 0.06;
  ctx.fillStyle = '#39ff88';
  const lineGap = Math.max(2, Math.round(h / 300));
  for (let y = 0; y < h; y += lineGap * 2) {
    ctx.fillRect(0, y, w, lineGap);
  }
  ctx.globalAlpha = 1;

  // dot grid texture
  ctx.globalAlpha = 0.15;
  ctx.fillStyle = '#1c3a2c';
  const grid = w / 40;
  for (let x = grid / 2; x < w; x += grid) {
    for (let y = grid / 2; y < h; y += grid) {
      ctx.beginPath();
      ctx.arc(x, y, w * 0.0015, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;

  const { clock, dateLine } = timeString(opts.date, opts.timeZone, opts.format, opts.showMs);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#5affa0';
  ctx.font = `${w * 0.032}px "JetBrains Mono", "Courier New", monospace`;
  ctx.shadowColor = '#39ff88';
  ctx.shadowBlur = w * 0.01;
  ctx.fillText('// datetime.store', w / 2, h * 0.3);

  ctx.font = `700 ${w * 0.105}px "JetBrains Mono", "Courier New", monospace`;
  ctx.fillStyle = '#8dffc0';
  ctx.shadowBlur = w * 0.025;
  wrapCenteredText(ctx, clock, w / 2, h * 0.47, w * 0.9, w * 0.105 * 1.1);

  ctx.font = `${w * 0.038}px "JetBrains Mono", "Courier New", monospace`;
  ctx.fillStyle = '#39ff88';
  ctx.shadowBlur = w * 0.01;
  ctx.fillText(dateLine.toUpperCase(), w / 2, h * 0.58);

  ctx.font = `${w * 0.028}px "JetBrains Mono", "Courier New", monospace`;
  ctx.fillStyle = '#2fae6f';
  ctx.shadowBlur = 0;
  ctx.fillText('>_ printed at the exact moment of purchase', w / 2, h * 0.94);
  ctx.shadowBlur = 0;
}

// ---------- Theme: Cotton Candy Sky ----------
function skyPalette(hour: number) {
  // 0-23 -> gradient stops, roughly dawn/day/dusk/night
  if (hour >= 5 && hour < 8) return { top: '#ffd6c9', bottom: '#ffb2d9', body: 'sun' as const };
  if (hour >= 8 && hour < 17) return { top: '#bfe3ff', bottom: '#fff3d6', body: 'sun' as const };
  if (hour >= 17 && hour < 20) return { top: '#7c4fa0', bottom: '#ff9a5a', body: 'sun' as const };
  return { top: '#1b1440', bottom: '#3a2a6b', body: 'moon' as const };
}

function drawCottonCandy(ctx: CanvasRenderingContext2D, w: number, h: number, opts: DrawOptions) {
  clear(ctx, w, h);
  const { clock, dateLine, hourNum } = timeString(opts.date, opts.timeZone, opts.format, opts.showMs);
  const pal = skyPalette(hourNum);

  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, pal.top);
  g.addColorStop(1, pal.bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // sun/moon arcing across the top third based on hour
  const bx = w * (0.12 + (hourNum / 24) * 0.76);
  const by = h * (0.16 + Math.sin((hourNum / 24) * Math.PI) * -0.05 + 0.05);
  const r = w * 0.09;
  if (pal.body === 'sun') {
    const sg = ctx.createRadialGradient(bx, by, 0, bx, by, r * 2.4);
    sg.addColorStop(0, 'rgba(255,244,214,0.95)');
    sg.addColorStop(1, 'rgba(255,244,214,0)');
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.arc(bx, by, r * 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff6df';
    ctx.beginPath();
    ctx.arc(bx, by, r, 0, Math.PI * 2);
    ctx.fill();
  } else {
    const sg = ctx.createRadialGradient(bx, by, 0, bx, by, r * 2.2);
    sg.addColorStop(0, 'rgba(255,255,255,0.5)');
    sg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.arc(bx, by, r * 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fdfbff';
    ctx.beginPath();
    ctx.arc(bx, by, r * 0.85, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(bx + r * 0.4, by - r * 0.15, r * 0.75, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }

  // clouds
  const t = opts.date.getTime() / 1000;
  CLOUDS.forEach((c, i) => {
    const cx = ((c.x + t * 0.004 * c.speed) % 1.2) * w - w * 0.1;
    const cy = h * (0.55 + c.y * 0.35);
    const s = w * (0.05 + c.r * 0.02);
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = '#ffffff';
    [-1, -0.3, 0.4, 1].forEach((dx, j) => {
      ctx.beginPath();
      ctx.ellipse(cx + dx * s, cy + (j % 2) * s * 0.15, s * 0.9, s * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
    });
  });
  ctx.globalAlpha = 1;

  // sparkle hearts for whimsy
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  const sparkles = [
    [0.12, 0.72],
    [0.88, 0.68],
    [0.08, 0.9],
    [0.92, 0.88],
  ];
  sparkles.forEach(([sx, sy], i) => {
    drawSparkle(ctx, w * sx, h * sy, w * 0.018, t * 1.5 + i);
  });

  const ink = pal.body === 'moon' ? '#fff6ff' : '#3a1440';
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(255,255,255,0.6)';
  ctx.shadowBlur = w * 0.02;
  ctx.fillStyle = ink;
  ctx.font = `800 ${w * 0.11}px ui-rounded, "Segoe UI Rounded", "Baloo 2", system-ui, sans-serif`;
  wrapCenteredText(ctx, clock, w / 2, h * 0.5, w * 0.9, w * 0.11 * 1.1);

  ctx.font = `600 ${w * 0.04}px ui-rounded, "Segoe UI Rounded", system-ui, sans-serif`;
  ctx.shadowBlur = w * 0.01;
  ctx.fillText(dateLine, w / 2, h * 0.6);
  ctx.shadowBlur = 0;
}

function drawSparkle(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: number) {
  const scale = 0.6 + 0.4 * Math.sin(t);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.beginPath();
  ctx.moveTo(0, -s);
  ctx.quadraticCurveTo(s * 0.2, -s * 0.2, s, 0);
  ctx.quadraticCurveTo(s * 0.2, s * 0.2, 0, s);
  ctx.quadraticCurveTo(-s * 0.2, s * 0.2, -s, 0);
  ctx.quadraticCurveTo(-s * 0.2, -s * 0.2, 0, -s);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// ---------- Theme: Starfield ----------
function drawStarfield(ctx: CanvasRenderingContext2D, w: number, h: number, opts: DrawOptions) {
  clear(ctx, w, h);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#0a0620');
  g.addColorStop(0.55, '#1a1042');
  g.addColorStop(1, '#2c1a56');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  const t = opts.date.getTime() / 1000;
  ctx.fillStyle = '#ffffff';
  STARS.forEach((s) => {
    const twinkle = 0.35 + 0.65 * Math.abs(Math.sin(t * 0.5 * s.speed + s.phase));
    ctx.globalAlpha = twinkle;
    ctx.beginPath();
    ctx.arc(s.x * w, s.y * h, s.r * (w / 480), 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;

  // constellation lines near top-right
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = w * 0.0015;
  ctx.beginPath();
  const pts = STARS.slice(0, 6);
  pts.forEach((s, i) => {
    const x = s.x * w * 0.4 + w * 0.55;
    const y = s.y * h * 0.5 + h * 0.03;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // crescent moon
  const mx = w * 0.18;
  const my = h * 0.14;
  const mr = w * 0.055;
  const glow = ctx.createRadialGradient(mx, my, 0, mx, my, mr * 3);
  glow.addColorStop(0, 'rgba(255,244,220,0.45)');
  glow.addColorStop(1, 'rgba(255,244,220,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(mx, my, mr * 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fdf5e2';
  ctx.beginPath();
  ctx.arc(mx, my, mr, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(mx + mr * 0.45, my - mr * 0.2, mr * 0.85, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';

  const { clock, dateLine } = timeString(opts.date, opts.timeZone, opts.format, opts.showMs);

  ctx.textAlign = 'center';
  const tg = ctx.createLinearGradient(0, h * 0.4, 0, h * 0.55);
  tg.addColorStop(0, '#fff9e8');
  tg.addColorStop(1, '#f4d68a');
  ctx.fillStyle = tg;
  ctx.shadowColor = 'rgba(244,214,138,0.5)';
  ctx.shadowBlur = w * 0.02;
  ctx.font = `300 ${w * 0.1}px "Cormorant Garamond", Georgia, "Times New Roman", serif`;
  wrapCenteredText(ctx, clock, w / 2, h * 0.49, w * 0.92, w * 0.1 * 1.15);

  ctx.font = `400 ${w * 0.036}px "Cormorant Garamond", Georgia, serif`;
  ctx.fillStyle = '#e9d9ff';
  ctx.shadowBlur = w * 0.008;
  ctx.fillText(dateLine, w / 2, h * 0.59);

  // thin gold rule
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(244,214,138,0.6)';
  ctx.lineWidth = w * 0.002;
  ctx.beginPath();
  ctx.moveTo(w * 0.32, h * 0.63);
  ctx.lineTo(w * 0.68, h * 0.63);
  ctx.stroke();
}

// ---------- Theme: Extra Edition (newsprint) ----------
function drawNewsprint(ctx: CanvasRenderingContext2D, w: number, h: number, opts: DrawOptions) {
  clear(ctx, w, h);
  ctx.fillStyle = '#f4ecd8';
  ctx.fillRect(0, 0, w, h);

  // subtle paper speckle
  ctx.fillStyle = 'rgba(0,0,0,0.035)';
  const seedRand = makeStars(260, 99);
  seedRand.forEach((p) => {
    ctx.beginPath();
    ctx.arc(p.x * w, p.y * h * 1.25, w * 0.0012, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.strokeStyle = '#161311';
  ctx.lineWidth = w * 0.006;
  ctx.beginPath();
  ctx.moveTo(w * 0.06, h * 0.1);
  ctx.lineTo(w * 0.94, h * 0.1);
  ctx.stroke();
  ctx.lineWidth = w * 0.0015;
  ctx.beginPath();
  ctx.moveTo(w * 0.06, h * 0.115);
  ctx.lineTo(w * 0.94, h * 0.115);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#161311';
  ctx.font = `800 ${w * 0.052}px Georgia, "Times New Roman", serif`;
  ctx.fillText('THE DATETIME TIMES', w / 2, h * 0.087);

  ctx.font = `italic 700 ${w * 0.024}px Georgia, serif`;
  ctx.fillStyle = '#af1e2d';
  ctx.fillText('★ EXTRA EDITION ★ ONE COPY EVER PRINTED ★', w / 2, h * 0.145);

  const { clock, dateLine } = timeString(opts.date, opts.timeZone, opts.format, opts.showMs);

  ctx.fillStyle = '#161311';
  ctx.font = `900 ${w * 0.108}px "Georgia", "Times New Roman", serif`;
  wrapCenteredText(ctx, clock.toUpperCase(), w / 2, h * 0.44, w * 0.86, w * 0.108 * 1.05);

  ctx.font = `700 ${w * 0.034}px Georgia, serif`;
  ctx.fillText(`IT IS CURRENTLY ${dateLine.toUpperCase()}`, w / 2, h * 0.565);

  ctx.strokeStyle = '#161311';
  ctx.lineWidth = w * 0.0015;
  ctx.beginPath();
  ctx.moveTo(w * 0.06, h * 0.6);
  ctx.lineTo(w * 0.94, h * 0.6);
  ctx.stroke();

  ctx.font = `${w * 0.02}px Georgia, serif`;
  ctx.fillText(
    'VOL. I  ·  PRINTED EXCLUSIVELY FOR YOU  ·  DATETIME.STORE  ·  NOT AFFILIATED WITH ANY ACTUAL NEWSPAPER',
    w / 2,
    h * 0.63
  );

  // rubber stamp
  ctx.save();
  ctx.translate(w * 0.78, h * 0.78);
  ctx.rotate(-0.22);
  ctx.strokeStyle = 'rgba(175,30,45,0.85)';
  ctx.fillStyle = 'rgba(175,30,45,0.85)';
  ctx.lineWidth = w * 0.005;
  ctx.beginPath();
  ctx.arc(0, 0, w * 0.075, 0, Math.PI * 2);
  ctx.stroke();
  ctx.font = `800 ${w * 0.022}px Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.fillText('FRESH!', 0, w * 0.008);
  ctx.font = `700 ${w * 0.012}px Georgia, serif`;
  ctx.fillText('JUST HAPPENED', 0, w * 0.028);
  ctx.restore();
}

function wrapCenteredText(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  cy: number,
  maxWidth: number,
  lineHeight: number
) {
  // Shrinks font-size if the string is wider than maxWidth (keeps a single
  // line — our strings are short clock/date strings, not paragraphs).
  let size = parseFloat(ctx.font);
  const unit = ctx.font.replace(/^[\d.]+/, '').split(' ').pop() || 'px';
  const fontRest = ctx.font.replace(/[\d.]+px.*$/, '').trim();
  let width = ctx.measureText(text).width;
  let guard = 0;
  while (width > maxWidth && size > 4 && guard < 40) {
    size *= 0.94;
    ctx.font = `${fontRest} ${size}${unit}`.trim();
    width = ctx.measureText(text).width;
    guard++;
  }
  ctx.fillText(text, cx, cy);
}

export const THEME_DRAWERS: Record<
  ThemeId,
  (ctx: CanvasRenderingContext2D, w: number, h: number, opts: DrawOptions) => void
> = {
  terminal: drawTerminal,
  cottonCandy: drawCottonCandy,
  starfield: drawStarfield,
  newsprint: drawNewsprint,
};
