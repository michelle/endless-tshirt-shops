// Pure SVG generation for the seals. No DOM or Node dependencies so it can be
// used inline in React (web preview) and by scripts/render-print.ts (print PNGs).
import type { Ink, Product } from "./catalog";

export const INK: Record<Ink, string> = {
  light: "#f4ecd8",
  dark: "#1b1b1b",
};

// Design canvas: 1000 x 1200 units. Rendered for print at 12in x 14.4in @ 300 DPI.
export const DESIGN_W = 1000;
export const DESIGN_H = 1200;

const MONO = "'Space Mono', 'Courier New', monospace";
const SLAB = "'Alfa Slab One', 'Rockwell', 'Georgia', serif";

// Alfa Slab One averages ~0.66em per uppercase glyph; keep titles inside ~900 units.
const titleSize = (line: string) => Math.min(92, Math.floor(900 / (line.length * 0.66)));

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

type IconCtx = { ink: string; accent: string; sw: number };

// Icons are drawn centred on (0,0) within roughly +/- 200 units.
const ICONS: Record<string, (c: IconCtx) => string> = {
  "jetpack-commuting": ({ ink, accent, sw }) => `
    <g fill="none" stroke="${ink}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">
      <polygon points="-104,60 -56,60 -80,165" fill="${accent}" stroke="none"/>
      <polygon points="56,60 104,60 80,165" fill="${accent}" stroke="none"/>
      <rect x="-108" y="-80" width="52" height="140" rx="26"/>
      <rect x="56" y="-80" width="52" height="140" rx="26"/>
      <rect x="-48" y="-72" width="96" height="124" rx="22" fill="${accent}" fill-opacity="0.18"/>
      <circle cx="0" cy="-124" r="44"/>
      <path d="M-30,-118 Q0,-140 30,-118"/>
      <path d="M-48,-52 L-118,-8 L-104,10"/>
      <path d="M48,-52 L118,-8 L104,10"/>
      <path d="M-18,52 L-26,140 L-42,144"/>
      <path d="M18,52 L26,140 L42,144"/>
      <path d="M-160,-150 L-130,-150 M-175,-120 L-135,-120 M-160,-90 L-140,-90"/>
    </g>`,

  "lunar-hotel-concierge": ({ ink, accent, sw }) => `
    <g fill="none" stroke="${ink}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">
      <path d="M-40,-165 A165,165 0 1,0 -40,165 A215,215 0 0,1 -40,-165 Z" fill="${accent}" fill-opacity="0.9"/>
      <g transform="translate(40,-10)">
        <rect x="0" y="-10" width="140" height="180" rx="6"/>
        <rect x="0" y="-60" width="140" height="50" rx="6" fill="${ink}"/>
        <text x="70" y="-24" font-family="${MONO}" font-weight="700" font-size="30" text-anchor="middle" fill="${accent}" stroke="none">VACANCY</text>
        <rect x="18" y="12" width="26" height="30"/><rect x="57" y="12" width="26" height="30"/><rect x="96" y="12" width="26" height="30"/>
        <rect x="18" y="60" width="26" height="30"/><rect x="57" y="60" width="26" height="30"/><rect x="96" y="60" width="26" height="30"/>
        <rect x="52" y="112" width="36" height="58"/>
        <path d="M70,-60 L70,-110 L112,-96 L70,-82"/>
      </g>
      <path d="M-160,-200 l6,14 l14,6 l-14,6 l-6,14 l-6,-14 l-14,-6 l14,-6 z" fill="${ink}" stroke="none"/>
      <path d="M150,-190 l5,11 l11,5 l-11,5 l-5,11 l-5,-11 l-11,-5 l11,-5 z" fill="${ink}" stroke="none"/>
      <path d="M-190,170 l4,9 l9,4 l-9,4 l-4,9 l-4,-9 l-9,-4 l9,-4 z" fill="${ink}" stroke="none"/>
    </g>`,

  "flying-car-traffic": ({ ink, accent, sw }) => `
    <g fill="none" stroke="${ink}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">
      <polygon points="-235,-4 -150,-30 -150,22" fill="${accent}" stroke="none"/>
      <polygon points="235,-4 150,-30 150,22" fill="${accent}" stroke="none"/>
      <path d="M-160,30 L-135,-30 L-50,-30 L-15,-80 L80,-80 L125,-30 L165,30 Z" fill="${accent}" fill-opacity="0.18"/>
      <path d="M-45,-30 L-20,-64 L75,-64 L100,-30"/>
      <line x1="30" y1="-64" x2="30" y2="-30"/>
      <circle cx="-95" cy="42" r="30" fill="${ink}"/>
      <circle cx="105" cy="42" r="30" fill="${ink}"/>
      <circle cx="-95" cy="42" r="10" fill="${accent}" stroke="none"/>
      <circle cx="105" cy="42" r="10" fill="${accent}" stroke="none"/>
      <path d="M-225,-120 L-140,-120 M-205,-150 L-150,-150"/>
      <path d="M-90,150 A34,34 0 0,1 -30,130 A40,40 0 0,1 50,140 A30,30 0 0,1 60,190 L-90,190 A26,26 0 0,1 -90,150 Z"/>
    </g>`,

  "meal-pill-nutrition": ({ ink, accent, sw }) => `
    <g fill="none" stroke="${ink}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="0" cy="110" rx="150" ry="42"/>
      <ellipse cx="0" cy="110" rx="112" ry="26" stroke-width="${sw * 0.5}"/>
      <g transform="rotate(-30)">
        <path d="M0,-48 H-72 A48,48 0 0,0 -72,48 H0 Z" fill="${accent}" stroke="none"/>
        <rect x="-120" y="-48" width="240" height="96" rx="48"/>
        <line x1="0" y1="-48" x2="0" y2="48"/>
        <path d="M-92,-22 A30,30 0 0,1 -66,-34" stroke="${INK.light}" stroke-width="${sw * 0.6}"/>
      </g>
      <g>
        <line x1="-215" y1="-70" x2="-215" y2="130"/>
        <path d="M-245,-100 L-245,-50 A30,30 0 0,0 -185,-50 L-185,-100 M-215,-100 L-215,-52"/>
      </g>
      <g>
        <line x1="215" y1="-30" x2="215" y2="130"/>
        <path d="M200,-30 L200,-125 Q245,-95 232,-30 Z" fill="${ink}"/>
      </g>
    </g>`,

  "weather-control-authority": ({ ink, accent, sw }) => `
    <g fill="none" stroke="${ink}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">
      <g transform="translate(120,-120)">
        <circle cx="0" cy="0" r="38" fill="${accent}"/>
        <path d="M0,-64 L0,-84 M45,-45 L59,-59 M64,0 L84,0 M45,45 L59,59 M-45,-45 L-59,-59"/>
      </g>
      <path d="M-150,10 A52,52 0 0,1 -110,-72 A72,72 0 0,1 20,-110 A62,62 0 0,1 128,-48 A46,46 0 0,1 128,44 L-130,44 A44,44 0 0,1 -150,10 Z" fill="${accent}" fill-opacity="0.18"/>
      <polygon points="-62,60 -118,150 -84,150 -104,210 -32,110 -66,110 -40,60" fill="${accent}"/>
      <g transform="translate(95,135)">
        <circle cx="0" cy="0" r="62"/>
        <path d="M-44,-44 l8,8 M0,-62 l0,12 M44,-44 l-8,8 M-62,0 l12,0 M62,0 l-12,0"/>
        <line x1="0" y1="0" x2="34" y2="-38" stroke-width="${sw * 1.2}"/>
        <circle cx="0" cy="0" r="10" fill="${accent}" stroke="none"/>
      </g>
    </g>`,

  "household-robot-union": ({ ink, accent, sw }) => `
    <g fill="none" stroke="${ink}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">
      <line x1="0" y1="-190" x2="0" y2="-226"/>
      <circle cx="0" cy="-238" r="12" fill="${accent}" stroke="none"/>
      <rect x="-76" y="-190" width="152" height="104" rx="14"/>
      <circle cx="-34" cy="-146" r="13" fill="${accent}" stroke="none"/>
      <circle cx="34" cy="-146" r="13" fill="${accent}" stroke="none"/>
      <rect x="-38" y="-118" width="76" height="14" rx="3"/>
      <line x1="-14" y1="-118" x2="-14" y2="-104"/><line x1="14" y1="-118" x2="14" y2="-104"/>
      <rect x="-22" y="-86" width="44" height="20"/>
      <rect x="-96" y="-66" width="192" height="156" rx="18"/>
      <circle cx="0" cy="-6" r="26"/>
      <line x1="0" y1="-6" x2="14" y2="-24"/>
      <circle cx="-44" cy="52" r="8" fill="${accent}" stroke="none"/><circle cx="0" cy="52" r="8" fill="${accent}" stroke="none"/><circle cx="44" cy="52" r="8" fill="${accent}" stroke="none"/>
      <path d="M-96,-36 L-160,30"/>
      <circle cx="-166" cy="42" r="14"/>
      <path d="M96,-36 L152,10"/>
      <circle cx="160" cy="18" r="14"/>
      <line x1="176" y1="-130" x2="176" y2="140"/>
      <polygon points="146,140 206,140 220,196 132,196" fill="${accent}"/>
      <rect x="-82" y="90" width="64" height="34" rx="10" fill="${ink}"/>
      <rect x="18" y="90" width="64" height="34" rx="10" fill="${ink}"/>
    </g>`,

  "undersea-city-planning": ({ ink, accent, sw }) => `
    <g fill="none" stroke="${ink}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">
      <path d="M-230,-190 Q-200,-220 -170,-190 T-110,-190 T-50,-190 T10,-190 T70,-190 T130,-190 T190,-190 T250,-190"/>
      <path d="M-230,-150 Q-200,-180 -170,-150 T-110,-150 T-50,-150 T10,-150 T70,-150 T130,-150 T190,-150 T250,-150" stroke-width="${sw * 0.6}"/>
      <path d="M-175,70 A175,175 0 0,1 175,70 Z" fill="${accent}" fill-opacity="0.18"/>
      <rect x="-200" y="70" width="400" height="22" fill="${ink}"/>
      <rect x="-128" y="-30" width="44" height="100"/>
      <rect x="-66" y="-90" width="54" height="160"/>
      <line x1="-39" y1="-90" x2="-39" y2="-130"/>
      <rect x="6" y="-56" width="38" height="126"/>
      <rect x="62" y="-16" width="64" height="86"/>
      <rect x="-52" y="-70" width="10" height="12" fill="${ink}"/><rect x="-32" y="-70" width="10" height="12" fill="${ink}"/>
      <rect x="-52" y="-44" width="10" height="12" fill="${ink}"/><rect x="-32" y="-44" width="10" height="12" fill="${ink}"/>
      <rect x="16" y="-36" width="8" height="10" fill="${ink}"/><rect x="30" y="-36" width="8" height="10" fill="${ink}"/>
      <g transform="translate(-205,-70)">
        <path d="M-22,0 Q0,-18 22,0 Q0,18 -22,0 Z" fill="${accent}" stroke="none"/>
        <polygon points="20,0 36,-12 36,12" fill="${accent}" stroke="none"/>
      </g>
      <circle cx="-190" cy="-110" r="5"/><circle cx="-180" cy="-130" r="3"/>
      <path d="M210,70 Q200,40 214,10 Q228,-20 214,-50" stroke-width="${sw * 0.7}"/>
      <path d="M-215,70 Q-225,40 -211,10 Q-197,-20 -211,-50" stroke-width="${sw * 0.7}"/>
    </g>`,
};

