// Generates the "Deprecated Parks" poster artwork as SVG, then renders:
//   public/art/<slug>.png    – 750x1000 web image
//   public/print/<slug>.png  – 4665x5844 transparent print file (Prodigi front print area, ~300dpi)
// Run: node scripts/generate-art.mjs
import { Resvg } from "@resvg/resvg-js";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const W = 1500;
const H = 2000;
// Scene box (inside the frame)
const SX = 100, SY = 100, SW = 1300, SH = 1330;
const CX = SX + SW / 2;

const DISPLAY = "Alfa Slab One";
const TEXT = "Barlow Condensed";

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

// ---------- primitives ----------
function bands(colors, top = SY, height = SH * 0.62) {
  const h = height / colors.length;
  return colors
    .map((c, i) => `<rect x="${SX}" y="${top + i * h}" width="${SW}" height="${h + 1}" fill="${c}"/>`)
    .join("");
}
function poly(points, fill, extra = "") {
  return `<polygon points="${points.map((p) => p.join(",")).join(" ")}" fill="${fill}" ${extra}/>`;
}
function circle(cx, cy, r, fill, extra = "") {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" ${extra}/>`;
}
function rect(x, y, w, h, fill, extra = "") {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" ${extra}/>`;
}
// Jagged mountain ridge from left to right of scene. peaks: [x, y] tuples (absolute)
function ridge(peaks, fill, baseY = SY + SH) {
  const pts = [[SX, baseY], [SX, peaks[0][1]], ...peaks, [SX + SW, peaks[peaks.length - 1][1]], [SX + SW, baseY]];
  return poly(pts, fill);
}
function pine(x, baseY, h, fill) {
  const w = h * 0.55;
  const tiers = 3;
  let out = rect(x - w * 0.06, baseY - h * 0.18, w * 0.12, h * 0.18, fill);
  for (let i = 0; i < tiers; i++) {
    const tw = w * (1 - i * 0.22);
    const th = h * 0.42;
    const y = baseY - h * 0.15 - i * h * 0.24;
    out += poly([[x, y - th], [x + tw / 2, y], [x - tw / 2, y]], fill);
  }
  return out;
}
function waves(y, fill, amp = 14, len = 130, rows = 1, gap = 34, width = 6) {
  let out = "";
  for (let r = 0; r < rows; r++) {
    let d = `M ${SX} ${y + r * gap}`;
    for (let x = SX; x < SX + SW; x += len) {
      d += ` q ${len / 4} ${-amp} ${len / 2} 0 t ${len / 2} 0`;
    }
    out += `<path d="${d}" stroke="${fill}" stroke-width="${width}" fill="none" stroke-linecap="round"/>`;
  }
  return out;
}
function stars(seed, n, color, yMax) {
  let s = seed;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  let out = "";
  for (let i = 0; i < n; i++) {
    const x = SX + 30 + rnd() * (SW - 60);
    const y = SY + 30 + rnd() * (yMax - SY - 30);
    const r = 3 + rnd() * 5;
    out += circle(x, y, r, color, `opacity="${0.6 + rnd() * 0.4}"`);
  }
  return out;
}
function textLine(x, y, size, family, weight, fill, content, extra = "") {
  return `<text x="${x}" y="${y}" font-family="${family}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="middle" ${extra}>${esc(content)}</text>`;
}

