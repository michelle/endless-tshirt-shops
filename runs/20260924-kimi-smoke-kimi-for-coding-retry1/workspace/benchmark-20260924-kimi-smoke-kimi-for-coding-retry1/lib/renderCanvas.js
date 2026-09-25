// Client-side canvas renderer: draws the star map + a stylized tee behind it.
// Shares drawArtwork with the server-side print renderer so preview and print
// agree. Isomorphic: runs in the browser and under @napi-rs/canvas in Node.

import { computeScene, INK, INK_SOFT, GOLD, SHIRT_COLORS } from './scene.js';

function shirtHex(colorId) {
  return (SHIRT_COLORS.find((c) => c.id === colorId) || SHIRT_COLORS[0]).hex;
}

// Tee geometry shared by fill + clip. Issues path commands on any 2D context.
function traceTee(ctx, W, H) {
  const x0 = W * 0.07, x1 = W * 0.93;
  const y0 = H * 0.04, y1 = H * 0.97;
  const cx = W / 2;
  const neckW = W * 0.085, neckD = H * 0.052;
  const arm = W * 0.16; // body inset from each side
  const sleeveDrop = H * 0.115;
  const ax = x0 + arm; // body left
  const bx = x1 - arm; // body right
  const r = W * 0.02;

  ctx.beginPath();
  // neck scoop start (left neck point)
  ctx.moveTo(cx - neckW, y0);
  ctx.quadraticCurveTo(cx, y0 + neckD * 1.9, cx + neckW, y0);
  // right shoulder out to sleeve
  ctx.quadraticCurveTo(cx + neckW + W * 0.05, y0 + H * 0.004, x1 - W * 0.02, y0 + sleeveDrop * 0.28);
  ctx.quadraticCurveTo(x1, y0 + sleeveDrop * 0.5, x1 - W * 0.035, y0 + sleeveDrop * 0.86);
  // sleeve hem (diagonal in to armpit)
  ctx.lineTo(bx + W * 0.012, y0 + sleeveDrop);
  ctx.quadraticCurveTo(bx, y0 + sleeveDrop + H * 0.015, bx, y0 + sleeveDrop + H * 0.05);
  // right side down to hem
  ctx.lineTo(bx, y1 - r);
  ctx.quadraticCurveTo(bx, y1, bx - r, y1);
  ctx.lineTo(ax + r, y1);
  ctx.quadraticCurveTo(ax, y1, ax, y1 - r);
  ctx.lineTo(ax, y0 + sleeveDrop + H * 0.05);
  ctx.quadraticCurveTo(ax, y0 + sleeveDrop + H * 0.015, ax - W * 0.012, y0 + sleeveDrop);
  // left sleeve
  ctx.lineTo(x0 + W * 0.035, y0 + sleeveDrop * 0.86);
  ctx.quadraticCurveTo(x0, y0 + sleeveDrop * 0.5, x0 + W * 0.02, y0 + sleeveDrop * 0.28);
  ctx.quadraticCurveTo(cx - neckW - W * 0.05, y0 + H * 0.004, cx - neckW, y0);
  ctx.closePath();
}

export function drawPreview(canvas, design, opts = {}) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const hex = shirtHex(design.color);

  ctx.clearRect(0, 0, W, H);

  if (opts.artOnly) {
    const scene = computeScene(design, W, H);
    drawArtwork(ctx, scene, opts);
    return scene;
  }

  // shirt
  ctx.save();
  traceTee(ctx, W, H);
  const y0 = H * 0.04, y1 = H * 0.97;
  const grad = ctx.createLinearGradient(0, y0, 0, y1);
  grad.addColorStop(0, shade(hex, 16));
  grad.addColorStop(0.45, hex);
  grad.addColorStop(1, shade(hex, -12));
  ctx.fillStyle = grad;
  ctx.fill();

  // collar ribbing along the scoop
  const cx = W / 2;
  ctx.beginPath();
  ctx.moveTo(cx - W * 0.085, y0);
  ctx.quadraticCurveTo(cx, y0 + H * 0.052 * 1.9, cx + W * 0.085, y0);
  ctx.lineWidth = W * 0.018;
  ctx.strokeStyle = shade(hex, 26);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - W * 0.085, y0);
  ctx.quadraticCurveTo(cx, y0 + H * 0.052 * 1.9, cx + W * 0.085, y0);
  ctx.lineWidth = W * 0.006;
  ctx.strokeStyle = shade(hex, -16);
  ctx.stroke();

  // soft fabric shading
  const sheen = ctx.createRadialGradient(cx, H * 0.34, W * 0.06, cx, H * 0.34, W * 0.8);
  sheen.addColorStop(0, 'rgba(255,255,255,0.05)');
  sheen.addColorStop(1, 'rgba(0,0,0,0.12)');
  ctx.fillStyle = sheen;
  ctx.fill();
  ctx.restore();

  // artwork clipped to the chest/print zone
  const arm = W * 0.16;
  const box = {
    x: W * 0.07 + arm + W * 0.02,
    y: y0 + H * 0.055,
    w: W - 2 * (W * 0.07 + arm) - W * 0.04,
    h: (y1 - y0) * 0.94 - H * 0.055,
  };
  ctx.save();
  traceTee(ctx, W, H);
  ctx.clip();
  const scene = computeScene(design, Math.round(box.w), Math.round(box.h));
  ctx.translate(box.x, box.y);
  drawArtwork(ctx, scene, opts);
  ctx.restore();

  return scene;
}

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, (n >> 16) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
  const b = Math.max(0, Math.min(255, (n & 255) + amt));
  return `rgb(${r},${g},${b})`;
}

