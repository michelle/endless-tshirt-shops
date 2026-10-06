// Contours — design renderer. One module renders both the on-screen preview
// and the print file, so what the customer sees is exactly what gets printed.
// Pure ESM, no dependencies: runs in the browser and in Node.

import { colorByKey, MAX_TITLE_LEN, MAX_PLACE_LEN } from './catalog.js';

export const INK_DARK = '#29241b'; // charcoal ink for light shirts
export const INK_LIGHT = '#f3eee1'; // ivory ink for dark shirts

// Print canvas: matches the front print area of GLOBAL-TEE-BC-3001 (4680×5790 px).
export const PRINT_W = 4680;
export const PRINT_H = 5790;

// Layout lives in a 1000 × 1235.26 user unit box (same aspect as the print
// canvas), then scales to whatever size we render at.
const VW = 1000;
const VH = 1235.2564102564103;

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function cleanTitle(raw) {
  return String(raw ?? '')
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_TITLE_LEN);
}

export function cleanPlace(raw) {
  return String(raw ?? '')
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_PLACE_LEN);
}

export function fmtElev(m) {
  return Math.round(m).toLocaleString('en-US');
}

export function fmtFeet(m) {
  return Math.round(m * 3.28084).toLocaleString('en-US');
}

function fmtCoord(lat, lng) {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'W';
  const la = Math.abs(lat).toFixed(4);
  const lo = Math.abs(lng).toFixed(4);
  return `${la}° ${latDir} · ${lo}° ${lngDir}`;
}

function titleSize(title) {
  const n = title.length;
  if (n <= 12) return 92;
  if (n <= 18) return 76;
  if (n <= 26) return 64;
  if (n <= 34) return 56;
  return 50;
}

function placeSize(place) {
  const n = place.length;
  if (n <= 22) return 52;
  if (n <= 32) return 46;
  return 40;
}

// A nice readable scale-bar length for the window: prefer 1/2/5 km ≤ 22% width.
function niceScale(windowKm) {
  for (const km of [10, 5, 2, 1, 0.5, 0.25, 0.1]) {
    if (km / windowKm <= 0.22) return km;
  }
  return windowKm / 5;
}

