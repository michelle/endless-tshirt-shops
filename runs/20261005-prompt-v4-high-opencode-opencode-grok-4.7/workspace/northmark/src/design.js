import { plotSky } from "./sky.js";
import { colorById } from "./catalog.js";

export const PRINT_W = 2490;
export const PRINT_H = 3510;

const DARK_INK = new Set(["black", "charcoal", "navy blue", "red", "royal blue"]);

export function inkFor(color) {
  if (DARK_INK.has(color)) {
    return { ink: "#F3E6CC", accent: "#E2B45A", shirt: colorById(color)?.hex || "#141414" };
  }
  return { ink: "#1B1814", accent: "#8C4226", shirt: colorById(color)?.hex || "#f4f1ea" };
}

export function specimenId(spec) {
  const s = [spec.title, spec.place, spec.date, spec.time, spec.lat, spec.lon, spec.dedication]
    .join("|")
    .toLowerCase();
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `NM-${((h >>> 0) % 9000) + 1000}`;
}

function esc(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function estimate(text, size, tracking = 0) {
  return text.length * (size * 0.5 + tracking);
}

function wrapTitle(title) {
  const text = title.replace(/\s+/g, " ").trim();
  const maxW = 1960;
  for (const size of [150, 128, 110, 92]) {
    if (estimate(text, size) <= maxW) return { lines: [text], size };
  }
  const words = text.split(" ");
  if (words.length === 1) {
    let size = 92;
    while (estimate(text, size) > maxW && size > 64) size -= 4;
    return { lines: [text], size };
  }
  let best = null;
  for (let i = 1; i < words.length; i++) {
    const lines = [words.slice(0, i).join(" "), words.slice(i).join(" ")];
    const size = 108;
    const w = Math.max(...lines.map((line) => estimate(line, size)));
    if (!best || w < best.w) best = { lines, size, w };
  }
  if (best.w <= maxW) return { lines: best.lines, size: best.size };
  return { lines: best.lines, size: 84 };
}

function wrapDedication(text) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const maxW = 1760;
  if (estimate(clean, 68) <= maxW) return [clean];
  const words = clean.split(" ");
  let best = [clean];
  let bestW = Infinity;
  for (let i = 1; i < words.length; i++) {
    const lines = [words.slice(0, i).join(" "), words.slice(i).join(" ")];
    const w = Math.max(...lines.map((line) => estimate(line, 60)));
    if (w < bestW) {
      best = lines;
      bestW = w;
    }
  }
  return best;
}

function starRadius(mag) {
  return Math.max(7.4, Math.min(22, 9.2 - mag * 1.2));
}

function overlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function buildSvg(spec) {
  const ink = inkFor(spec.color);
  const title = wrapTitle(spec.title || spec.place);
  const dedication = wrapDedication(spec.dedication || "");
  const titleBlock = title.lines.length === 1 ? 690 : 820;
  const bottomReserve = dedication.length ? 860 : 740;
  const available = PRINT_H - titleBlock - bottomReserve;
  const radius = Math.min(900, Math.floor(available / 2) - 8);
  const cx = PRINT_W / 2;
  const cy = titleBlock + radius + 8;
  const sky = plotSky(spec, cx, cy, radius);
  const when = sky.when;

  const labels = [];
  const boxes = [];
  const named = sky.stars
    .filter((star) => star.name && star.alt > 9)
    .sort((a, b) => a.mag - b.mag);
  for (const star of named) {
    if (labels.length >= 11) break;
    const dx = star.x - cx;
    const dy = star.y - cy;
    const len = Math.hypot(dx, dy) || 1;
    const lx = star.x + (dx / len) * 34;
    const ly = star.y + (dy / len) * 34 + 6;
    const w = star.name.length * 22 + 16;
    const box = { x: lx - w / 2, y: ly - 24, w, h: 40 };
    const corners = [
      [box.x, box.y],
      [box.x + box.w, box.y],
      [box.x, box.y + box.h],
      [box.x + box.w, box.y + box.h],
    ];
    if (corners.some(([x, y]) => Math.hypot(x - cx, y - cy) > radius - 28)) continue;
    if (boxes.some((other) => overlap(other, box))) continue;
    boxes.push(box);
    labels.push({ ...star, lx, ly });
  }

  const ticks = [];
  for (let deg = 0; deg < 360; deg += 10) {
    const rad = (deg * Math.PI) / 180;
    const inner = deg % 30 === 0 ? 34 : 18;
    const x1 = cx + radius * Math.sin(rad);
    const y1 = cy - radius * Math.cos(rad);
    const x2 = cx + (radius - inner) * Math.sin(rad);
    const y2 = cy - (radius - inner) * Math.cos(rad);
    ticks.push(
      `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${ink.ink}" stroke-width="${deg % 30 === 0 ? 6.5 : 4.4}" stroke-linecap="square" opacity="${deg % 30 === 0 ? 0.92 : 0.55}"/>`,
    );
  }

  const cardinals = [
    ["N", 0, true],
    ["E", 90, false],
    ["S", 180, false],
    ["W", 270, false],
  ]
    .map(([letter, deg, accent]) => {
      const rad = (deg * Math.PI) / 180;
      const x = cx + (radius - 70) * Math.sin(rad);
      const y = cy - (radius - 70) * Math.cos(rad);
      return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" dominant-baseline="middle" fill="${accent ? ink.accent : ink.ink}" font-family="Barlow Condensed" font-size="54" font-weight="600" letter-spacing="1">${letter}</text>`;
    })
    .join("");

  const starDots = sky.stars
    .map((star) => {
      const r = starRadius(star.mag);
      return `<circle cx="${star.x.toFixed(1)}" cy="${star.y.toFixed(1)}" r="${r.toFixed(2)}" fill="${ink.ink}"/>`;
    })
    .join("");

  const constellations = sky.lines
    .map((line) => {
      const d = line
        .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
        .join(" ");
      return `<path d="${d}" fill="none" stroke="${ink.ink}" stroke-width="6.4" stroke-linecap="round" stroke-linejoin="round" opacity="0.55"/>`;
    })
    .join("");

  const nameLabels = labels
    .map(
      (star) =>
        `<text x="${star.lx.toFixed(1)}" y="${star.ly.toFixed(1)}" text-anchor="middle" fill="${ink.ink}" font-family="Cormorant Garamond" font-size="32" font-style="italic" opacity="0.88">${esc(star.name)}</text>`,
    )
    .join("");

  const dateLine = when.toFormat("d MMMM yyyy");
  const timeLine = when.toFormat("HH:mm");
  const meta = `${spec.place}   ·   ${dateLine}   ·   ${timeLine}`;
  const coords = formatCoords(spec.lat, spec.lon);
  const specimen = specimenId(spec);

  const titleSvg = title.lines
    .map((line, i) => {
      const y = 390 + i * (title.size + 18);
      return `<text x="${cx}" y="${y}" text-anchor="middle" fill="${ink.ink}" font-family="Cormorant Garamond" font-size="${title.size}" font-weight="600">${esc(line)}</text>`;
    })
    .join("");
  const titleBottom = 390 + (title.lines.length - 1) * (title.size + 18);

  const metaY = Math.min(titleBottom + 78, cy - radius - 78);

  let y = cy + radius + 96;
  const dedicationSvg = dedication
    .map((line, i) => {
      const ly = y + i * 78;
      return `<text x="${cx}" y="${ly}" text-anchor="middle" fill="${ink.ink}" font-family="Cormorant Garamond" font-size="64" font-style="italic">${esc(line)}</text>`;
    })
    .join("");
  if (dedication.length) y += dedication.length * 78 + 36;

  const facts = `
    <text x="${cx}" y="${y}" text-anchor="middle" fill="${ink.ink}" font-family="Barlow Condensed" font-size="40" font-weight="500" letter-spacing="3.5">${esc(coords)}</text>
    <text x="${cx}" y="${y + 62}" text-anchor="middle" fill="${ink.accent}" font-family="Barlow Condensed" font-size="36" font-weight="600" letter-spacing="6">SPECIMEN ${esc(specimen)}</text>
  `;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${PRINT_W}" height="${PRINT_H}" viewBox="0 0 ${PRINT_W} ${PRINT_H}">
  <text x="${cx}" y="188" text-anchor="middle" fill="${ink.accent}" font-family="Barlow Condensed" font-size="42" font-weight="600" letter-spacing="14">NORTHMARK</text>
  <line x1="${cx - 90}" y1="218" x2="${cx + 90}" y2="218" stroke="${ink.accent}" stroke-width="3"/>
  ${titleSvg}
  <text x="${cx}" y="${metaY}" text-anchor="middle" fill="${ink.ink}" font-family="Barlow Condensed" font-size="38" font-weight="500" letter-spacing="2.4" opacity="0.9">${esc(meta)}</text>
  <circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="${ink.ink}" stroke-width="9"/>
  <circle cx="${cx}" cy="${cy}" r="${radius - 24}" fill="none" stroke="${ink.accent}" stroke-width="4.2" opacity="0.95"/>
  ${ticks}
  ${cardinals}
  ${constellations}
  ${starDots}
  <g stroke="${ink.accent}" stroke-width="3.4" stroke-linecap="square">
    <line x1="${cx - 16}" y1="${cy}" x2="${cx + 16}" y2="${cy}"/>
    <line x1="${cx}" y1="${cy - 16}" x2="${cx}" y2="${cy + 16}"/>
  </g>
  ${nameLabels}
  ${dedicationSvg}
  ${facts}
  <text x="${cx}" y="${Math.min(y + 150, 3320)}" text-anchor="middle" fill="${ink.ink}" font-family="Barlow Condensed" font-size="34" font-weight="500" letter-spacing="5.5" opacity="0.7">PRINTED ONCE  ·  DIRECT TO GARMENT</text>
</svg>`;
}

function formatCoords(lat, lon) {
  const la = Number(lat);
  const lo = Number(lon);
  const ns = la >= 0 ? "N" : "S";
  const ew = lo >= 0 ? "E" : "W";
  return `${Math.abs(la).toFixed(2)}° ${ns}     ${Math.abs(lo).toFixed(2)}° ${ew}`;
}
