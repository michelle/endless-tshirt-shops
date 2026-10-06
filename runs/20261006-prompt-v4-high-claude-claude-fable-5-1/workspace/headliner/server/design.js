// HEADLINER design engine: turns a customer's "tour" into print-ready SVG.
// Pure function of the design object so the browser preview and the
// 300-DPI print file are generated from exactly the same code path.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import opentype from 'opentype.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const FONT_DIR = path.resolve(__dirname, '../assets/fonts');
export const FONT_FILES = [
  path.join(FONT_DIR, 'Anton-Regular.ttf'),
  path.join(FONT_DIR, 'BebasNeue-Regular.ttf'),
];

function loadFont(file) {
  const buf = fs.readFileSync(file);
  return opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
}
const FONTS = {
  Anton: loadFont(FONT_FILES[0]),
  'Bebas Neue': loadFont(FONT_FILES[1]),
};

// Bella+Canvas 3001 front/back print area on Prodigi: 4680 x 5790 px @ 300dpi.
export const PRINT_W = 4680;
export const PRINT_H = 5790;
// Design coordinate system (same aspect ratio).
export const W = 1000;
export const H = (W * PRINT_H) / PRINT_W; // 1237.18 (exact so the print file is 4680x5790)

export const SKU = 'GLOBAL-TEE-BC-3001';

export const SHIRT_COLORS = {
  black: { hex: '#141414', label: 'Black', dark: true },
  'dark heather grey': { hex: '#4b4b4f', label: 'Dark Heather', dark: true },
  'navy blue': { hex: '#1f2740', label: 'Navy', dark: true },
  maroon: { hex: '#5a1e2b', label: 'Maroon', dark: true },
  'military green': { hex: '#4a5137', label: 'Military Green', dark: true },
  cream: { hex: '#ece2cc', label: 'Cream', dark: false },
  white: { hex: '#f6f5f0', label: 'White', dark: false },
};

export const PALETTES = {
  bone: { label: 'Bone & Red', ink: '#F1E7D2', accent: '#D7263D', forDark: true },
  white: { label: 'White & Gold', ink: '#FFFFFF', accent: '#F2C14E', forDark: true },
  gold: { label: 'Gold & Bone', ink: '#E7B548', accent: '#F1E7D2', forDark: true },
  pink: { label: 'White & Hot Pink', ink: '#FFFFFF', accent: '#FF2E88', forDark: true },
  ice: { label: 'Ice & Sky', ink: '#DDE6EE', accent: '#7FD1FF', forDark: true },
  ink: { label: 'Ink & Red', ink: '#111111', accent: '#D7263D', forDark: false },
  navy: { label: 'Navy & Red', ink: '#1B2A4A', accent: '#C8102E', forDark: false },
  brown: { label: 'Brown & Orange', ink: '#3B2A1E', accent: '#E07A1F', forDark: false },
};

export const SIZES = ['xs', 's', 'm', 'l', 'xl', '2xl', '3xl', '4xl'];
export const LAYOUTS = {
  classic: { label: 'Front + back', priceCents: 4400, printAreas: ['front', 'back'] },
  front: { label: 'Front only', priceCents: 3400, printAreas: ['front'] },
};
export const SHIPPING_CENTS = 695;
export const MAX_STOPS = 16;

const clean = (s, max) =>
  String(s ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);

export function normalizeDesign(input = {}) {
  const d = {};
  d.tourName = clean(input.tourName, 40) || 'THE HEADLINERS';
  d.subtitle = clean(input.subtitle, 28) || 'WORLD TOUR';
  d.tagline = clean(input.tagline, 40);
  d.years = clean(input.years, 16);
  d.footer = clean(input.footer, 70);
  d.soldOut = Boolean(input.soldOut);
  d.layout = LAYOUTS[input.layout] ? input.layout : 'classic';
  d.shirtColor = SHIRT_COLORS[input.shirtColor] ? input.shirtColor : 'black';
  const isDark = SHIRT_COLORS[d.shirtColor].dark;
  d.palette = PALETTES[input.palette] ? input.palette : isDark ? 'bone' : 'ink';
  d.size = SIZES.includes(input.size) ? input.size : 'l';
  const stops = Array.isArray(input.stops) ? input.stops : [];
  d.stops = stops
    .map((s) => ({
      date: clean(s?.date, 18),
      place: clean(s?.place, 30),
      venue: clean(s?.venue, 36),
    }))
    .filter((s) => s.date || s.place || s.venue)
    .slice(0, MAX_STOPS);
  if (d.stops.length === 0) {
    d.stops = [{ date: 'TONIGHT', place: 'YOUR TOWN', venue: 'THE FIRST SHOW' }];
  }
  return d;
}