// ---------- poster frame ----------
function poster(d, scene) {
  const { paper, ink, accent, title, tagline, est, titleSize } = d;
  const lines = title.split("\n");
  const size = titleSize ?? (lines.length > 1 ? 150 : 170);
  const lineGap = size * 0.98;
  const blockH = size + (lines.length - 1) * lineGap + 88 + 74; // title lines + tagline + est
  const areaTop = 1480, areaBottom = 1940;
  const titleTop = areaTop + (areaBottom - areaTop - blockH) / 2 + size * 0.86;
  const titleSvg = lines
    .map((l, i) => textLine(W / 2, titleTop + i * lineGap, size, DISPLAY, 400, ink, l.toUpperCase(), `letter-spacing="2"`))
    .join("");
  const tagY = titleTop + (lines.length - 1) * lineGap + 88;
  const estY = tagY + 74;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs><clipPath id="scene"><rect x="${SX}" y="${SY}" width="${SW}" height="${SH}"/></clipPath></defs>
  <rect x="0" y="0" width="${W}" height="${H}" rx="28" fill="${paper}"/>
  <rect x="34" y="34" width="${W - 68}" height="${H - 68}" rx="14" fill="none" stroke="${ink}" stroke-width="14"/>
  <g clip-path="url(#scene)">${scene}</g>
  <rect x="${SX}" y="${SY}" width="${SW}" height="${SH}" fill="none" stroke="${ink}" stroke-width="18"/>
  <line x1="${SX}" y1="1462" x2="${SX + SW}" y2="1462" stroke="${accent}" stroke-width="10"/>
  ${titleSvg}
  ${textLine(W / 2, tagY, 62, TEXT, 600, ink, tagline.toUpperCase(), `letter-spacing="6"`)}
  ${textLine(W / 2, estY, 44, TEXT, 500, accent, `DEPRECATED PARKS SERVICE  ·  EST. ${est}`, `letter-spacing="7"`)}
</svg>`;
}

// ---------- scenes ----------
const scenes = {
  "dial-up-canyon": () => {
    let s = bands(["#3b1d2e", "#8c2f39", "#c94a3a", "#e9843c", "#f2b04e", "#f8d98a"], SY, SH * 0.6);
    // sun with signal rings
    s += circle(CX, 610, 250, "#fff0c0");
    for (const r of [190, 130, 70]) s += circle(CX, 610, r, "none", `stroke="#f2b04e" stroke-width="12" opacity="0.7"`);
    s += circle(CX, 610, 30, "#e9843c");
    const bottom = SY + SH;
    // distant plateau and canyon floor
    s += poly([[SX, 840], [SX + 300, 800], [SX + 520, 830], [SX + 700, 790], [SX + 900, 830], [SX + 1100, 790], [SX + SW, 830], [SX + SW, bottom], [SX, bottom]], "#d9846a");
    s += rect(SX, 900, SW, bottom - 900, "#e8c28a");
    // canyon walls, layered
    s += poly([[SX, 760], [SX + 180, 700], [SX + 260, 760], [SX + 420, 690], [SX + 520, 780], [SX + 470, 900], [SX + 560, 1000], [SX + 380, 1300], [SX, bottom]], "#c95b3c");
    s += poly([[SX + SW, 780], [SX + SW - 200, 720], [SX + SW - 320, 800], [SX + SW - 460, 740], [SX + SW - 560, 860], [SX + SW - 480, 990], [SX + SW - 540, 1120], [SX + SW - 420, 1300], [SX + SW, bottom]], "#b4452f");
    s += poly([[SX, 980], [SX + 120, 940], [SX + 300, 1020], [SX + 350, 1140], [SX + 480, 1200], [SX + 300, bottom], [SX, bottom]], "#8a2f2a");
    s += poly([[SX + SW, 1010], [SX + SW - 160, 960], [SX + SW - 330, 1080], [SX + SW - 300, 1220], [SX + SW - 200, 1300], [SX + SW - 100, bottom], [SX + SW, bottom]], "#7a2523");
    // river
    s += `<path d="M ${CX - 120} 1060 C ${CX - 200} 1200, ${CX + 150} 1250, ${CX - 40} ${bottom + 10} L ${CX + 260} ${bottom + 10} C ${CX + 300} 1250, ${CX + 40} 1200, ${CX + 130} 1060 Z" fill="#2f8f8a"/>`;
    s += `<path d="M ${CX - 60} 1120 C ${CX - 130} 1220, ${CX + 120} 1260, ${CX + 40} ${bottom + 10}" stroke="#7fd1c9" stroke-width="10" fill="none"/>`;
    // foreground dark mesa + telephone pole with wires
    s += poly([[SX, 1250], [SX + 220, 1180], [SX + 420, 1240], [SX + 520, bottom], [SX, bottom]], "#3b1d2e");
    s += rect(SX + 250, 850, 22, 400, "#241018");
    s += rect(SX + 200, 890, 122, 16, "#241018");
    s += rect(SX + 210, 930, 102, 16, "#241018");
    for (const dy of [0, 40]) {
      s += `<path d="M ${SX + 200} ${900 + dy} Q ${SX + 650} ${1020 + dy} ${SX + SW + 20} ${880 + dy}" stroke="#241018" stroke-width="7" fill="none"/>`;
    }
    return s;
  },

  "floppy-disk-falls": () => {
    const bottom = SY + SH;
    let s = bands(["#0f2a44", "#1c4a6e", "#2f7aa3", "#5fb0c8", "#a8dbe2"], SY, SH * 0.55);
    s += circle(CX + 330, 380, 130, "#f8f1d6");
    // far cliffs
    s += ridge([[SX + 200, 520], [SX + 420, 640], [SX + 640, 560], [SX + 900, 690], [SX + 1100, 600], [SX + 1300, 700]], "#2d5d63", 1000);
    // floppy disk cliff (top plateau)
    const fx = CX - 300, fy = 560, fw = 600, fh = 600;
    s += `<rect x="${fx}" y="${fy}" width="${fw}" height="${fh}" rx="30" fill="#2b2f45"/>`;
    s += poly([[fx + fw - 60, fy], [fx + fw, fy + 60], [fx + fw, fy], [fx + fw - 60, fy]], "#2b2f45");
    s += rect(fx + 150, fy, 300, 190, "#8d95b0"); // shutter
    s += rect(fx + 320, fy + 40, 80, 120, "#2b2f45"); // shutter slot
    s += rect(fx + 90, fy + 330, 420, 250, "#e8e2cf"); // label
    s += rect(fx + 90, fy + 330, 420, 40, "#c94a3a");
    s += rect(fx + 130, fy + 420, 340, 14, "#8d95b0");
    s += rect(fx + 130, fy + 470, 260, 14, "#8d95b0");
    s += rect(fx + 130, fy + 520, 300, 14, "#8d95b0");
    // waterfall from slot
    s += rect(fx + 320, fy + 150, 80, 1000, "#dff3f6");
    s += rect(fx + 330, fy + 150, 14, 1000, "#ffffff");
    s += rect(fx + 372, fy + 150, 10, 1000, "#ffffff");
    // green side cliffs
    s += poly([[SX, 900], [SX + 200, 860], [SX + 380, 980], [SX + 420, 1180], [SX + 300, bottom], [SX, bottom]], "#2f6b4f");
    s += poly([[SX + SW, 880], [SX + SW - 220, 900], [SX + SW - 380, 1040], [SX + SW - 360, 1200], [SX + SW, bottom]], "#27573f");
    // pool + mist
    s += rect(SX, 1210, SW, bottom - 1210, "#3f9bb8");
    s += waves(1260, "#a8dbe2", 10, 120, 3, 40, 6);
    for (const [mx, my, mr] of [[CX - 120, 1200, 70], [CX + 40, 1220, 90], [CX + 170, 1190, 60], [CX - 40, 1160, 55]]) s += circle(mx, my, mr, "#ffffff", `opacity="0.55"`);
    // foreground pines
    for (const [px, ph] of [[SX + 60, 300], [SX + 150, 380], [SX + SW - 70, 320], [SX + SW - 170, 400], [SX + SW - 260, 300]]) s += pine(px, bottom + 10, ph, "#123024");
    return s;
  },

  "crt-ridge": () => {
    const bottom = SY + SH;
    let s = bands(["#160b2e", "#2a1650", "#4a2472", "#7a3b8f", "#b6559a"], SY, SH * 0.66);
    s += stars(7, 60, "#f5e7ff", 700);
    s += circle(CX - 260, 470, 150, "#f7e9c6");
    s += circle(CX - 300, 440, 30, "#e5d2a8", `opacity="0.7"`);
    s += circle(CX - 220, 520, 22, "#e5d2a8", `opacity="0.7"`);
    // scanlines across the sky
    for (let y = SY; y < SY + SH * 0.66; y += 14) s += rect(SX, y, SW, 4, "#000000", `opacity="0.14"`);
    s += ridge([[SX + 150, 820], [SX + 330, 640], [SX + 520, 780], [SX + 700, 560], [SX + 900, 760], [SX + 1100, 660], [SX + 1250, 800]], "#5a2f7a");
    s += ridge([[SX + 100, 980], [SX + 300, 860], [SX + 480, 960], [SX + 720, 800], [SX + 940, 950], [SX + 1180, 860], [SX + 1300, 960]], "#38185a");
    s += ridge([[SX + 200, 1140], [SX + 420, 1040], [SX + 600, 1120], [SX + 850, 990], [SX + 1080, 1120], [SX + 1300, 1060]], "#1f0c3a");
    // pixel ridge foreground (stair-stepped, like a low-res raster)
    let pts = [[SX, bottom]];
    const heights = [1230, 1200, 1210, 1170, 1150, 1180, 1140, 1120, 1150, 1130, 1160, 1190, 1180, 1220];
    heights.forEach((hh, i) => {
      const x0 = SX + (SW / heights.length) * i;
      const x1 = SX + (SW / heights.length) * (i + 1);
      pts.push([x0, hh], [x1, hh]);
    });
    pts.push([SX + SW, bottom]);
    s += poly(pts, "#0d0520");
    // CRT glass glare curve
    s += `<path d="M ${SX} ${SY + 40} Q ${CX} ${SY - 120} ${SX + SW} ${SY + 40} L ${SX + SW} ${SY} L ${SX} ${SY} Z" fill="#ffffff" opacity="0.18"/>`;
    return s;
  },

  "fax-machine-forest": () => {
    const bottom = SY + SH;
    let s = bands(["#f2c4a0", "#efa07a", "#d86f6b", "#8f4a72", "#3f2d5c"], SY, SH * 0.5);
    s += circle(CX + 200, 420, 120, "#fff5d8");
    // forest rows
    const rows = [
      { y: 760, h: 260, fill: "#5b3f6b", step: 90 },
      { y: 880, h: 320, fill: "#3b2f55", step: 110 },
      { y: 1010, h: 380, fill: "#243046", step: 130 },
      { y: 1150, h: 440, fill: "#14202f", step: 150 },
    ];
    s += rect(SX, SY + SH * 0.5 - 2, SW, SH * 0.5 + 4, "#3f2d5c");
    rows.forEach((r, ri) => {
      s += rect(SX, r.y - 30, SW, SY + SH - r.y + 30, r.fill);
      for (let x = SX - 40 + (ri * 37) % 90; x < SX + SW + 60; x += r.step) s += pine(x, r.y, r.h * (0.85 + ((x * 7) % 30) / 100), r.fill);
    });
    // fax paper emerging from the ground with a curl
    s += rect(SX, 1150, SW, bottom - 1150, "#0c141f");
    s += `<path d="M ${SX + 250} ${bottom + 10} L ${SX + 250} 1240 Q ${SX + 250} 1190 ${SX + 300} 1190 L ${SX + 1000} 1190 Q ${SX + 1060} 1190 ${SX + 1060} 1250 L ${SX + 1060} ${bottom + 10} Z" fill="#f4efe1"/>`;
    for (let i = 0; i < 4; i++) s += rect(SX + 320, 1250 + i * 42, 640 - (i % 2) * 180, 16, "#9aa3b2");
    // torn perforation
    for (let x = SX + 270; x < SX + 1050; x += 38) s += circle(x, 1210, 6, "#0c141f");
    return s;
  },

  "pager-point": () => {
    const bottom = SY + SH;
    let s = bands(["#06101f", "#0b1c36", "#12305a", "#1f4d7a", "#2f6f95"], SY, SH * 0.7);
    s += stars(11, 70, "#e8f1ff", 800);
    s += circle(SX + 260, 360, 90, "#f4f0d9");
    // beam
    s += poly([[CX + 60, 560], [SX + SW + 40, 300], [SX + SW + 40, 700]], "#ffe9a3", `opacity="0.35"`);
    s += poly([[CX + 60, 560], [SX + SW + 40, 420], [SX + SW + 40, 640]], "#ffe9a3", `opacity="0.45"`);
    // sea
    s += rect(SX, 1010, SW, bottom - 1010, "#0e2a4a");
    s += waves(1080, "#5fa3c8", 12, 140, 5, 60, 6);
    // headland
    s += poly([[SX, 1180], [SX + 120, 1020], [SX + 300, 980], [CX + 220, 950], [CX + 380, 1040], [CX + 300, 1130], [SX + 500, 1230], [SX, bottom]], "#1b2b35");
    s += poly([[SX, 1260], [SX + 220, 1180], [SX + 520, 1240], [SX + 600, bottom], [SX, bottom]], "#0d161c");
    // pager-shaped lighthouse
    const lx = CX - 20, ly = 560, lw = 160, lh = 400;
    s += `<rect x="${lx - lw / 2}" y="${ly}" width="${lw}" height="${lh}" rx="22" fill="#e8e2d2"/>`;
    for (let i = 0; i < 4; i++) s += rect(lx - lw / 2, ly + 100 + i * 80, lw, 26, "#c94a3a");
    s += rect(lx - 60, ly + 24, 120, 60, "#1b2b35"); // screen bezel
    s += rect(lx - 50, ly + 32, 100, 44, "#9fd18c"); // screen
    s += textLine(lx, ly + 66, 36, TEXT, 600, "#1b2b35", "911", `letter-spacing="4"`);
    s += circle(lx + 82, ly + 200, 14, "#1b2b35"); // button
    s += rect(lx - lw / 2 - 20, ly - 26, lw + 40, 30, "#1b2b35"); // gallery
    s += poly([[lx - lw / 2 - 20, ly - 26], [lx, ly - 90], [lx + lw / 2 + 20, ly - 26]], "#c94a3a"); // roof
    s += circle(lx, ly - 10, 24, "#ffe9a3");
    s += rect(lx - lw / 2 - 30, ly + lh - 10, lw + 60, 40, "#1b2b35"); // base
    return s;
  },

  "cassette-cove": () => {
    const bottom = SY + SH;
    let s = bands(["#f6d36b", "#f2a950", "#e8773f", "#c9503a", "#7a3340"], SY, SH * 0.55);
    // reel sun
    s += circle(CX, 560, 220, "#fff2c4");
    s += circle(CX, 560, 90, "#e8773f");
    s += circle(CX, 560, 40, "#fff2c4");
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      const x1 = CX + Math.cos(a) * 100, y1 = 560 + Math.sin(a) * 100;
      const x2 = CX + Math.cos(a) * 200, y2 = 560 + Math.sin(a) * 200;
      s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#e8773f" stroke-width="26" stroke-linecap="round"/>`;
    }
    // sea (tape brown) with ribbon waves
    s += rect(SX, 830, SW, bottom - 830, "#3d2a2a");
    s += waves(880, "#8a5b4a", 16, 160, 8, 60, 8);
    // cliffs
    s += poly([[SX, 700], [SX + 160, 640], [SX + 320, 720], [SX + 440, 900], [SX + 380, 1100], [SX + 200, bottom], [SX, bottom]], "#5a2e3a");
    s += poly([[SX + SW, 680], [SX + SW - 200, 640], [SX + SW - 360, 760], [SX + SW - 420, 940], [SX + SW - 300, 1120], [SX + SW - 120, bottom], [SX + SW, bottom]], "#4a2532");
    s += poly([[SX, 1000], [SX + 150, 960], [SX + 260, 1080], [SX + 220, bottom], [SX, bottom]], "#2d1520");
    s += poly([[SX + SW, 980], [SX + SW - 140, 940], [SX + SW - 240, 1080], [SX + SW - 180, bottom], [SX + SW, bottom]], "#2d1520");
    // cassette boat
    const bx = CX + 40, by = 1180;
    s += `<rect x="${bx - 150}" y="${by - 90}" width="300" height="180" rx="16" fill="#f1e5c6"/>`;
    s += rect(bx - 120, by - 60, 240, 70, "#e8773f");
    s += circle(bx - 60, by + 40, 30, "#3d2a2a");
    s += circle(bx + 60, by + 40, 30, "#3d2a2a");
    s += circle(bx - 60, by + 40, 12, "#f1e5c6");
    s += circle(bx + 60, by + 40, 12, "#f1e5c6");
    s += poly([[bx - 180, by + 90], [bx + 180, by + 90], [bx + 120, by + 150], [bx - 120, by + 150]], "#2d1520");
    s += rect(bx - 6, by - 330, 12, 240, "#2d1520");
    s += poly([[bx + 6, by - 330], [bx + 170, by - 120], [bx + 6, by - 100]], "#fff2c4");
    return s;
  },

  "dot-matrix-desert": () => {
    const bottom = SY + SH;
    let s = bands(["#2b1a3d", "#6b2e5a", "#c24d5c", "#ea7d55", "#f6b26b", "#fbe0a3"], SY, SH * 0.58);
    // dot-matrix sun
    const sunR = 230, cy = 620;
    for (let y = -sunR; y <= sunR; y += 34) {
      for (let x = -sunR; x <= sunR; x += 34) {
        if (x * x + y * y <= sunR * sunR) s += circle(CX + x, cy + y, 13, "#fff4d0");
      }
    }
    // dunes
    s += `<path d="M ${SX} 900 C ${SX + 300} 760, ${SX + 600} 1000, ${SX + 900} 860 S ${SX + SW} 900 ${SX + SW} 900 L ${SX + SW} ${bottom} L ${SX} ${bottom} Z" fill="#e0894f"/>`;
    s += `<path d="M ${SX} 1040 C ${SX + 250} 940, ${SX + 500} 1120, ${SX + 800} 1000 S ${SX + SW} 1080 ${SX + SW} 1080 L ${SX + SW} ${bottom} L ${SX} ${bottom} Z" fill="#c25b3d"/>`;
    s += `<path d="M ${SX} 1200 C ${SX + 350} 1090, ${SX + 700} 1280, ${SX + SW} 1150 L ${SX + SW} ${bottom} L ${SX} ${bottom} Z" fill="#7a2f3d"/>`;
    s += `<path d="M ${SX} 1330 C ${SX + 400} 1260, ${SX + 900} 1400, ${SX + SW} 1300 L ${SX + SW} ${bottom} L ${SX} ${bottom} Z" fill="#3a1630"/>`;
    // tractor-feed strips on both edges
    for (const x of [SX + 36, SX + SW - 36]) {
      s += rect(x - 36, SY, 72, SH, "#fbe0a3", `opacity="0.9"`);
      s += `<line x1="${x + (x < CX ? 36 : -36)}" y1="${SY}" x2="${x + (x < CX ? 36 : -36)}" y2="${SY + SH}" stroke="#7a2f3d" stroke-width="4" stroke-dasharray="14 14"/>`;
      for (let y = SY + 40; y < SY + SH; y += 76) s += circle(x, y, 14, "#3a1630");
    }
    // cactus (blocky)
    const cx = CX - 380, cb = 1300;
    s += rect(cx - 20, cb - 260, 40, 260, "#2b1a3d");
    s += rect(cx - 90, cb - 200, 30, 90, "#2b1a3d");
    s += rect(cx - 90, cb - 130, 70, 30, "#2b1a3d");
    s += rect(cx + 60, cb - 230, 30, 100, "#2b1a3d");
    s += rect(cx + 20, cb - 160, 70, 30, "#2b1a3d");
    return s;
  },

  "blue-screen-bay": () => {
    const bottom = SY + SH;
    let s = bands(["#0000aa", "#0000aa", "#0b16b8", "#1b30c4", "#2f4fd0"], SY, SH * 0.6);
    s += stars(23, 45, "#dfe6ff", 500);
    s += circle(CX + 300, 380, 120, "#eef2ff");
    // system text in the sky
    const msg = ["A PROBLEM HAS BEEN DETECTED", "AND THE WEEKEND HAS BEEN SHUT DOWN", "TO PREVENT DAMAGE TO YOUR MOOD.", "", "*** STOP: 0x0000CAMP (0x00000BAY)"];
    msg.forEach((m, i) => {
      s += `<text x="${SX + 60}" y="${SY + 90 + i * 54}" font-family="${TEXT}" font-size="40" font-weight="500" fill="#ffffff" letter-spacing="4">${esc(m)}</text>`;
    });
    // headlands + bay
    s += ridge([[SX + 200, 720], [SX + 420, 640], [SX + 640, 760], [SX + 900, 680], [SX + 1150, 780]], "#0a1aa8", 1000);
    s += rect(SX, 900, SW, bottom - 900, "#000066");
    s += waves(960, "#5f7cff", 12, 150, 6, 62, 6);
    s += poly([[SX, 860], [SX + 200, 800], [SX + 420, 880], [SX + 500, 1000], [SX + 380, 1100], [SX, 1130]], "#00003d");
    s += poly([[SX + SW, 840], [SX + SW - 260, 800], [SX + SW - 440, 900], [SX + SW - 400, 1020], [SX + SW - 200, 1080], [SX + SW, 1120]], "#00003d");
    // sailboat
    const bx = CX - 40, by = 1130;
    s += poly([[bx - 130, by], [bx + 130, by], [bx + 90, by + 50], [bx - 90, by + 50]], "#eef2ff");
    s += rect(bx - 5, by - 260, 10, 260, "#eef2ff");
    s += poly([[bx + 8, by - 250], [bx + 150, by - 20], [bx + 8, by - 20]], "#eef2ff");
    s += poly([[bx - 8, by - 220], [bx - 120, by - 20], [bx - 8, by - 20]], "#c5d0ff");
    // cursor blink in foreground
    s += rect(SX + 60, bottom - 90, 26, 44, "#ffffff");
    return s;
  },
};

