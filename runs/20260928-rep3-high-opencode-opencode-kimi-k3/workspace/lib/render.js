// Shared artwork renderer. Draws the complete print design onto any
// Canvas2D-compatible context (browser canvas for previews, @napi-rs/canvas
// for the 300 DPI print file sent to Prodigi).
//
// Canvas aspect matches the product print area (15.6" x 19.3").
import { projectSky, moonPhase, starColor } from './sky';

export const FONT_SERIF = 'CormorantGaramond-Medium';
export const FONT_SERIF_BOLD = 'CormorantGaramond-SemiBold';
export const FONT_SERIF_ITALIC = 'CormorantGaramond-MediumItalic';

// Layout (fractions of width W / height H, aspect fixed at 15.6:19.3)
export const PRINT_ASPECT = 19.3 / 15.6; // H = W * PRINT_ASPECT
const DISC_R = 0.355; // sky disc radius, fraction of W
const DISC_CY = 0.365; // disc centre, fraction of H

const INK = {
  dark: {
    // printed on dark shirts
    text: '#f2ead6',
    textSoft: 'rgba(242,234,214,0.72)',
    textFaint: 'rgba(242,234,214,0.5)',
  },
  light: {
    // printed on light shirts
    text: '#26304f',
    textSoft: 'rgba(38,48,79,0.78)',
    textFaint: 'rgba(38,48,79,0.55)',
  },
};

function drawMoonPhase(ctx, x, y, r, frac) {
  // Dark full disc, then the lit portion bounded by a semicircle and the
  // terminator ellipse. Waxing phases are lit on the right.
  const dark = '#101c3e';
  const light = '#e9dcb4';
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = dark;
  ctx.fill();
  ctx.strokeStyle = 'rgba(233,220,180,0.5)';
  ctx.lineWidth = Math.max(1, r * 0.04);
  ctx.stroke();

  if (frac > 0.02 && frac < 0.98) {
    const waxing = frac < 0.5;
    const half = frac % 0.5; // 0 at new/full, 0.5 at quarters
    const k = Math.cos(2 * Math.PI * frac); // terminator half-width / r
    ctx.beginPath();
    // lit semicircle: right side when waxing, left when waning
    const a0 = waxing ? -Math.PI / 2 : Math.PI / 2;
    const a1 = waxing ? Math.PI / 2 : (3 * Math.PI) / 2;
    ctx.arc(x, y, r, a0, a1);
    // terminator ellipse back to start; crescents bow inward, gibbous outward
    ctx.ellipse(x, y, Math.abs(k) * r, r, 0, a1, a0, k > 0);
    ctx.closePath();
    ctx.fillStyle = light;
    ctx.fill();
    void half;
  } else if (frac >= 0.98 || frac <= 0.02) {
    // essentially new
  }
  ctx.restore();
}

function fitFont(ctx, text, weight, family, maxSize, maxWidth) {
  let size = maxSize;
  while (size > 8) {
    ctx.font = `${weight} ${size}px "${family}"`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size *= 0.94;
  }
  return size;
}

function letterspaced(ctx, text, spacingPx) {
  // draw text with manual letter spacing, centred at current translate origin
  const chars = [...text];
  const widths = chars.map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacingPx * (chars.length - 1);
  let x = -total / 2;
  const prevAlign = ctx.textAlign;
  ctx.textAlign = 'left';
  for (let i = 0; i < chars.length; i++) {
    ctx.fillText(chars[i], x, 0);
    x += widths[i] + spacingPx;
  }
  ctx.textAlign = prevAlign;
}

