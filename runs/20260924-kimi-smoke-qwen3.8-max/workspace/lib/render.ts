/**
 * The artwork renderer.
 *
 * Pure canvas-2D drawing code (no DOM, no Node APIs beyond what the ctx
 * provides) so the exact same routine produces both the on-screen preview
 * and the 2490x3510 print file that Prodigi downloads.
 *
 * Everything is drawn in a 2490x3510 logical space (the Bella+Canvas 3001
 * front print area at 300 DPI) and scaled to the requested pixel width.
 */
import type { Design, Palette } from './design';
import { PALETTES, formatCoord, formatDateHuman } from './design';
import type { Terrain } from './terrain-types';
import { contourLevels, marchingSquares } from './contours';

export const PRINT_W = 2490;
export const PRINT_H = 3510;

// layout in logical units
const MAP_X = 150;
const MAP_Y = 330;
const MAP_SIZE = PRINT_W - 300; // 2190
const EYEBROW_Y = 205;
const COORD_Y = 2705;
const LABEL_Y = 2930;
const CAPTION_Y = 3055;
const DATE_Y = 3200;
const FOOT_Y = 3385;

type AnyCtx = any; // napi-rs / DOM canvas contexts share the 2D API we use

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const v = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

function rampColor(stops: [string, string, string], t: number): string {
  const x = Math.min(1, Math.max(0, t));
  const [a, b, c] = stops.map(hexToRgb) as [[number, number, number], [number, number, number], [number, number, number]];
  let rgb: [number, number, number];
  if (x < 0.5) {
    const k = x * 2;
    rgb = [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k].map(Math.round) as [number, number, number];
  } else {
    const k = (x - 0.5) * 2;
    rgb = [b[0] + (c[0] - b[0]) * k, b[1] + (c[1] - b[1]) * k, b[2] + (c[2] - b[2]) * k].map(Math.round) as [number, number, number];
  }
  return `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
}

function trackedWidth(ctx: AnyCtx, text: string, tracking: number): number {
  let w = 0;
  for (const ch of text) w += ctx.measureText(ch).width + tracking;
  return w - (text.length ? tracking : 0);
}

function drawTracked(
  ctx: AnyCtx,
  text: string,
  cx: number,
  y: number,
  tracking: number,
  align: 'center' | 'left' = 'center',
): void {
  const total = trackedWidth(ctx, text, tracking);
  let x = align === 'center' ? cx - total / 2 : cx;
  for (const ch of text) {
    ctx.fillText(ch, x, y);
    x += ctx.measureText(ch).width + tracking;
  }
}

function niceStepDeg(spanDeg: number): number {
  const candidates = [0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 30];
  for (const c of candidates) {
    if (spanDeg / c <= 6) return c;
  }
  return 45;
}

function mercYn(lat: number): number {
  const s = Math.sin((lat * Math.PI) / 180);
  return 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI);
}

function wrapText(ctx: AnyCtx, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
      if (lines.length === maxLines) break;
    } else {
      line = test;
    }
  }
  if (lines.length < maxLines && line) lines.push(line);
  if (lines.length === maxLines) {
    // ellipsize overflow
    const consumed = lines.join(' ').split(' ').length;
    if (consumed < text.split(' ').length) {
      let last = lines[maxLines - 1];
      while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1);
      lines[maxLines - 1] = `${last.trimEnd()}…`;
    }
  }
  return lines;
}

export type MakeCanvas = (w: number, h: number) => any;

export function renderDesign(
  ctx: AnyCtx,
  design: Design,
  terrain: Terrain,
  width: number,
  makeCanvas: MakeCanvas,
): void {
  const palette: Palette = PALETTES[design.palette];
  const s = width / PRINT_W;
  const W = PRINT_W;
  const H = PRINT_H;
  /** line width in logical units, never thinner than minPx device pixels */
  const lw = (logical: number, minPx = 1.15) => Math.max(logical, minPx / s);

  ctx.save();
  ctx.setTransform(s, 0, 0, s, 0, 0);
  ctx.clearRect(0, 0, W, H);
  ctx.textBaseline = 'alphabetic';

  const { grid, n, min, max } = terrain;
  const cell = MAP_SIZE / (n - 1);

  // ---- hillshade + water ------------------------------------------------
  const shadeCanvas = makeCanvas(n, n);
  const sctx = shadeCanvas.getContext('2d');
  const img = sctx.createImageData(n, n);
  const [sr, sg, sb] = hexToRgb(palette.shade);
  const [wr, wg, wb] = hexToRgb(palette.water);
  const relief = Math.max(1, max - min);
  const cellM = terrain.spanMeters / (n - 1);
  const exag = Math.min(25, Math.max(1, (4 * cellM) / relief));
  // light from the northwest, 45° altitude
  const lx = -0.7071 * 0.7071;
  const ly = 0.7071 * 0.7071;
  const lz = 0.7071;
  for (let j = 0; j < n; j++) {
    const jm = Math.max(0, j - 1);
    const jp = Math.min(n - 1, j + 1);
    for (let i = 0; i < n; i++) {
      const im = Math.max(0, i - 1);
      const ip = Math.min(n - 1, i + 1);
      const e = grid[j * n + i];
      const px = (j * n + i) * 4;
      if (e < 0) {
        img.data[px] = wr;
        img.data[px + 1] = wg;
        img.data[px + 2] = wb;
        img.data[px + 3] = 145;
        continue;
      }
      const dzdx = ((grid[j * n + ip] - grid[j * n + im]) / (ip - im || 1) / cellM) * exag;
      const dzdy = ((grid[jp * n + i] - grid[jm * n + i]) / (jp - jm || 1) / cellM) * exag; // y is south
      const nx = -dzdx;
      const ny = dzdy; // convert south-gradient to north component
      const nz = 1;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      const dot = Math.max(0, (nx * lx + ny * ly + nz * lz) / len);
      const alpha = Math.round(palette.shadeMax * Math.pow(dot, 1.5) * 255 * 2.6);
      img.data[px] = sr;
      img.data[px + 1] = sg;
      img.data[px + 2] = sb;
      img.data[px + 3] = Math.min(255, alpha);
    }
  }
  sctx.putImageData(img, 0, 0);

  // ---- clipped map area --------------------------------------------------
  ctx.save();
  ctx.beginPath();
  ctx.rect(MAP_X, MAP_Y, MAP_SIZE, MAP_SIZE);
  ctx.clip();

  ctx.imageSmoothingEnabled = true;
  if ('imageSmoothingQuality' in ctx) ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(shadeCanvas, MAP_X, MAP_Y, MAP_SIZE, MAP_SIZE);

  // contours
  const { levels, interval } = contourLevels(min, max);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const level of levels) {
    const segs = marchingSquares(grid, n, level);
    if (segs.length === 0) continue;
    const isCoast = level === 0 && min < 0 && max > 0;
    const isIndex = Math.abs(Math.round(level / interval) * interval - level) < 1e-6 &&
      Math.round(level / interval) % 5 === 0;
    ctx.strokeStyle = isCoast ? palette.water : rampColor(palette.stops, (level - min) / (max - min || 1));
    ctx.lineWidth = isCoast ? lw(5, 1.6) : isIndex ? lw(3.8, 1.5) : lw(2.3, 1.05);
    ctx.beginPath();
    for (let k = 0; k < segs.length; k += 4) {
      ctx.moveTo(MAP_X + segs[k] * cell, MAP_Y + segs[k + 1] * cell);
      ctx.lineTo(MAP_X + segs[k + 2] * cell, MAP_Y + segs[k + 3] * cell);
    }
    ctx.stroke();
  }
  ctx.restore();

  // ---- frame, ticks, corners ---------------------------------------------
  ctx.strokeStyle = palette.subtle;
  ctx.lineWidth = lw(3, 1.2);
  ctx.strokeRect(MAP_X, MAP_Y, MAP_SIZE, MAP_SIZE);

  // corner accents
  ctx.strokeStyle = palette.text;
  ctx.lineWidth = lw(6, 1.8);
  const L = 70;
  const corners: [number, number, number, number][] = [
    [MAP_X, MAP_Y, 1, 1],
    [MAP_X + MAP_SIZE, MAP_Y, -1, 1],
    [MAP_X, MAP_Y + MAP_SIZE, 1, -1],
    [MAP_X + MAP_SIZE, MAP_Y + MAP_SIZE, -1, -1],
  ];
  for (const [cx, cy, dx, dy] of corners) {
    ctx.beginPath();
    ctx.moveTo(cx + dx * L, cy);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx, cy + dy * L);
    ctx.stroke();
  }

  // graticule ticks
  const latSpan = radiusToLatSpan(design.radiusKm);
  const lonSpan = radiusToLonSpan(design.radiusKm, design.lat);
  const lonStep = niceStepDeg(lonSpan * 2);
  const latStep = niceStepDeg(latSpan * 2);
  ctx.strokeStyle = palette.subtle;
  ctx.lineWidth = lw(2.5, 1);
  const tickLen = 16;
  ctx.beginPath();
  const lonStart = Math.ceil((design.lon - lonSpan) / lonStep) * lonStep;
  for (let lon = lonStart; lon <= design.lon + lonSpan + 1e-9; lon += lonStep) {
    const u = (lon - (design.lon - lonSpan)) / (lonSpan * 2);
    const x = MAP_X + u * MAP_SIZE;
    ctx.moveTo(x, MAP_Y - tickLen);
    ctx.lineTo(x, MAP_Y);
    ctx.moveTo(x, MAP_Y + MAP_SIZE);
    ctx.lineTo(x, MAP_Y + MAP_SIZE + tickLen);
  }
  const yTopN = mercYn(Math.min(84.9, design.lat + latSpan));
  const yBotN = mercYn(Math.max(-84.9, design.lat - latSpan));
  const latStart = Math.ceil((design.lat - latSpan) / latStep) * latStep;
  for (let lat = latStart; lat <= design.lat + latSpan + 1e-9; lat += latStep) {
    const v = (mercYn(lat) - yTopN) / (yBotN - yTopN || 1);
    const y = MAP_Y + v * MAP_SIZE;
    if (y < MAP_Y || y > MAP_Y + MAP_SIZE) continue;
    ctx.moveTo(MAP_X - tickLen, y);
    ctx.lineTo(MAP_X, y);
    ctx.moveTo(MAP_X + MAP_SIZE, y);
    ctx.lineTo(MAP_X + MAP_SIZE + tickLen, y);
  }
  ctx.stroke();

  // ---- north arrow --------------------------------------------------------
  {
    const nx = MAP_X + MAP_SIZE - 130;
    const ny = MAP_Y + 190;
    ctx.fillStyle = palette.text;
    ctx.beginPath();
    ctx.moveTo(nx, ny - 62);
    ctx.lineTo(nx + 26, ny);
    ctx.lineTo(nx, ny - 16);
    ctx.lineTo(nx - 26, ny);
    ctx.closePath();
    ctx.fill();
    ctx.font = '44px SpaceMonoBold';
    ctx.fillStyle = palette.subtle;
    drawTracked(ctx, 'N', nx, ny - 84, 0, 'center');
  }

  // ---- scale bar ----------------------------------------------------------
  {
    const target = terrain.spanMeters * 0.22;
    const pow = Math.pow(10, Math.floor(Math.log10(target)));
    let meters = pow;
    for (const m of [1, 2, 5, 10]) {
      if (m * pow <= target) meters = m * pow;
    }
    const barPx = (meters / terrain.spanMeters) * MAP_SIZE;
    const bx = MAP_X + 110;
    const by = MAP_Y + MAP_SIZE - 110;
    ctx.strokeStyle = palette.text;
    ctx.lineWidth = lw(4, 1.3);
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + barPx, by);
    ctx.moveTo(bx, by - 18);
    ctx.lineTo(bx, by + 10);
    ctx.moveTo(bx + barPx, by - 18);
    ctx.lineTo(bx + barPx, by + 10);
    ctx.stroke();
    ctx.font = '36px SpaceMono';
    ctx.fillStyle = palette.text;
    const label =
      meters >= 1000
        ? `${trimNum(meters / 1000)} KM`
        : `${trimNum(meters)} M`;
    ctx.textAlign = 'left';
    ctx.fillText(label, bx, by - 34);
    ctx.textAlign = 'left';
  }

  // ---- marker -------------------------------------------------------------
  {
    const mx = MAP_X + terrain.markerU * MAP_SIZE;
    const my = MAP_Y + terrain.markerV * MAP_SIZE;
    ctx.strokeStyle = palette.subtle;
    ctx.lineWidth = lw(3, 1.1);
    ctx.beginPath();
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
      ctx.moveTo(mx + dx * 20, my + dy * 20);
      ctx.lineTo(mx + dx * 52, my + dy * 52);
    }
    ctx.stroke();
    ctx.strokeStyle = palette.text;
    ctx.lineWidth = lw(4, 1.3);
    ctx.beginPath();
    ctx.arc(mx, my, 26, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = palette.text;
    ctx.beginPath();
    ctx.arc(mx, my, 8, 0, Math.PI * 2);
    ctx.fill();
  }

  // ---- text block ----------------------------------------------------------
  ctx.textAlign = 'left';

  // eyebrow
  ctx.font = '30px SpaceMono';
  ctx.fillStyle = palette.subtle;
  drawTracked(ctx, 'TOPOGRAPHIC PORTRAIT \u00b7 ONE OF ONE', W / 2, EYEBROW_Y, 13);

  // coordinates + elevation
  const elev =
    terrain.pointElev >= 0
      ? `${Math.round(terrain.pointElev).toLocaleString('en-US')} M ASL`
      : `${Math.round(-terrain.pointElev).toLocaleString('en-US')} M DEPTH`;
  ctx.font = '44px SpaceMono';
  ctx.fillStyle = palette.subtle;
  drawTracked(ctx, `${formatCoord(design.lat, design.lon)} \u00b7 ${elev}`, W / 2, COORD_Y, 9);

  // label — serif, auto-fitted
  let fontSize = 176;
  ctx.font = `${fontSize}px SpectralSB`;
  while (fontSize > 62 && trackedWidth(ctx, design.label, fontSize * 0.045) > MAP_SIZE - 60) {
    fontSize -= 8;
    ctx.font = `${fontSize}px SpectralSB`;
  }
  ctx.fillStyle = palette.text;
  drawTracked(ctx, design.label, W / 2, LABEL_Y, fontSize * 0.045);

  // caption (italic serif, wrapped)
  let dateY = DATE_Y;
  if (design.caption) {
    ctx.font = '56px SpectralIt';
    ctx.fillStyle = palette.text;
    const lines = wrapText(ctx, design.caption, 1900, 2);
    lines.forEach((ln, i) => {
      ctx.fillText(ln, W / 2 - ctx.measureText(ln).width / 2, CAPTION_Y + i * 74);
    });
    if (lines.length > 1) dateY += 60;
  }

  // date
  if (design.date) {
    const human = formatDateHuman(design.date).toUpperCase();
    if (human) {
      ctx.font = '38px SpaceMono';
      ctx.fillStyle = palette.subtle;
      drawTracked(ctx, human, W / 2, dateY, 12);
    }
  }

  // foot
  ctx.font = '27px SpaceMono';
  ctx.fillStyle = palette.subtle;
  drawTracked(ctx, 'GENERATED FROM REAL TERRAIN \u00b7 PRINTED ON DEMAND', W / 2, FOOT_Y, 11);

  ctx.restore();
}

function trimNum(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

export function radiusToLatSpan(radiusKm: number): number {
  return radiusKm / 110.574;
}

export function radiusToLonSpan(radiusKm: number, lat: number): number {
  const cos = Math.max(0.05, Math.cos((lat * Math.PI) / 180));
  return radiusKm / (111.32 * cos);
}
