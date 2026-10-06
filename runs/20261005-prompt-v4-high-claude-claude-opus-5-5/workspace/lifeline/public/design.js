// Renders a Lifeline design as an SVG string sized to Prodigi's front print area
// for the Bella+Canvas 3001 (4680 × 5790 px ≈ 15.6" × 19.3" at 300 dpi).
// The same function drives the browser preview and the server print file, so the
// customer sees exactly what gets printed.
import { METRICS } from './metrics.js';
import { lineColor } from './catalog.js';

export const PRINT_W = 4680;
export const PRINT_H = 5790;

const FONT = 'Inter Display';
const WEIGHT = { medium: 500, bold: 700, black: 900 };

// Artwork is at most ~11.7" wide and starts ~0.8" below the top of the print area
// so it lands on the chest. It is centred horizontally on its real content width.
const X0 = 590;
const X1 = 4090;
const Y0 = 250;
const MAX_W = 3600;
const MAX_H = 4300;

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function measure(text, weight, size, tracking = 0) {
  const table = METRICS[weight];
  let w = 0;
  let n = 0;
  for (const ch of text) {
    w += table[ch] ?? 600;
    n++;
  }
  return (w / 1000) * size + Math.max(0, n - 1) * tracking * size;
}

// Fits text to maxWidth: first shrinks the type (down to minScale), then squeezes
// the glyphs with textLength. Returns { svg, width, size }.
function text(str, { x, y, weight, size, fill, anchor = 'start', tracking = 0, maxWidth = Infinity, minScale = 0.8 }) {
  if (!str) return { svg: '', width: 0, size };
  let natural = measure(str, weight, size, tracking);
  if (natural > maxWidth) {
    const s = Math.max(minScale, maxWidth / natural);
    size *= s;
    natural *= s;
  }
  const fits = natural <= maxWidth + 0.5;
  const attrs = [
    `x="${x.toFixed(1)}"`, `y="${y.toFixed(1)}"`,
    `font-family="${FONT}"`, `font-weight="${WEIGHT[weight]}"`, `font-size="${size.toFixed(1)}"`,
    `fill="${fill}"`,
  ];
  if (anchor !== 'start') attrs.push(`text-anchor="${anchor}"`);
  if (fits && tracking) attrs.push(`letter-spacing="${(tracking * size).toFixed(1)}"`);
  if (!fits) attrs.push(`textLength="${maxWidth.toFixed(1)}"`, 'lengthAdjust="spacingAndGlyphs"');
  return { svg: `<text ${attrs.join(' ')}>${esc(str)}</text>`, width: Math.min(natural, maxWidth), size };
}

function bullet(cx, cy, r, letter, colorId) {
  const c = lineColor(colorId) ?? lineColor('red');
  const size = letter.length > 1 ? r * 1.02 : r * 1.38;
  // Inter cap height ≈ 0.727em → baseline sits half a cap below centre.
  const label = text(letter, {
    x: cx, y: cy + size * 0.3635, weight: 'black', size, fill: c.text, anchor: 'middle', maxWidth: r * 1.55, minScale: 1,
  });
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${c.hex}"/>${label.svg}`;
}

export function layout(design) {
  const n = design.stops.length;
  const firstY = Y0 + 1130;
  const gap = Math.max(330, Math.min(n <= 3 ? 640 : 520, 2310 / Math.max(1, n - 1)));
  const scale = Math.min(1, gap / 450);
  const stopYs = design.stops.map((_, i) => firstY + i * gap);
  const lastY = stopYs[n - 1] ?? firstY;
  const nextY = design.next ? lastY + Math.max(360, gap * 0.85) : null;
  return { gap, scale, stopYs, lastY, nextY };
}