// p: { t, lat, lng, line1, place, when, coords, theme }
export function renderArtwork(ctx, W, H, p) {
  const theme = INK[p.theme === 'light' ? 'light' : 'dark'];
  const u = W / 1000; // unit scale
  ctx.clearRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const R = DISC_R * W;
  const cx = W / 2;
  const cy = DISC_CY * H;

  // ---- sky disc
  const grad = ctx.createRadialGradient(cx, cy, R * 0.05, cx, cy, R);
  grad.addColorStop(0, '#16224d');
  grad.addColorStop(0.55, '#0e1838');
  grad.addColorStop(1, '#070d22');
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.clip();

  const sky = projectSky({ utcMs: p.t, lat: p.lat, lng: p.lng });

  // constellation hairlines
  ctx.strokeStyle = 'rgba(148,170,224,0.30)';
  ctx.lineWidth = Math.max(0.6, u * 1.1);
  ctx.lineCap = 'round';
  for (const seg of sky.lines) {
    ctx.beginPath();
    seg.forEach((pt, i) => {
      const px = cx + pt.x * R;
      const py = cy + pt.y * R;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();
  }

  // altitude graticule (30° / 60°)
  ctx.strokeStyle = 'rgba(148,170,224,0.14)';
  ctx.lineWidth = Math.max(0.5, u * 0.8);
  for (const rr of [1 / 3, 2 / 3]) {
    ctx.beginPath();
    ctx.arc(cx, cy, R * rr, 0, Math.PI * 2);
    ctx.stroke();
  }

  // stars
  for (const s of sky.stars) {
    const mag = s.mag;
    const sr = Math.max(0.5, Math.pow(5.4 - mag, 1.45) * 0.16) * u * 1.9;
    const alpha = Math.min(1, 0.55 + (5 - mag) * 0.16);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = starColor(s.bv ?? 0.6);
    ctx.beginPath();
    ctx.arc(cx + s.x * R, cy + s.y * R, sr, 0, Math.PI * 2);
    ctx.fill();
    if (mag <= 1.6) {
      // soft glow around the brightest stars
      ctx.globalAlpha = alpha * 0.18;
      ctx.beginPath();
      ctx.arc(cx + s.x * R, cy + s.y * R, sr * 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  // ---- horizon ring, ticks, cardinal letters
  ctx.beginPath();
  ctx.arc(cx, cy, R + u * 2, 0, Math.PI * 2);
  ctx.strokeStyle = theme.textFaint;
  ctx.lineWidth = Math.max(1, u * 1.4);
  ctx.stroke();
  for (let deg = 0; deg < 360; deg += 5) {
    const a = ((deg - 90) * Math.PI) / 180; // 0° = north at top
    const long = deg % 30 === 0;
    const r0 = R + u * 4;
    const r1 = r0 + (long ? u * 10 : u * 5);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
    ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
    ctx.strokeStyle = theme.textFaint;
    ctx.lineWidth = Math.max(0.6, u * (long ? 1.2 : 0.7));
    ctx.stroke();
  }
  // cardinal points — mirrored sky convention: E left, W right
  const cardinals = [
    ['N', 0], ['E', 90], ['S', 180], ['W', 270],
  ];
  ctx.fillStyle = theme.textSoft;
  ctx.font = `600 ${u * 26}px "${FONT_SERIF_BOLD}"`;
  for (const [letter, deg] of cardinals) {
    const a = ((deg - 90) * Math.PI) / 180;
    const rr = R + u * 34;
    ctx.fillText(letter, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }

  // ---- moon inset (lower right of the disc)
  const mp = moonPhase(p.t);
  const mr = R * 0.085;
  const mx = cx + R * 0.66;
  const my = cy + R * 0.66;
  drawMoonPhase(ctx, mx, my, mr, mp.frac);

  // ---- typography (generous leading so descenders never collide)
  let y = cy + R + u * 126;
  ctx.fillStyle = theme.text;
  const title = (p.line1 || 'Written in the Stars').slice(0, 42);
  const tSize = fitFont(ctx, title, 'italic 500', FONT_SERIF_ITALIC, u * 100, W * 0.86);
  ctx.font = `italic 500 ${tSize}px "${FONT_SERIF_ITALIC}"`;
  ctx.fillText(title, cx, y);

  y += u * 104;
  ctx.fillStyle = theme.textSoft;
  ctx.font = `600 ${u * 40}px "${FONT_SERIF_BOLD}"`;
  ctx.save();
  ctx.translate(cx, y);
  letterspaced(ctx, (p.place || '').toUpperCase().slice(0, 44), u * 7);
  ctx.restore();

  y += u * 66;
  ctx.fillStyle = theme.textSoft;
  ctx.font = `500 ${u * 38}px "${FONT_SERIF}"`;
  ctx.fillText((p.when || '').slice(0, 60), cx, y);

  if (p.coords) {
    y += u * 58;
    ctx.fillStyle = theme.textFaint;
    ctx.font = `500 ${u * 30}px "${FONT_SERIF}"`;
    ctx.fillText(p.coords.slice(0, 40), cx, y);
  }

  // brand mark
  ctx.fillStyle = theme.textFaint;
  ctx.font = `600 ${u * 24}px "${FONT_SERIF_BOLD}"`;
  ctx.save();
  ctx.translate(cx, H - u * 64);
  letterspaced(ctx, 'C E L E S T E E', u * 6);
  ctx.restore();

  return { moon: mp };
}