// ---------- design metadata (mirrored in src/lib/catalog.ts) ----------
const designs = [
  { slug: "dial-up-canyon", title: "Dial-Up\nCanyon", tagline: "Connecting at 56 kbps of natural wonder", est: 1996, paper: "#f4e7c9", ink: "#3b1d2e", accent: "#c94a3a" },
  { slug: "floppy-disk-falls", title: "Floppy Disk\nFalls", tagline: "1.44 MB of untouched wilderness", est: 1987, paper: "#f1ecdc", ink: "#1e2d3a", accent: "#c94a3a" },
  { slug: "crt-ridge", title: "CRT Ridge", tagline: "Refresh rate 60 Hz · Degauss daily", est: 1981, paper: "#efe6f2", ink: "#1f0c3a", accent: "#b6559a" },
  { slug: "fax-machine-forest", title: "Fax Machine\nForest", tagline: "Please hold for tone", est: 1964, paper: "#f5e9dc", ink: "#14202f", accent: "#d86f6b" },
  { slug: "pager-point", title: "Pager Point", tagline: "Beeping since 1949 · Call me back", est: 1949, paper: "#e9eef3", ink: "#0b1c36", accent: "#c94a3a" },
  { slug: "cassette-cove", title: "Cassette\nCove", tagline: "Side A · Please rewind before leaving", est: 1963, paper: "#f6ebce", ink: "#3d2a2a", accent: "#e8773f" },
  { slug: "dot-matrix-desert", title: "Dot Matrix\nDesert", tagline: "Tractor-feed trails · Ribbon required", est: 1970, paper: "#fbf0d6", ink: "#3a1630", accent: "#c25b3d" },
  { slug: "blue-screen-bay", title: "Blue Screen\nBay", tagline: "Press any key to continue your stay", est: 1993, paper: "#e6e9ff", ink: "#0000aa", accent: "#2f4fd0" },
];

