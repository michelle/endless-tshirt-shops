// Renders each guild badge as print-ready PNGs (transparent background) and web previews.
// Run: node design/generate.mjs
import { Resvg } from "@resvg/resvg-js";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const designs = JSON.parse(readFileSync(join(root, "lib/designs.json"), "utf8"));
const outDir = join(root, "public/designs");
mkdirSync(outDir, { recursive: true });

const fontFiles = ["AlfaSlabOne-Regular.ttf", "Oswald.ttf", "SpecialElite-Regular.ttf", "Rye-Regular.ttf"].map((f) =>
  join(here, "fonts", f)
);

// Ink palettes: "light" ink for dark shirts, "dark" ink for light shirts.
const INKS = {
  light: { ink: "#F2E8D5", accent: "#D9A441" },
  dark: { ink: "#1F1B17", accent: "#B5482B" },
};

// Icons are drawn in a 240x240 box centred at (0,0), stroke-based so they read at print size.
function icon(kind, ink, accent) {
  const s = `fill="none" stroke="${ink}" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"`;
  switch (kind) {
    case "lamp":
      return `
        <g ${s}>
          <line x1="0" y1="-20" x2="0" y2="120" />
          <path d="M-50 120 h100" />
          <path d="M-20 120 c0 -20 -10 -30 -20 -34" /><path d="M20 120 c0 -20 10 -30 20 -34" />
          <path d="M-40 -20 h80 l-8 -86 h-64 z" />
          <path d="M-32 -106 l32 -30 l32 30" />
          <path d="M0 -136 v-14" />
          <path d="M-56 -20 h112" />
        </g>
        <path d="M0 -40 c-18 -16 -16 -40 0 -54 c16 14 18 38 0 54 z" fill="${accent}" />`;
    case "knocker":
      return `
        <g ${s}>
          <rect x="-70" y="-90" width="140" height="130" rx="6" />
          <line x1="0" y1="-90" x2="0" y2="40" />
          <line x1="-70" y1="-25" x2="70" y2="-25" />
          <line x1="-110" y1="120" x2="-35" y2="-60" />
        </g>
        <circle cx="-30" cy="-68" r="9" fill="${accent}" />
        <path d="M56 -140 l0 -0" />
        <g stroke="${accent}" stroke-width="10" stroke-linecap="round" fill="none">
          <path d="M40 -120 l14 -14" /><path d="M62 -140 l0 -20" /><path d="M84 -120 l14 -14" />
        </g>`;
    case "ice":
      return `
        <g ${s}>
          <path d="M-80 -20 l40 -60 h110 l-40 60 z" />
          <path d="M-80 -20 v80 l70 0 v-80" />
          <path d="M-10 60 l40 -60 v-80" />
          <path d="M-10 -20 l40 -60" />
          <path d="M-60 120 c-20 -30 20 -60 40 -120" />
          <path d="M60 120 c20 -30 -20 -60 -40 -120" />
        </g>
        <circle cx="-60" cy="122" r="12" fill="${accent}" />
        <circle cx="60" cy="122" r="12" fill="${accent}" />`;
    case "sliderule":
      return `
        <g ${s}>
          <rect x="-120" y="-40" width="240" height="80" rx="4" />
          <line x1="-120" y1="-12" x2="120" y2="-12" />
          <line x1="-120" y1="12" x2="120" y2="12" />
          ${[-100, -80, -60, -40, -20, 0, 20, 40, 60, 80, 100].map((x) => `<line x1="${x}" y1="-40" x2="${x}" y2="${x % 40 === 0 ? -24 : -30}" />`).join("")}
          ${[-100, -80, -60, -40, -20, 0, 20, 40, 60, 80, 100].map((x) => `<line x1="${x}" y1="40" x2="${x}" y2="${x % 40 === 0 ? 24 : 30}" />`).join("")}
          <path d="M-90 110 l180 -220" />
          <path d="M-90 110 l-14 12 l2 -18" />
        </g>
        <rect x="-16" y="-52" width="32" height="104" fill="none" stroke="${accent}" stroke-width="12" />`;
    case "switchboard":
      return `
        <g ${s}>
          <rect x="-110" y="-110" width="220" height="220" rx="8" />
          ${[-70, -23, 23, 70].flatMap((x) => [-70, -23, 23, 70].map((y) => `<circle cx="${x}" cy="${y}" r="13" />`)).join("")}
        </g>
        <g stroke="${accent}" stroke-width="12" fill="none" stroke-linecap="round">
          <path d="M-70 -70 C -70 20, 70 -20, 70 70" />
          <path d="M-23 70 C -23 0, 23 0, 23 -70" />
        </g>
        <circle cx="-70" cy="-70" r="13" fill="${accent}" />
        <circle cx="70" cy="70" r="13" fill="${accent}" />
        <circle cx="-23" cy="70" r="13" fill="${accent}" />
        <circle cx="23" cy="-70" r="13" fill="${accent}" />`;
    case "pins": {
      const pin = (x, y, sc) =>
        `<g transform="translate(${x} ${y}) scale(${sc})"><path d="M0 -110 c-22 0 -30 20 -26 40 c4 22 -30 40 -30 90 c0 40 20 60 56 60 c36 0 56 -20 56 -60 c0 -50 -34 -68 -30 -90 c4 -20 -4 -40 -26 -40 z" /><path d="M-30 -20 h60" stroke="${accent}" /><path d="M-32 -2 h64" stroke="${accent}" /></g>`;
      return `<g ${s}>${pin(0, -20, 0.9)}${pin(-70, 20, 0.8)}${pin(70, 20, 0.8)}</g>
        <circle cx="0" cy="85" r="34" fill="${accent}" />
        <circle cx="-8" cy="76" r="4" fill="${ink}" /><circle cx="8" cy="76" r="4" fill="${ink}" /><circle cx="0" cy="92" r="4" fill="${ink}" />`;
    }
    case "rat":
      return `
        <g ${s}>
          <path d="M-110 30 c0 -60 60 -90 120 -80 c40 6 70 30 90 10 l20 -20" />
          <path d="M-110 30 c0 40 40 60 110 60 h80 c30 0 40 -20 30 -40 c-10 -20 -40 -30 -60 -30" />
          <path d="M40 -46 c-4 -30 30 -40 40 -14" />
          <path d="M100 -40 l40 -8" />
          <path d="M-50 90 v20" /><path d="M20 90 v20" />
          <path d="M-110 30 c-40 -10 -80 20 -90 60 c-6 30 20 40 40 20" />
        </g>
        <circle cx="76" cy="-22" r="7" fill="${accent}" />`;
    case "bell":
      return `
        <g ${s}>
          <path d="M0 -130 v40" />
          <path d="M-16 -130 h32" />
          <path d="M0 -90 c-40 0 -54 30 -58 80 c-2 30 -14 50 -30 60 h176 c-16 -10 -28 -30 -30 -60 c-4 -50 -18 -80 -58 -80 z" />
          <path d="M-40 50 c0 30 80 30 80 0" />
          <path d="M-130 -40 l24 12" /><path d="M-140 10 h26" />
          <path d="M130 -40 l-24 12" /><path d="M140 10 h-26" />
        </g>
        <circle cx="0" cy="78" r="16" fill="${accent}" />`;
    case "key":
      return `
        <g ${s}>
          <rect x="-120" y="40" width="240" height="30" rx="4" />
          <path d="M-90 40 l20 -60 h140 l30 40" />
          <path d="M-70 -20 l0 60" />
          <path d="M-100 -40 l-20 -20" /><path d="M-130 -40 l-6 -34" />
        </g>
        <circle cx="70" cy="-40" r="26" fill="${accent}" />
        <g fill="${accent}">
          <circle cx="-60" cy="-100" r="9" /><rect x="-40" y="-109" width="50" height="18" rx="9" /><circle cx="30" cy="-100" r="9" />
          <rect x="50" y="-109" width="50" height="18" rx="9" />
        </g>`;
    case "book":
      return `
        <g ${s}>
          <path d="M0 -60 c-30 -30 -80 -30 -120 -20 v150 c40 -10 90 -10 120 20 c30 -30 80 -30 120 -20 v-150 c-40 -10 -90 -10 -120 20 z" />
          <path d="M0 -60 v150" />
          <path d="M-95 -30 c30 -6 50 -6 75 4" /><path d="M-95 0 c30 -6 50 -6 75 4" /><path d="M-95 30 c30 -6 50 -6 75 4" />
          <path d="M95 -30 c-30 -6 -50 -6 -75 4" /><path d="M95 0 c-30 -6 -50 -6 -75 4" /><path d="M95 30 c-30 -6 -50 -6 -75 4" />
        </g>
        <g stroke="${accent}" stroke-width="10" fill="none" stroke-linecap="round">
          <path d="M-30 -110 c10 -10 10 -20 0 -30" /><path d="M0 -118 c10 -12 10 -24 0 -36" /><path d="M30 -110 c10 -10 10 -20 0 -30" />
        </g>`;
    default:
      return "";
  }
}