// design:  { title, place, lat, lng, extentKm, colorKey }
// terrain: { interval, minElev, maxElev, hiElev, hi:[x,y], win:{x0,y0,x1,y1},
//            lines:[{l, m, c, p:[x0,y0,x1,y1,...]}], windowKm }
// opts:    { width, ink? , background?, showWordmark? }
export function renderDesignSVG(design, terrain, opts = {}) {
  const width = opts.width || PRINT_W;
  const scale = width / VW;
  const height = Math.round(VH * scale);

  const shirt = colorByKey(design.colorKey);
  const ink = opts.ink || (shirt?.ink === 'light' ? INK_LIGHT : INK_DARK);
  const title = cleanTitle(design.title) || 'THE SHAPE OF THIS PLACE';
  const place = cleanPlace(design.place);

  const parts = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${VW} ${VH.toFixed(2)}">`
  );
  if (opts.background) parts.push(`<rect width="${VW}" height="${VH.toFixed(2)}" fill="${opts.background}"/>`);
  parts.push(`<g fill="none" stroke="${ink}" color="${ink}">`);

  // ---- title ----
  const ts = titleSize(title);
  parts.push(
    `<text x="500" y="136" text-anchor="middle" fill="${ink}" stroke="none" font-family="Cormorant Garamond, CormorantGaramond, serif" font-weight="600" font-size="${ts}" letter-spacing="${(ts * 0.16).toFixed(1)}">${esc(title.toUpperCase())}</text>`
  );
  // small rule with a diamond
  parts.push(`<g fill="${ink}" stroke="none">`);
  parts.push(`<rect x="460" y="174" width="80" height="2.6" fill="${ink}" stroke="none"/>`);
  parts.push(`<rect x="500" y="171" width="10.8" height="10.8" transform="rotate(45 500 176.4)" fill="${ink}" stroke="none"/>`);
  parts.push(`</g>`);

  // ---- map panel ----
  const PX = 95, PY = 228, PS = 796; // outer frame
  const IX = PX + 14, IY = PY + 14, IS = PS - 28; // inner frame / clip
  parts.push(`<rect x="${PX}" y="${PY}" width="${PS}" height="${PS}" stroke-width="4"/>`);
  parts.push(`<rect x="${IX}" y="${IY}" width="${IS}" height="${IS}" stroke-width="1.4" opacity="0.85"/>`);

  const win = terrain.win;
  const gw = win.x1 - win.x0;
  const gh = win.y1 - win.y0;
  const gx = (v) => IX + ((v - win.x0) / gw) * IS;
  const gy = (v) => IY + ((v - win.y0) / gh) * IS;

  // contour lines
  parts.push(`<g clip-path="url(#clipmap)">`);
  const paths = [];
  for (const line of terrain.lines) {
    const p = line.p;
    if (!p || p.length < 4) continue;
    let d = `M${gx(p[0]).toFixed(1)} ${gy(p[1]).toFixed(1)}`;
    for (let i = 2; i < p.length; i += 2) {
      d += `L${gx(p[i]).toFixed(1)} ${gy(p[i + 1]).toFixed(1)}`;
    }
    let sw = 1.5, op = 0.68;
    if (line.m) { sw = 2.4; op = 0.92; }
    if (line.c) { sw = 3.4; op = 1; } // coastline
    paths.push(`<path d="${d}" stroke-width="${sw}" opacity="${op}"/>`);
  }
  parts.push(paths.join('\n'));
  parts.push(`</g>`); // clip

  // clipPath definition (needed after first use; SVG allows defs anywhere)
  parts.splice(parts.length - 1, 0,
    `<defs><clipPath id="clipmap"><rect x="${IX + 1.4}" y="${IY + 1.4}" width="${IS - 2.8}" height="${IS - 2.8}"/></clipPath></defs>`);

  // ---- compass (N with an arrow), top-right ----
  const nx = IX + IS - 46, nyTop = IY + 34, nyBot = nyTop + 44;
  parts.push(`<g fill="${ink}" stroke="${ink}">`);
  parts.push(`<line x1="${nx}" y1="${nyBot}" x2="${nx}" y2="${nyTop + 8}" stroke-width="1.8"/>`);
  parts.push(`<path d="M${nx} ${nyTop} L${nx - 5} ${nyTop + 11} L${nx + 5} ${nyTop + 11} Z" fill="${ink}" stroke="none"/>`);
  parts.push(
    `<text x="${nx}" y="${nyBot + 20}" text-anchor="middle" font-family="Jost, sans-serif" font-weight="500" font-size="21" letter-spacing="2" fill="${ink}" stroke="none">N</text>`
  );
  parts.push(`</g>`);

  // ---- scale bar, bottom-left ----
  const km = niceScale(terrain.windowKm);
  const barW = (km / terrain.windowKm) * IS;
  const bx = IX + 30, by = IY + IS - 34;
  parts.push(`<g fill="${ink}" stroke="${ink}">`);
  parts.push(`<line x1="${bx}" y1="${by}" x2="${bx + barW}" y2="${by}" stroke-width="2.6"/>`);
  parts.push(`<line x1="${bx}" y1="${by - 9}" x2="${bx}" y2="${by + 9}" stroke-width="2.6"/>`);
  parts.push(`<line x1="${bx + barW}" y1="${by - 9}" x2="${bx + barW}" y2="${by + 9}" stroke-width="2.6"/>`);
  parts.push(`<line x1="${bx + barW / 2}" y1="${by - 5}" x2="${bx + barW / 2}" y2="${by + 5}" stroke-width="1.6"/>`);
  const kmLabel = km >= 1 ? `${km} KM` : `${Math.round(km * 1000)} M`;
  parts.push(
    `<text x="${bx + barW / 2}" y="${by - 16}" text-anchor="middle" font-family="Jost, sans-serif" font-weight="400" font-size="19" letter-spacing="2.4" fill="${ink}" stroke="none">${kmLabel}</text>`
  );
  parts.push(`</g>`);

  // ---- high point marker ----
  if (terrain.hi) {
    const hx = gx(terrain.hi[0]);
    const hy = gy(terrain.hi[1]);
    parts.push(`<g fill="${ink}" stroke="none">`);
    parts.push(`<path d="M${hx.toFixed(1)} ${(hy - 9).toFixed(1)} L${(hx + 8).toFixed(1)} ${(hy + 6).toFixed(1)} L${(hx - 8).toFixed(1)} ${(hy + 6).toFixed(1)} Z"/>`);
    parts.push(
      `<text x="${(hx + 16).toFixed(1)}" y="${(hy + 7).toFixed(1)}" font-family="Jost, sans-serif" font-weight="500" font-size="22" letter-spacing="1.4" fill="${ink}">${fmtElev(terrain.hiElev)} M</text>`
    );
    parts.push(`</g>`);
  }

  // ---- captions ----
  if (place) {
    parts.push(
      `<text x="500" y="1072" text-anchor="middle" fill="${ink}" stroke="none" font-family="Cormorant Garamond, CormorantGaramond, serif" font-style="italic" font-weight="500" font-size="${placeSize(place)}">${esc(place)}</text>`
    );
  }
  parts.push(
    `<text x="500" y="1114" text-anchor="middle" fill="${ink}" stroke="none" font-family="Jost, sans-serif" font-weight="400" font-size="25" letter-spacing="8.5">${esc(fmtCoord(design.lat, design.lng))}</text>`
  );
  const elevLine = terrain.hiElev != null
    ? `HIGHEST POINT ${fmtElev(terrain.hiElev)} M · ${fmtFeet(terrain.hiElev)} FT`
    : `ELEVATION RANGE ${fmtElev(terrain.minElev)}–${fmtElev(terrain.maxElev)} M`;
  parts.push(
    `<text x="500" y="1152" text-anchor="middle" fill="${ink}" stroke="none" font-family="Jost, sans-serif" font-weight="400" font-size="23" letter-spacing="7" opacity="0.92">${esc(elevLine)}</text>`
  );
  if (opts.showWordmark !== false) {
    parts.push(
      `<text x="500" y="1188" text-anchor="middle" fill="${ink}" stroke="none" font-family="Jost, sans-serif" font-weight="500" font-size="19" letter-spacing="11" opacity="0.8">CONTOURS</text>`
    );
  }

  parts.push(`</g>`);
  parts.push(`</svg>`);
  return { svg: parts.join('\n'), width, height };
}

// The print file: the full front print-area canvas (4680×5790 for
// GLOBAL-TEE-BC-3001) with the artwork nested at a safe chest-print size
// (~11.7×14.5 in), centred — so the artwork survives even if the lab's usable
// area turns out smaller than the canvas.
export function renderPrintSVG(design, terrain, opts = {}) {
  const innerW = 3522; // ≈ 11.74 in @300dpi
  const innerH = Math.round((innerW * VH) / VW); // ≈ 4352 ≈ 14.5 in
  const x = (PRINT_W - innerW) / 2;
  const y = (PRINT_H - innerH) / 2;
  const { svg } = renderDesignSVG(design, terrain, { width: innerW, ink: opts.ink });
  const inner = svg.replace(
    /<svg[^>]*>/,
    `<svg x="${x}" y="${y}" width="${innerW}" height="${innerH}" viewBox="0 0 ${VW} ${VH.toFixed(2)}">`
  );
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${PRINT_W}" height="${PRINT_H}" viewBox="0 0 ${PRINT_W} ${PRINT_H}">${inner}</svg>`;
}