export function deriveYears(d) {
  if (d.years) return d.years.toUpperCase();
  const ys = d.stops
    .map((s) => (s.date.match(/\b(19|20)\d{2}\b/) || [])[0])
    .filter(Boolean)
    .map(Number);
  if (!ys.length) return '';
  const a = Math.min(...ys);
  const b = Math.max(...ys);
  return a === b ? String(a) : `${a} – ${b}`;
}

const esc = (s) =>
  String(s).replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]);

function measure(family, text, size, ls = 0) {
  const font = FONTS[family];
  const w = font.getAdvanceWidth(text, size, { kerning: true });
  return w + ls * Math.max(0, text.length - 1);
}

// Largest font size <= max that fits text in maxWidth (letterSpacing scales with size).
function fitSize(family, text, maxWidth, maxSize, minSize = 8, lsRatio = 0) {
  if (!text) return maxSize;
  const w1 = measure(family, text, 100, lsRatio * 100) / 100; // width per unit size
  const s = w1 > 0 ? maxWidth / w1 : maxSize;
  return Math.max(minSize, Math.min(maxSize, s));
}

function text(x, y, str, o) {
  const { family, size, fill, anchor = 'middle', ls = 0, opacity = 1, extra = '' } = o;
  return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-family="${family}" font-size="${size.toFixed(2)}" fill="${fill}" text-anchor="${anchor}"${
    ls ? ` letter-spacing="${ls.toFixed(2)}"` : ''
  }${opacity !== 1 ? ` opacity="${opacity}"` : ''}${extra}>${esc(str)}</text>`;
}

function star(cx, cy, r, fill) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push(`${(cx + rad * Math.cos(a)).toFixed(1)},${(cy + rad * Math.sin(a)).toFixed(1)}`);
  }
  return `<polygon points="${pts.join(' ')}" fill="${fill}"/>`;
}

function starRule(cx, y, width, color, starR = 7) {
  const half = width / 2;
  return (
    `<line x1="${cx - half}" y1="${y}" x2="${cx - starR * 2.2}" y2="${y}" stroke="${color}" stroke-width="2.5"/>` +
    star(cx, y, starR, color) +
    `<line x1="${cx + starR * 2.2}" y1="${y}" x2="${cx + half}" y2="${y}" stroke="${color}" stroke-width="2.5"/>`
  );
}

// Choose 1 or 2 lines for the headline, maximising font size.
function layoutHeadline(name, maxW, maxSize) {
  const one = fitSize('Anton', name, maxW, maxSize);
  const words = name.split(' ');
  if (words.length < 2 || one >= maxSize * 0.8) return { lines: [name], size: one };
  let best = { lines: [name], size: one };
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' ');
    const b = words.slice(i).join(' ');
    const s = Math.min(fitSize('Anton', a, maxW, maxSize), fitSize('Anton', b, maxW, maxSize));
    if (s > best.size) best = { lines: [a, b], size: s };
  }
  return best;
}

function soldOutStamp(cx, cy, scale, accent) {
  const w = 300 * scale;
  const h = 96 * scale;
  return (
    `<g transform="translate(${cx} ${cy}) rotate(-11)">` +
    `<rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="${10 * scale}" fill="none" stroke="${accent}" stroke-width="${7 * scale}"/>` +
    `<rect x="${-w / 2 + 11 * scale}" y="${-h / 2 + 11 * scale}" width="${w - 22 * scale}" height="${h - 22 * scale}" rx="${6 * scale}" fill="none" stroke="${accent}" stroke-width="${2.5 * scale}"/>` +
    text(0, 24 * scale, 'SOLD OUT', { family: 'Anton', size: 68 * scale, fill: accent, ls: 4 * scale }) +
    `</g>`
  );
}

// The full "tour poster" composition, used on the back (classic) or front (front-only).
function poster(d) {
  const p = PALETTES[d.palette];
  const ink = p.ink;
  const accent = p.accent;
  const cx = W / 2;
  const maxW = 860;
  const parts = [];
  let y = 80;

  const tagline = d.tagline.toUpperCase();
  if (tagline) {
    const s = fitSize('Bebas Neue', tagline, 560, 38, 18, 0.12);
    const tw = measure('Bebas Neue', tagline, s, s * 0.12);
    parts.push(text(cx, y, tagline, { family: 'Bebas Neue', size: s, fill: accent, ls: s * 0.12 }));
    const gap = 24;
    parts.push(
      `<line x1="${cx - maxW / 2}" y1="${y - s * 0.32}" x2="${cx - tw / 2 - gap}" y2="${y - s * 0.32}" stroke="${ink}" stroke-width="2.5"/>`,
      `<line x1="${cx + tw / 2 + gap}" y1="${y - s * 0.32}" x2="${cx + maxW / 2}" y2="${y - s * 0.32}" stroke="${ink}" stroke-width="2.5"/>`,
    );
    y += 26;
  }

  const name = d.tourName.toUpperCase();
  const hl = layoutHeadline(name, maxW, d.stops.length > 8 ? 160 : 190);
  const lineH = hl.size * 1.0;
  hl.lines.forEach((ln, i) => {
    y += lineH;
    parts.push(text(cx, y, ln, { family: 'Anton', size: hl.size, fill: ink, ls: hl.size * 0.01 }));
  });

  // Subtitle row: WORLD TOUR  ·  years
  y += 22;
  const sub = d.subtitle.toUpperCase();
  const years = deriveYears(d);
  const subSize = fitSize('Bebas Neue', sub, 700, 86, 30, 0.1);
  y += subSize * 0.82;
  parts.push(text(cx, y, sub, { family: 'Bebas Neue', size: subSize, fill: accent, ls: subSize * 0.1 }));
  y += 14;
  if (years) {
    const ys = 40;
    y += ys * 0.8;
    const yw = measure('Bebas Neue', years, ys, ys * 0.2);
    parts.push(text(cx, y, years, { family: 'Bebas Neue', size: ys, fill: ink, ls: ys * 0.2 }));
    parts.push(star(cx - yw / 2 - 30, y - ys * 0.3, 9, ink), star(cx + yw / 2 + 30, y - ys * 0.3, 9, ink));
    y += 10;
  }
  y += 26;
  parts.push(starRule(cx, y, maxW, ink, 8));
  y += 10;

  // Dates block.
  const footer = (d.footer || 'ALL DATES SUBJECT TO CHANGE  ·  NO REFUNDS ON MEMORIES').toUpperCase();
  const footerY = H - 60;
  const stampSpace = d.soldOut ? 120 : 0;
  const top = y + 30;
  const bottom = footerY - 70 - stampSpace;
  const avail = bottom - top;
  const stops = d.stops;
  const n = stops.length;
  const twoCol = n > 8;

  if (!twoCol) {
    const rowH = Math.min(96, avail / n);
    const r = rowH * 0.52; // base font size
    const x0 = cx - maxW / 2 + 10;
    const x1 = cx + maxW / 2 - 10;
    const dateW = 170;
    const venueW = 260;
    const placeX = x0 + dateW + 24;
    const placeW = x1 - venueW - 30 - placeX;
    let ry = top + rowH * 0.5 + r * 0.38;
    stops.forEach((s, i) => {
      const date = s.date.toUpperCase();
      const place = s.place.toUpperCase();
      const venue = s.venue.toUpperCase();
      if (date) {
        const ds = fitSize('Bebas Neue', date, dateW, r * 0.78, 10, 0.06);
        parts.push(text(x0, ry, date, { family: 'Bebas Neue', size: ds, fill: accent, anchor: 'start', ls: ds * 0.06 }));
      }
      if (place) {
        const ps = fitSize('Bebas Neue', place, venue ? placeW : x1 - placeX, r, 10, 0.03);
        parts.push(text(placeX, ry, place, { family: 'Bebas Neue', size: ps, fill: ink, anchor: 'start', ls: ps * 0.03 }));
      }
      if (venue) {
        const vs = fitSize('Bebas Neue', venue, venueW, r * 0.74, 10, 0.05);
        parts.push(text(x1, ry, venue, { family: 'Bebas Neue', size: vs, fill: ink, anchor: 'end', ls: vs * 0.05, opacity: 0.85 }));
      }
      if (i < n - 1) {
        parts.push(`<line x1="${x0}" y1="${(ry + rowH * 0.42).toFixed(1)}" x2="${x1}" y2="${(ry + rowH * 0.42).toFixed(1)}" stroke="${ink}" stroke-width="1.2" opacity="0.35"/>`);
      }
      ry += rowH;
    });
  } else {
    const perCol = Math.ceil(n / 2);
    const rowH = Math.min(118, avail / perCol);
    const colW = (maxW - 40) / 2;
    const r = rowH * 0.42;
    stops.forEach((s, i) => {
      const col = Math.floor(i / perCol);
      const row = i % perCol;
      const x = cx - maxW / 2 + 10 + col * (colW + 40);
      const ry = top + row * rowH + rowH * 0.5;
      const date = s.date.toUpperCase();
      const place = s.place.toUpperCase();
      const venue = s.venue.toUpperCase();
      let lx = x;
      if (date) {
        const ds = fitSize('Bebas Neue', date, colW * 0.4, r * 0.8, 10, 0.06);
        parts.push(text(lx, ry, date, { family: 'Bebas Neue', size: ds, fill: accent, anchor: 'start', ls: ds * 0.06 }));
        lx += measure('Bebas Neue', date, ds, ds * 0.06) + 14;
      }
      if (place) {
        const ps = fitSize('Bebas Neue', place, x + colW - lx, r, 10, 0.03);
        parts.push(text(lx, ry, place, { family: 'Bebas Neue', size: ps, fill: ink, anchor: 'start', ls: ps * 0.03 }));
      }
      if (venue) {
        const vs = fitSize('Bebas Neue', venue, colW, r * 0.68, 10, 0.08);
        parts.push(text(x, ry + r * 0.78, venue, { family: 'Bebas Neue', size: vs, fill: ink, anchor: 'start', ls: vs * 0.08, opacity: 0.85 }));
      }
      if (row < perCol - 1) {
        parts.push(`<line x1="${x}" y1="${(ry + rowH * 0.46).toFixed(1)}" x2="${x + colW}" y2="${(ry + rowH * 0.46).toFixed(1)}" stroke="${ink}" stroke-width="1.2" opacity="0.35"/>`);
      }
    });
  }

  // Footer.
  parts.push(starRule(cx, footerY - 42, maxW, ink, 6));
  const fs = fitSize('Bebas Neue', footer, maxW - 40, 26, 12, 0.14);
  parts.push(text(cx, footerY, footer, { family: 'Bebas Neue', size: fs, fill: ink, ls: fs * 0.14, opacity: 0.9 }));

  if (d.soldOut) {
    parts.push(soldOutStamp(cx + maxW / 2 - 160, footerY - 118, 0.95, accent));
  }
  return parts.join('\n');
}

// Small left-chest logo (wearer's left = viewer's right).
function chestLogo(d) {
  const p = PALETTES[d.palette];
  const ink = p.ink;
  const accent = p.accent;
  const logoW = 270; // ~4.2in on a 15.6in print area
  const cx = W * 0.73;
  let y = 150;
  const parts = [];
  const name = d.tourName.toUpperCase();
  const hl = layoutHeadline(name, logoW, 64);
  hl.lines.forEach((ln) => {
    y += hl.size;
    parts.push(text(cx, y, ln, { family: 'Anton', size: hl.size, fill: ink }));
  });
  y += 10;
  const sub = `${d.subtitle}${deriveYears(d) ? '  ·  ' + deriveYears(d) : ''}`.toUpperCase();
  const ss = fitSize('Bebas Neue', sub, logoW, 26, 10, 0.12);
  y += ss * 0.85;
  parts.push(text(cx, y, sub, { family: 'Bebas Neue', size: ss, fill: accent, ls: ss * 0.12 }));
  y += 18;
  parts.push(starRule(cx, y, logoW, ink, 5));
  return parts.join('\n');
}

function wrap(inner) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">\n${inner}\n</svg>`;
}

// Returns { front: svg, back?: svg } keyed by Prodigi print area.
export function renderDesign(input) {
  const d = normalizeDesign(input);
  if (d.layout === 'classic') {
    return { front: wrap(chestLogo(d)), back: wrap(poster(d)) };
  }
  return { front: wrap(poster(d)) };
}

export function priceCents(d) {
  return LAYOUTS[normalizeDesign(d).layout].priceCents;
}

export const CATALOG = { SHIRT_COLORS, PALETTES, SIZES, LAYOUTS, SHIPPING_CENTS, MAX_STOPS };
