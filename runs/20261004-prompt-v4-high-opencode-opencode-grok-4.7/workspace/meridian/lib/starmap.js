import fs from "fs";
import path from "path";
import { colorById, inkFor, shift } from "./colors.js";
import { formatCoords, formatWhen, horizontal, localSiderealDegrees, projectStar, zonedToUtc } from "./astronomy.js";
import { centeredGlyphs, getFonts, measure } from "./fonts.js";

const PRINT_W = 4680;
const PRINT_H = 5790;

let catalog = null;
function loadCatalog() {
  if (catalog) return catalog;
  const dir = path.join(process.cwd(), "data");
  const stars = JSON.parse(fs.readFileSync(path.join(dir, "stars.json"), "utf8")).filter((s) => s[2] <= 5.15);
  const lines = JSON.parse(fs.readFileSync(path.join(dir, "constellations.json"), "utf8"));
  catalog = { stars, lines };
  return catalog;
}

function starRadius(mag) {
  const t = Math.max(0, Math.min(1, (5.5 - mag) / 7.1));
  return 2.15 + Math.pow(t, 1.28) * 11.2;
}

function clipSegment(x1, y1, x2, y2, r) {
  // Liang-style clip against a circle centered at origin. Points are unit-space.
  const inside = (x, y) => x * x + y * y <= r * r + 1e-8;
  const in1 = inside(x1, y1);
  const in2 = inside(x2, y2);
  if (in1 && in2) return [x1, y1, x2, y2];
  const dx = x2 - x1;
  const dy = y2 - y1;
  const a = dx * dx + dy * dy;
  if (a < 1e-12) return null;
  const b = 2 * (x1 * dx + y1 * dy);
  const c = x1 * x1 + y1 * y1 - r * r;
  const disc = b * b - 4 * a * c;
  if (disc < 0) return null;
  const sd = Math.sqrt(disc);
  const tA = (-b - sd) / (2 * a);
  const tB = (-b + sd) / (2 * a);
  let t0 = 0;
  let t1 = 1;
  if (!in1) t0 = Math.max(t0, Math.min(tA, tB));
  if (!in2) t1 = Math.min(t1, Math.max(tA, tB));
  if (t1 - t0 < 0.01) return null;
  if (t0 < 0 || t1 > 1) {
    // intersection may be the other root; accept if both ends land inside
  }
  const ax = x1 + dx * t0;
  const ay = y1 + dy * t0;
  const bx = x1 + dx * t1;
  const by = y1 + dy * t1;
  if (!inside(ax, ay) || !inside(bx, by)) return null;
  return [ax, ay, bx, by];
}

function skyContext(spec) {
  const when = zonedToUtc(spec.date, spec.time, spec.tz);
  const lst = localSiderealDegrees(when, spec.lon);
  return { when, lst, lat: spec.lat };
}

export function describeSky(spec) {
  const { when, lst, lat } = skyContext(spec);
  const polaris = projectStar(37.95, 89.26, lat, lst);
  const vega = projectStar(279.23, 38.78, lat, lst);
  return {
    utc: when.toISOString(),
    lst,
    polaris: polaris && { alt: polaris.alt, az: (polaris.az * 180) / Math.PI },
    vega: vega && { alt: vega.alt, az: ((vega.az * 180) / Math.PI + 360) % 360 },
  };
}

function fitSize(font, text, maxWidth, start, min, tracking) {
  let size = start;
  while (size > min && measure(font, text, size, tracking) > maxWidth) size -= 2;
  return size;
}