export function renderSVG(design, { dark = false, background = null } = {}) {
  const line = lineColor(design.color) ?? lineColor('red');
  const ink = dark ? '#FFFFFF' : '#141414';
  const paper = '#FFFFFF';
  const { scale, stopYs, lastY, nextY } = layout(design);
  const body = [];
  let right = X0; // rightmost content edge, for centring
  let bottom = Y0; // lowest content edge, for sizing

  // ── Route line: solid from the bullet to the last stop, dashed to "next" ─────
  const bR = 330;
  const lineX = X0 + bR;
  const bCy = Y0 + 120 + bR;
  const lineW = 150;
  body.push(
    `<line x1="${lineX}" y1="${bCy}" x2="${lineX}" y2="${lastY}" stroke="${line.hex}" stroke-width="${lineW}" stroke-linecap="round"/>`
  );
  if (nextY) {
    body.push(
      `<line x1="${lineX}" y1="${lastY + 130}" x2="${lineX}" y2="${nextY - 150}" stroke="${line.hex}" stroke-width="${lineW}" stroke-dasharray="64 80"/>`
    );
  }

  // ── Header: route bullet, line name, tagline ────────────────────────────────
  body.push(bullet(lineX, bCy, bR, design.letter || '?', design.color));
  const titleX = X0 + 2 * bR + 150;
  const titleW = X1 - titleX;
  const hasTag = Boolean(design.tagline);
  const title = text(design.name, {
    x: titleX, y: bCy + (hasTag ? 40 : 110), weight: 'black', size: 300, fill: ink, maxWidth: titleW, tracking: -0.01, minScale: 0.72,
  });
  body.push(title.svg);
  right = Math.max(right, titleX + title.width);
  if (hasTag) {
    const tag = text(design.tagline.toUpperCase(), {
      x: titleX + 8, y: bCy + 250, weight: 'bold', size: 118, fill: ink, tracking: 0.12, maxWidth: titleW - 8,
    });
    body.push(tag.svg);
    right = Math.max(right, titleX + 8 + tag.width);
  }

  // ── Stops ────────────────────────────────────────────────────────────────────
  const labelX = lineX + 300;
  const nameSize = 205 * scale;
  const noteSize = 122 * scale;
  const dotR = 92;
  design.stops.forEach((stop, i) => {
    const y = stopYs[i];
    const isEnd = i === 0 || i === design.stops.length - 1;
    if (stop.transfer) {
      body.push(
        `<rect x="${lineX - 125}" y="${y - 125}" width="250" height="250" rx="125" fill="${paper}" stroke="${ink}" stroke-width="44"/>`
      );
    } else {
      body.push(
        `<circle cx="${lineX}" cy="${y}" r="${isEnd ? dotR + 18 : dotR}" fill="${paper}" stroke="${dark ? paper : ink}" stroke-width="${isEnd ? 40 : 30}"/>`
      );
    }

    const nameCap = nameSize * 0.727;
    const noteCap = noteSize * 0.727;
    const between = 70 * scale;
    let nameBase = y + nameCap / 2;
    let noteBase = null;
    if (stop.note) {
      const h = nameCap + between + noteCap;
      nameBase = y - h / 2 + nameCap;
      noteBase = nameBase + between + noteCap;
    }

    const tR = 118 * scale;
    const maxName = X1 - labelX - (stop.transfer ? 2 * tR + 70 : 0);
    const name = text(stop.name, { x: labelX, y: nameBase, weight: 'bold', size: nameSize, fill: ink, maxWidth: maxName, tracking: -0.005 });
    body.push(name.svg);
    right = Math.max(right, labelX + name.width);
    if (stop.transfer) {
      const cx = labelX + name.width + 70 + tR;
      body.push(bullet(cx, nameBase - (name.size * 0.727) / 2, tR, stop.transfer.letter, stop.transfer.color));
      right = Math.max(right, cx + tR);
    }
    if (noteBase) {
      const note = text(stop.note.toUpperCase(), {
        x: labelX + 4, y: noteBase, weight: 'bold', size: noteSize, fill: ink, tracking: 0.1, maxWidth: X1 - labelX - 4,
      });
      body.push(note.svg);
      right = Math.max(right, labelX + 4 + note.width);
    }
    bottom = Math.max(bottom, y + 145, (noteBase ?? nameBase) + 0.22 * (noteBase ? noteSize : nameSize));
  });

  // ── "Next stop" ─────────────────────────────────────────────────────────────
  if (nextY) {
    body.push(`<circle cx="${lineX}" cy="${nextY}" r="${dotR + 10}" fill="none" stroke="${line.hex}" stroke-width="44"/>`);
    const kicker = text('NEXT STOP', {
      x: labelX + 4, y: nextY - 30 * scale, weight: 'bold', size: 105 * scale, fill: ink, tracking: 0.16,
    });
    const next = text(design.next, {
      x: labelX, y: nextY + 165 * scale, weight: 'bold', size: nameSize * 0.92, fill: ink, maxWidth: X1 - labelX, tracking: -0.005,
    });
    body.push(kicker.svg, next.svg);
    right = Math.max(right, labelX + next.width, labelX + 4 + kicker.width);
    bottom = Math.max(bottom, nextY + 165 * scale + 0.22 * next.size);
  }

  // Sign rule across the top, spanning the content.
  body.unshift(`<rect x="${X0}" y="${Y0}" width="${(right - X0).toFixed(1)}" height="34" fill="${ink}"/>`);

  // Scale the composition to a consistent chest-print size (≤ 12" wide, ≤ 14.3"
  // tall at 300 dpi), then centre it horizontally. Top edge stays put.
  const w = right - X0;
  const h = bottom - Y0;
  const k = Math.min(MAX_W / w, MAX_H / h, 1.4);
  const dx = (PRINT_W - w * k) / 2 - X0 * k;
  const dy = Y0 - Y0 * k;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${PRINT_W}" height="${PRINT_H}" viewBox="0 0 ${PRINT_W} ${PRINT_H}">` +
    (background ? `<rect width="100%" height="100%" fill="${background}"/>` : '') +
    `<g transform="translate(${dx.toFixed(1)} ${dy.toFixed(1)}) scale(${k.toFixed(4)})">${body.join('')}</g></svg>`
  );
}