export type DesignOptions = {
  ink: Ink;
  /** include a solid background rect (for previews only, never for print) */
  background?: string;
  /** optional id prefix to keep textPath ids unique when several are inlined on one page */
  idPrefix?: string;
};

export function designSvg(product: Product, opts: DesignOptions): string {
  const ink = INK[opts.ink];
  const accent = product.accent;
  const pid = opts.idPrefix ?? product.slug;
  const cx = 500;
  const cy = 430;
  const icon = ICONS[product.slug]?.({ ink, accent, sw: 13 }) ?? "";

  const ringTop = `arc-top-${pid}`;
  const ringBottom = `arc-bottom-${pid}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${DESIGN_W} ${DESIGN_H}" width="${DESIGN_W}" height="${DESIGN_H}">
  <defs>
    <path id="${ringTop}" d="M${cx - 346},${cy} A346,346 0 0,1 ${cx + 346},${cy}"/>
    <path id="${ringBottom}" d="M${cx - 376},${cy} A376,376 0 0,0 ${cx + 376},${cy}"/>
  </defs>
  ${opts.background ? `<rect width="100%" height="100%" fill="${opts.background}"/>` : ""}
  <g>
    <circle cx="${cx}" cy="${cy}" r="392" fill="none" stroke="${ink}" stroke-width="16"/>
    <circle cx="${cx}" cy="${cy}" r="330" fill="none" stroke="${ink}" stroke-width="5"/>
    <circle cx="${cx}" cy="${cy}" r="318" fill="none" stroke="${ink}" stroke-width="2" stroke-dasharray="4 8"/>
    <text font-family="${MONO}" font-weight="700" font-size="34" letter-spacing="5" fill="${ink}">
      <textPath href="#${ringTop}" startOffset="50%" text-anchor="middle">DEPARTMENT OF OBSOLETE FUTURES</textPath>
    </text>
    <text font-family="${MONO}" font-weight="700" font-size="30" letter-spacing="4" fill="${ink}">
      <textPath href="#${ringBottom}" startOffset="50%" text-anchor="middle">${esc(product.ringText)}</textPath>
    </text>
    <g fill="${accent}">
      <path transform="translate(${cx - 361},${cy})" d="M0,-14 l4,10 l10,4 l-10,4 l-4,10 l-4,-10 l-10,-4 l10,-4 z"/>
      <path transform="translate(${cx + 361},${cy})" d="M0,-14 l4,10 l10,4 l-10,4 l-4,10 l-4,-10 l-10,-4 l10,-4 z"/>
    </g>
    <g transform="translate(${cx},${cy - 40})">${icon}</g>
    <text x="${cx}" y="${cy + 255}" font-family="${MONO}" font-weight="700" font-size="30" letter-spacing="6" text-anchor="middle" fill="${ink}">EST. ${esc(product.established)}</text>
    <line x1="${cx - 90}" y1="${cy + 280}" x2="${cx + 90}" y2="${cy + 280}" stroke="${accent}" stroke-width="5"/>
  </g>
  <g text-anchor="middle" font-family="${SLAB}" fill="${ink}">
    <text x="${cx}" y="945" font-size="${titleSize(product.titleLines[0])}" letter-spacing="1">${esc(product.titleLines[0])}</text>
    <text x="${cx}" y="1045" font-size="${titleSize(product.titleLines[1])}" letter-spacing="1">${esc(product.titleLines[1])}</text>
  </g>
  <text x="${cx}" y="1125" font-family="${MONO}" font-size="28" letter-spacing="3" text-anchor="middle" fill="${accent}">${esc(product.tagline.toUpperCase())}</text>
</svg>`;
}

/** Full print-area canvas: 15.6in x 19.3in @ 300 DPI, design 12in wide, placed at chest height. */
export const PRINT_W = 4680;
export const PRINT_H = 5790;
export function printSvg(product: Product, ink: Ink): string {
  const inner = designSvg(product, { ink }).replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
  const w = 3600;
  const h = (w * DESIGN_H) / DESIGN_W;
  const x = (PRINT_W - w) / 2;
  const y = 540;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${PRINT_W}" height="${PRINT_H}" viewBox="0 0 ${PRINT_W} ${PRINT_H}">
  <svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="0 0 ${DESIGN_W} ${DESIGN_H}">${inner}</svg>
</svg>`;
}