function designElements(spec, ink) {
  const { stars, lines } = loadCatalog();
  const { lst, lat } = skyContext(spec);
  const fonts = getFonts();
  const cx = PRINT_W / 2;
  const R = 1480;
  const cy = 430 + R;
  const skyR = R - 46;
  const toXY = (p) => [cx + p.x * skyR, cy + p.y * skyR];

  const parts = [];

  // Constellation lines, clipped to the sky disk.
  const lineParts = [];
  for (const cons of lines) {
    for (const line of cons.lines) {
      for (let i = 0; i < line.length - 1; i++) {
        const a = projectStar(line[i][0], line[i][1], lat, lst);
        const b = projectStar(line[i + 1][0], line[i + 1][1], lat, lst);
        if (!a && !b) continue;
        const pa = a || { x: 0, y: 0 };
        const pb = b || { x: 0, y: 0 };
        // If one end is below the horizon, projectStar returned null.
        // Reconstruct a below-horizon point so the clipper can cut the segment.
        const ua = a ? a : extrapolateBelow(line[i], lat, lst);
        const ub = b ? b : extrapolateBelow(line[i + 1], lat, lst);
        if (!ua || !ub) continue;
        const clipped = clipSegment(ua.x, ua.y, ub.x, ub.y, 0.985);
        if (!clipped) continue;
        const [x1, y1] = [cx + clipped[0] * skyR, cy + clipped[1] * skyR];
        const [x2, y2] = [cx + clipped[2] * skyR, cy + clipped[3] * skyR];
        lineParts.push(`M${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)}`);
      }
    }
  }
  if (lineParts.length) {
    parts.push(
      `<path d="${lineParts.join(" ")}" fill="none" stroke="${ink.line}" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" opacity="0.78"/>`
    );
  }

  // Stars
  const starDots = [];
  const spikes = [];
  for (const [ra, dec, mag] of stars) {
    const p = projectStar(ra, dec, lat, lst);
    if (!p) continue;
    const [x, y] = toXY(p);
    const rad = starRadius(mag);
    const fill = mag < 0.9 ? ink.bright : ink.star;
    starDots.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${rad.toFixed(2)}" fill="${fill}"/>`);
    if (mag < 0.35) {
      const arm = rad * 3.3;
      spikes.push(
        `<path d="M${x.toFixed(1)} ${(y - arm).toFixed(1)} V${(y + arm).toFixed(1)} M${(x - arm).toFixed(1)} ${y.toFixed(1)} H${(x + arm).toFixed(1)}" fill="none" stroke="${ink.bright}" stroke-width="1.7" stroke-linecap="round" opacity="0.85"/>`
      );
    }
  }
  parts.push(`<g clip-path="url(#sky)">${spikes.join("")}${starDots.join("")}</g>`);

  // Zenith: the point directly overhead. A small open ring, the Meridian mark.
  parts.push(
    `<circle cx="${cx}" cy="${cy}" r="16" fill="none" stroke="${ink.accent}" stroke-width="2.4"/>`
  );
  parts.push(`<circle cx="${cx}" cy="${cy}" r="2.4" fill="${ink.accent}"/>`);

  // Horizon rings and ticks.
  parts.push(`<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${ink.ring}" stroke-width="5"/>`);
  parts.push(
    `<circle cx="${cx}" cy="${cy}" r="${R - 34}" fill="none" stroke="${ink.ring}" stroke-width="1.6" opacity="0.85"/>`
  );
  const ticks = [];
  for (let deg = 0; deg < 360; deg += 5) {
    const a = (deg * Math.PI) / 180;
    const outer = R - 2;
    const inner = deg % 90 === 0 ? R - 30 : deg % 30 === 0 ? R - 22 : deg % 10 === 0 ? R - 14 : R - 9;
    const x1 = cx + Math.sin(a) * inner;
    const y1 = cy - Math.cos(a) * inner;
    const x2 = cx + Math.sin(a) * outer;
    const y2 = cy - Math.cos(a) * outer;
    const w = deg % 90 === 0 ? 3.2 : deg % 30 === 0 ? 2.2 : 1.3;
    ticks.push(
      `M${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)}`
    );
    void w;
  }
  parts.push(
    `<path d="${ticks.join(" ")}" fill="none" stroke="${ink.tick || ink.ring}" stroke-width="1.8" stroke-linecap="butt"/>`
  );

  // Cardinals sit in the ring band.
  const cardinals = [
    ["N", 0, -1],
    ["E", 1, 0],
    ["S", 0, 1],
    ["W", -1, 0],
  ];
  const cardSize = 58;
  for (const [label, sx, sy] of cardinals) {
    const r = skyR - 70;
    const x = cx + sx * r;
    const y = cy + sy * r + cardSize * 0.32;
    parts.push(centeredGlyphs(fonts.roman, label, x, y, cardSize, 0.02, ink.ring));
  }

  // Inscription under the medallion. Kept clear of the ring so ascenders don't collide.
  const title = spec.title;
  const titleTracking = 0.004;
  const titleSize = fitSize(fonts.italic, title, 3000, 156, 84, titleTracking);
  let y = cy + R + 196;
  parts.push(centeredGlyphs(fonts.italic, title, cx, y, titleSize, titleTracking, ink.title));

  y += 86;
  const when = formatWhen(spec.date, spec.time);
  const whenSize = fitSize(fonts.sans, when, 2900, 52, 34, 0.05);
  parts.push(centeredGlyphs(fonts.sans, when, cx, y, whenSize, 0.04, ink.meta));

  y += 68;
  const placeSize = fitSize(fonts.sans, spec.place, 2900, 46, 30, 0.03);
  parts.push(centeredGlyphs(fonts.sans, spec.place, cx, y, placeSize, 0.025, ink.meta));

  y += 62;
  const coords = formatCoords(spec.lat, spec.lon);
  parts.push(centeredGlyphs(fonts.sans, coords, cx, y, 36, 0.16, ink.accent));

  if (spec.dedication) {
    y += 84;
    const dSize = fitSize(fonts.italic, spec.dedication, 2700, 64, 40, 0.01);
    parts.push(centeredGlyphs(fonts.italic, spec.dedication, cx, y, dSize, 0.008, ink.title));
  }

  y += spec.dedication ? 78 : 92;
  parts.push(centeredGlyphs(fonts.sans, "MERIDIAN", cx, y, 28, 0.46, ink.mark));

  const clip = `<clipPath id="sky"><circle cx="${cx}" cy="${cy}" r="${skyR - 2}"/></clipPath>`;
  return { parts, clip, cx, cy, R };
}

