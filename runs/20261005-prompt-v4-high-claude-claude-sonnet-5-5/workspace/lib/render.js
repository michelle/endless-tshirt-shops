import path from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import { computeSky, moonPhaseName } from './sky.js';
import { SHIRTS, THEMES } from './design.js';

// Prodigi front print area for Gildan 64000: 4665 x 5844 px.
export const PRINT_W = 4665;
export const PRINT_H = 5844;

// The design lives in an 800 x 1000 box.
const BOX_W = 800;
const BOX_H = 1040;
const CX = 400;
const CY = 360;
const R = 300;

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const fontDir = path.join(process.cwd(), 'fonts');
const FONT_FILES = [
  'CormorantGaramond_500Medium.ttf',
  'CormorantGaramond_500Medium_Italic.ttf',
  'CormorantGaramond_600SemiBold.ttf',
  'Jost_400Regular.ttf',
  'Jost_500Medium.ttf',
].map((f) => path.join(fontDir, f));

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const f1 = (n) => Math.round(n * 100) / 100;

export function formatDate(date, time) {
  const [y, m, d] = date.split('-').map(Number);
  let [hh, mm] = time.split(':').map(Number);
  const ap = hh >= 12 ? 'PM' : 'AM';
  hh = hh % 12 || 12;
  return `${MONTHS[m - 1]} ${d}, ${y}  ·  ${hh}:${String(mm).padStart(2, '0')} ${ap}`;
}

export function formatCoords(lat, lon) {
  return `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'}   ${Math.abs(lon).toFixed(4)}° ${lon >= 0 ? 'E' : 'W'}`;
}

function mix(hexA, hexB, t) {
  const a = hexA.match(/\w\w/g).map((h) => parseInt(h, 16));
  const b = hexB.match(/\w\w/g).map((h) => parseInt(h, 16));
  return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join('');
}

function starColor(theme, bv) {
  if (!theme.tint) return theme.star;
  if (bv < 0.25) return mix(theme.star, '#b9d0ff', 0.7);
  if (bv < 0.6) return theme.star;
  if (bv < 1.1) return mix(theme.star, '#ffd29a', 0.65);
  return mix(theme.star, '#ff9f78', 0.7);
}

function starRadius(mag) {
  return 0.95 + 0.55 * Math.pow(Math.max(0, 5.3 - mag), 1.2);
}

function spaced(text, size, spacing, x, y, fill, { weight = 500, family = 'Jost' } = {}) {
  return `<text x="${f1(x + spacing / 2)}" y="${f1(y)}" font-family="${family}" font-weight="${weight}" font-size="${size}" letter-spacing="${spacing}" text-anchor="middle" fill="${fill}">${esc(text)}</text>`;
}

function fitSize(text, maxWidth, base, perChar) {
  return Math.min(base, Math.floor(maxWidth / Math.max(1, text.length * perChar)));
}

function moonShape(m, r, color, ring) {
  const x = CX + m.x * R;
  const y = CY + m.y * R;
  const k = m.illum;
  const rx = Math.abs(1 - 2 * k) * r;
  let lit = '';
  if (k > 0.985) lit = `<circle r="${r}" fill="${color}"/>`;
  else if (k > 0.015) {
    const sweep = k < 0.5 ? 0 : 1;
    lit = `<path d="M0 ${-r} A${r} ${r} 0 0 1 0 ${r} A${f1(rx)} ${r} 0 0 ${sweep} 0 ${-r} Z" fill="${color}"/>`;
  }
  const deg = (m.limbAngle * 180) / Math.PI;
  return `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(deg)})"><circle r="${r}" fill="none" stroke="${ring}" stroke-width="1.1" opacity="0.7"/>${lit}</g>`;
}