export function drawArtwork(ctx, scene, opts = {}) {
  const fonts = opts.fonts || {};
  const fam = {
    semibold: fonts.semibold || "Georgia, 'Times New Roman', serif",
    regular: fonts.regular || "Georgia, 'Times New Roman', serif",
    italic: fonts.italic || "Georgia, 'Times New Roman', serif",
  };
  const { W, H, cx, cy, R } = scene;
  ctx.save();

  // rim
  ctx.strokeStyle = INK;
  ctx.globalAlpha = 0.9;
  ctx.lineWidth = R * 0.010;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.stroke();

  // rings + spokes
  ctx.globalAlpha = 1;
  for (const ring of scene.rings) {
    ctx.strokeStyle = INK_SOFT + '0.16)';
    ctx.lineWidth = R * 0.0035;
    ctx.beginPath();
    ctx.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.strokeStyle = INK_SOFT + '0.10)';
  ctx.lineWidth = R * 0.003;
  for (const s of scene.spokes) {
    ctx.beginPath();
    ctx.moveTo(s.x1, s.y1);
    ctx.lineTo(s.x2, s.y2);
    ctx.stroke();
  }
  // ticks
  for (const t of scene.ticks) {
    ctx.strokeStyle = INK_SOFT + (t.major ? '0.5)' : '0.25)');
    ctx.lineWidth = t.major ? R * 0.004 : R * 0.0025;
    ctx.beginPath();
    ctx.moveTo(t.x1, t.y1);
    ctx.lineTo(t.x2, t.y2);
    ctx.stroke();
  }

  // constellation lines
  ctx.lineWidth = R * 0.0042;
  ctx.lineCap = 'round';
  for (const s of scene.segments) {
    ctx.strokeStyle = INK_SOFT + s.a + ')';
    ctx.beginPath();
    ctx.moveTo(s.x1, s.y1);
    ctx.lineTo(s.x2, s.y2);
    ctx.stroke();
  }

  // stars
  for (const st of scene.stars) {
    ctx.fillStyle = st.gold ? GOLD : INK_SOFT + st.a + ')';
    ctx.beginPath();
    ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
    ctx.fill();
    if (st.gold) {
      // sparkle cross on the brightest
      ctx.strokeStyle = GOLD;
      ctx.globalAlpha = 0.65;
      ctx.lineWidth = st.r * 0.32;
      const L = st.r * 3.4;
      ctx.beginPath();
      ctx.moveTo(st.x - L, st.y); ctx.lineTo(st.x + L, st.y);
      ctx.moveTo(st.x, st.y - L); ctx.lineTo(st.x, st.y + L);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  // moon
  if (scene.moon) {
    const m = scene.moon;
    ctx.strokeStyle = GOLD;
    ctx.fillStyle = GOLD;
    // glow
    ctx.globalAlpha = 0.14;
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.r * 1.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.95;
    // body
    ctx.lineWidth = m.r * 0.12;
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
    ctx.stroke();
    // terminator
    const rx = m.r * Math.abs(m.k) * 0.92;
    const bulge = m.k >= 0 ? 1 : -1;
    ctx.beginPath();
    ctx.moveTo(m.x, m.y - m.r);
    ctx.ellipse(m.x, m.y, Math.max(rx, 0.001), m.r, 0, -Math.PI / 2, Math.PI / 2, bulge > 0);
    ctx.closePath();
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // labels
  ctx.fillStyle = INK;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const l of scene.labels) {
    ctx.globalAlpha = 0.8;
    ctx.font = `600 ${l.size}px ${fam.semibold}`;
    ctx.fillText(l.ch, l.x, l.y);
  }
  ctx.globalAlpha = 1;

  // captions
  const caption = (node, family, style, alpha, spacing) => {
    if (!node) return;
    ctx.font = `${style} ${node.size}px ${family}`;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = INK;
    drawSpaced(ctx, node.text, node.x, node.y, spacing);
  };
  caption(scene.place, fam.semibold, '600', 0.96, scene.place ? scene.place.size * 0.22 : 0);
  caption(scene.when, fam.regular, '400', 0.72, scene.when.size * 0.30);
  caption(scene.msg, fam.italic, 'italic 400', 0.88, 0);
  caption(scene.brand, fam.regular, '400', 0.35, scene.brand.size * 0.30);
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawSpaced(ctx, text, x, y, spacing) {
  if (!spacing) {
    ctx.fillText(text, x, y);
    return;
  }
  const chars = [...text];
  const widths = chars.map((c) => ctx.measureText(c).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);
  let cur = x - total / 2;
  for (let i = 0; i < chars.length; i++) {
    ctx.fillText(chars[i], cur + widths[i] / 2, y);
    cur += widths[i] + spacing;
  }
}