function extrapolateBelow(coord, lat, lst) {
  const { az, altDeg } = horizontal(coord[0], coord[1], lat, lst);
  if (altDeg < -8) return null;
  const r = (90 - altDeg) / 90;
  return { x: Math.sin(az) * r, y: -Math.cos(az) * r, alt: altDeg, az };
}

export function renderDesignSVG(spec) {
  const ink = inkFor(spec.color);
  const { parts, clip } = designElements(spec, ink);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${PRINT_W}" height="${PRINT_H}" viewBox="0 0 ${PRINT_W} ${PRINT_H}">
  <defs>${clip}</defs>
  ${parts.join("\n  ")}
</svg>`;
}

export function renderMockupSVG(spec) {
  const garment = colorById(spec.color);
  const base = garment.hex;
  const deep = shift(base, garment.ink === "light" ? -0.08 : -0.07);
  const rib = shift(base, garment.ink === "light" ? 0.06 : -0.04);
  const edge = shift(base, -0.12);
  const design = renderDesignSVG(spec).replace(/<\?xml[^>]*>/, "");
  // Print window on a 19" front: 15.6" x 19.3", starting ~0.85" below the shoulder seam.
  const px = 17.2; // px per inch in the mockup
  const bodyW = 19 * px;
  const bodyLeft = 360 - bodyW / 2;
  const shoulderY = 168;
  const printX = 360 - (15.6 * px) / 2;
  const printY = shoulderY + 0.85 * px;
  const printW = 15.6 * px;
  const printH = 19.3 * px;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 860" width="720" height="860">
  <defs>
    <filter id="shadow" x="-20%" y="-8%" width="140%" height="128%">
      <feDropShadow dx="0" dy="14" stdDeviation="12" flood-color="#1a1612" flood-opacity="0.16"/>
    </filter>
  </defs>
  <ellipse cx="360" cy="792" rx="176" ry="12" fill="#1a1612" opacity="0.08"/>
  <g filter="url(#shadow)">
    <path fill="${base}" stroke="${edge}" stroke-width="1" stroke-linejoin="round" fill-rule="evenodd" d="
      M232 154
      C198 166 156 186 118 214
      L52 252
      C40 260 44 278 62 288
      L128 328
      L168 286
      L190 252
      L190 686
      C190 716 258 738 360 742
      C462 738 530 716 530 686
      L530 252
      L552 286
      L592 328
      L658 288
      C676 278 680 260 668 252
      L602 214
      C564 186 522 166 488 154
      C446 192 274 192 232 154
      Z
      M300 162
      C318 206 402 206 420 162
      C392 184 328 184 300 162
      Z"/>
    <path d="M300 162 C318 206 402 206 420 162 C392 184 328 184 300 162 Z" fill="none" stroke="${rib}" stroke-width="11" stroke-linejoin="round"/>
    <path d="M306 166 C322 198 398 198 414 166 C388 182 332 182 306 166 Z" fill="${deep}"/>
  </g>
  <svg x="${printX.toFixed(2)}" y="${printY.toFixed(2)}" width="${printW.toFixed(2)}" height="${printH.toFixed(2)}" viewBox="0 0 ${PRINT_W} ${PRINT_H}">
    ${design}
  </svg>
</svg>`;
}

export const PRINT_SIZE = { width: PRINT_W, height: PRINT_H };