// ---------- render ----------
const fontFiles = ["AlfaSlabOne.ttf", "BarlowCondensed-SemiBold.ttf", "BarlowCondensed-Medium.ttf"].map((f) => resolve(root, "fonts", f));
const fontOpts = { fontFiles, loadSystemFonts: false, defaultFontFamily: TEXT };

const PRINT_W = 4665, PRINT_H = 5844; // Prodigi GLOBAL-TEE-GIL-64000 front print area (US lab)
const PRINT_POSTER_W = 3300; // ~11 inches at 300 dpi
const scale = PRINT_POSTER_W / W;
const printX = (PRINT_W - PRINT_POSTER_W) / 2;
const printY = 420; // a little below the collar

mkdirSync(resolve(root, "public/art"), { recursive: true });
mkdirSync(resolve(root, "public/print"), { recursive: true });

for (const d of designs) {
  const svg = poster(d, scenes[d.slug]());
  writeFileSync(resolve(root, "public/art", `${d.slug}.svg`), svg);

  const web = new Resvg(svg, { font: fontOpts, fitTo: { mode: "width", value: 750 } });
  writeFileSync(resolve(root, "public/art", `${d.slug}.png`), web.render().asPng());

  const printSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${PRINT_W}" height="${PRINT_H}" viewBox="0 0 ${PRINT_W} ${PRINT_H}"><g transform="translate(${printX} ${printY}) scale(${scale})">${svg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "")}</g></svg>`;
  const print = new Resvg(printSvg, { font: fontOpts, background: "rgba(0,0,0,0)" });
  writeFileSync(resolve(root, "public/print", `${d.slug}.png`), print.render().asPng());
  console.log("rendered", d.slug);
}