// Returns the SVG fragment for the 800 x 1000 design box (no <svg> wrapper).
export function designFragment(design, sky, shirtTone) {
  const theme = THEMES[design.theme];
  const textColor = theme.text || (shirtTone === 'dark' ? '#fdf6e3' : '#14213d');
  const subColor = theme.sub || (shirtTone === 'dark' ? '#d4c9ae' : '#4a5a80');
  const parts = [];

  parts.push('<defs>');
  parts.push(`<clipPath id="disc"><circle cx="${CX}" cy="${CY}" r="${R - 12}"/></clipPath>`);
  parts.push('</defs>');

  if (theme.disc) parts.push(`<circle cx="${CX}" cy="${CY}" r="${R}" fill="${theme.disc}"/>`);

  // Compass ring with ticks
  parts.push(`<circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="${theme.ring}" stroke-width="2.6"/>`);
  parts.push(`<circle cx="${CX}" cy="${CY}" r="${R - 12}" fill="none" stroke="${theme.ring}" stroke-width="1.1" opacity="0.8"/>`);
  let ticks = '';
  for (let a = 0; a < 360; a += 5) {
    const major = a % 90 === 0;
    const mid = a % 15 === 0;
    const len = major ? 12 : mid ? 8 : 5;
    const rad = (a * Math.PI) / 180;
    const x1 = CX + Math.sin(rad) * (R - 12);
    const y1 = CY - Math.cos(rad) * (R - 12);
    const x2 = CX + Math.sin(rad) * (R - 12 + len);
    const y2 = CY - Math.cos(rad) * (R - 12 + len);
    ticks += `M${f1(x1)} ${f1(y1)}L${f1(x2)} ${f1(y2)}`;
  }
  parts.push(`<path d="${ticks}" stroke="${theme.ring}" stroke-width="1.1" fill="none" opacity="0.85"/>`);
  const cardinals = [['N', 0, -1], ['E', -1, 0], ['S', 0, 1], ['W', 1, 0]];
  for (const [label, dx, dy] of cardinals) {
    parts.push(
      `<text x="${f1(CX + dx * (R + 26))}" y="${f1(CY + dy * (R + 26) + 8)}" font-family="Jost" font-weight="500" font-size="22" text-anchor="middle" fill="${theme.accent}">${label}</text>`,
    );
  }

  // Sky contents, clipped to the inner disc
  parts.push('<g clip-path="url(#disc)">');
  if (design.lines) {
    let d = '';
    for (const [a, b] of sky.segments) {
      d += `M${f1(CX + a.x * R)} ${f1(CY + a.y * R)}L${f1(CX + b.x * R)} ${f1(CY + b.y * R)}`;
    }
    parts.push(`<path d="${d}" stroke="${theme.line}" stroke-width="1.15" fill="none" stroke-linecap="round" opacity="0.7"/>`);
  }
  for (const s of sky.stars) {
    if (s.mag > 5.25) continue;
    const x = CX + s.x * R;
    const y = CY + s.y * R;
    const r = starRadius(s.mag);
    const color = starColor(theme, s.bv);
    if (s.mag < 1.6 && theme.tone !== 'light') {
      parts.push(`<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r * 2.1)}" fill="${color}" opacity="0.22"/>`);
    }
    parts.push(`<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}" fill="${color}"/>`);
  }
  if (design.planets) {
    const labelled = [];
    for (const p of sky.planets) {
      const x = CX + p.x * R;
      const y = CY + p.y * R;
      parts.push(`<circle cx="${f1(x)}" cy="${f1(y)}" r="6.5" fill="none" stroke="${theme.accent}" stroke-width="1.6"/>`);
      parts.push(`<circle cx="${f1(x)}" cy="${f1(y)}" r="2.6" fill="${theme.accent}"/>`);
      const left = x > CX + R - 90;
      let ly = y + 4;
      while (labelled.some((l) => Math.abs(l.x - x) < 70 && Math.abs(l.y - ly) < 13)) ly += 13;
      labelled.push({ x, y: ly });
      parts.push(
        `<text x="${f1(left ? x - 11 : x + 11)}" y="${f1(ly)}" font-family="Jost" font-weight="400" font-size="12" letter-spacing="1" text-anchor="${left ? 'end' : 'start'}" fill="${theme.accent}">${p.name.toUpperCase()}</text>`,
      );
    }
    if (sky.moon.visible) parts.push(moonShape(sky.moon, 13, theme.accent, theme.accent));
  }
  parts.push('</g>');

  // Typography
  let y = 800;
  const title = design.title.trim();
  if (title) {
    const size = fitSize(title, 740, 78, 0.5);
    parts.push(
      `<text x="${CX}" y="${y}" font-family="Cormorant Garamond" font-weight="600" font-size="${size}" text-anchor="middle" fill="${textColor}">${esc(title)}</text>`,
    );
  }
  y += 50;
  const place = design.place.toUpperCase();
  const placeSize = Math.max(14, fitSize(place, 720, 22, 0.8 + 0.3));
  parts.push(spaced(place, placeSize, 6, CX, y, subColor));
  y += 40;
  const when = formatDate(design.date, design.time);
  parts.push(
    `<text x="${CX}" y="${y}" font-family="Cormorant Garamond" font-style="italic" font-weight="500" font-size="32" text-anchor="middle" fill="${textColor}">${esc(when)}</text>`,
  );
  y += 32;
  parts.push(spaced(formatCoords(design.lat, design.lon), 15, 3, CX, y, subColor, { weight: 400 }));
  y += 24;
  const moonText = `${moonPhaseName(sky.moon.phaseAngle)}  ·  ${Math.round(sky.moon.illum * 100)}% illuminated`;
  parts.push(spaced(moonText.toUpperCase(), 13, 3, CX, y, subColor, { weight: 400 }));
  y += 52;
  const line = design.line.trim();
  if (line) {
    const size = fitSize(line, 720, 36, 0.42);
    parts.push(
      `<text x="${CX}" y="${y}" font-family="Cormorant Garamond" font-style="italic" font-weight="500" font-size="${size}" text-anchor="middle" fill="${textColor}">${esc(line)}</text>`,
    );
  }
  return parts.join('');
}

function render(svg, width) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: width },
    font: { fontFiles: FONT_FILES, loadSystemFonts: false, defaultFontFamily: 'Jost' },
  });
  return resvg.render().asPng();
}

export function renderPreviewPng(design, width = 900) {
  const sky = computeSky(design);
  const tone = SHIRTS[design.shirt].tone;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${BOX_W}" height="${BOX_H}" viewBox="0 0 ${BOX_W} ${BOX_H}">${designFragment(design, sky, tone)}</svg>`;
  return render(svg, width);
}

// Full-resolution transparent PNG at Prodigi's front print-area size.
export function renderPrintPng(design) {
  const sky = computeSky(design);
  const tone = SHIRTS[design.shirt].tone;
  const vbH = (1000 * PRINT_H) / PRINT_W;
  const scale = 0.9; // 800 units → ~11.2" wide on the chest
  const offsetX = (1000 - BOX_W * scale) / 2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${PRINT_W}" height="${PRINT_H}" viewBox="0 0 1000 ${vbH}"><g transform="translate(${offsetX} 45) scale(${scale})">${designFragment(design, sky, tone)}</g></svg>`;
  return render(svg, PRINT_W);
}