function esc(t) {
  return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// 1000 x 1200 design space, scaled to print/preview sizes.
function pt(cx, cy, r, deg) {
  const a = (deg * Math.PI) / 180;
  return `${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`;
}
// Font-size that fits `text` into an arc of length `arcLen` (rough glyph-width heuristic).
function fitSize(text, arcLen, emWidth, spacing, max) {
  const n = text.length;
  const size = (arcLen * 0.92 - n * spacing) / (n * emWidth);
  return Math.min(max, Math.floor(size));
}

function badgeSvg(d, variant, width, height) {
  const { ink, accent } = INKS[variant];
  const cx = 500, cy = 540;
  const R = 440; // outer ring
  const innerR = 300;
  const topR = 352, topSpan = 220; // degrees
  const botR = 392, botSpan = 140;
  const topStart = 270 - topSpan / 2; // 160 for a 220 span (angles: 0=right, 90=bottom, 270=top)
  const topEnd = topStart + topSpan; // 380 == 20
  const botStart = 90 + botSpan / 2; // 160
  const botEnd = 90 - botSpan / 2; // 20
  const topLen = (Math.PI * topR * topSpan) / 180;
  const botLen = (Math.PI * botR * botSpan) / 180;
  const topSize = fitSize(d.arcTop, topLen, 0.68, 5, 50);
  const botSize = fitSize(d.arcBottom, botLen, 0.5, 8, 44);
  const ribbonText = variant === "light" ? "#1F1B17" : "#F2E8D5";
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 1000 1200">
  <defs>
    <path id="arcTop" d="M ${pt(cx, cy, topR, topStart)} A ${topR} ${topR} 0 1 1 ${pt(cx, cy, topR, topEnd)}" />
    <path id="arcBottom" d="M ${pt(cx, cy, botR, botStart)} A ${botR} ${botR} 0 0 0 ${pt(cx, cy, botR, botEnd)}" />
  </defs>
  <g fill="none" stroke="${ink}">
    <circle cx="${cx}" cy="${cy}" r="${R}" stroke-width="24" />
    <circle cx="${cx}" cy="${cy}" r="${R - 28}" stroke-width="5" />
    <circle cx="${cx}" cy="${cy}" r="${innerR}" stroke-width="9" />
    <circle cx="${cx}" cy="${cy}" r="${innerR - 14}" stroke-width="3" stroke-dasharray="3 9" />
  </g>
  <g fill="${ink}" font-family="Alfa Slab One" font-size="${topSize}" letter-spacing="5">
    <text><textPath xlink:href="#arcTop" startOffset="50%" text-anchor="middle">${esc(d.arcTop)}</textPath></text>
  </g>
  <g fill="${ink}" font-family="Oswald" font-weight="600" font-size="${botSize}" letter-spacing="8">
    <text><textPath xlink:href="#arcBottom" startOffset="50%" text-anchor="middle">${esc(d.arcBottom)}</textPath></text>
  </g>
  <g fill="${accent}">
    <circle cx="${pt(cx, cy, 372, 160).split(" ")[0]}" cy="${pt(cx, cy, 372, 160).split(" ")[1]}" r="12" />
    <circle cx="${pt(cx, cy, 372, 20).split(" ")[0]}" cy="${pt(cx, cy, 372, 20).split(" ")[1]}" r="12" />
  </g>
  <g transform="translate(${cx} ${cy - 70}) scale(1.0)">${icon(d.icon, ink, accent)}</g>
  <text x="${cx}" y="${cy + 120}" text-anchor="middle" font-family="Oswald" font-weight="500" font-size="34" letter-spacing="10" fill="${ink}">${esc(d.est)}</text>
  <!-- ribbon -->
  <g transform="translate(${cx} ${cy + 205})">
    <path d="M-340 -36 l-42 -24 v120 l42 -24 z" fill="${accent}" />
    <path d="M340 -36 l42 -24 v120 l-42 -24 z" fill="${accent}" />
    <path d="M-340 -36 h680 l-30 36 l30 36 h-680 l30 -36 z" fill="${ink}" />
    <text x="0" y="16" text-anchor="middle" font-family="Rye" font-size="46" fill="${ribbonText}" letter-spacing="4">${esc(d.local.toUpperCase())}</text>
  </g>
  <text x="${cx}" y="${cy + R + 130}" text-anchor="middle" font-family="Special Elite" font-size="44" letter-spacing="6" fill="${ink}">THE OBSOLETE GUILD</text>
  <text x="${cx}" y="${cy + R + 182}" text-anchor="middle" font-family="Special Elite" font-size="27" letter-spacing="4" fill="${ink}">APPAREL FOR TRADES THE WORLD FORGOT</text>
</svg>`;
}

function render(svg, width) {
  const r = new Resvg(svg, {
    fitTo: { mode: "width", value: width },
    font: { fontFiles, loadSystemFonts: false, defaultFontFamily: "Oswald" },
    background: "rgba(0,0,0,0)",
  });
  return r.render().asPng();
}

const only = process.argv[2];
for (const d of designs) {
  if (only && d.slug !== only) continue;
  for (const variant of ["light", "dark"]) {
    const svg = badgeSvg(d, variant, 1000, 1200);
    writeFileSync(join(outDir, `${d.slug}-${variant}.svg`), svg);
    // Print file: 4500 x 5400 px (15 x 18 in at 300 dpi).
    writeFileSync(join(outDir, `${d.slug}-${variant}-print.png`), render(svg, 4500));
    // Web preview.
    writeFileSync(join(outDir, `${d.slug}-${variant}.png`), render(svg, 900));
    console.log("rendered", d.slug, variant);
  }
}
