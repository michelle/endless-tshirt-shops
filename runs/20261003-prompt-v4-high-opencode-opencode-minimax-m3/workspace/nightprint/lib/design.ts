/**
 * STARPRINT design generator.
 *
 * Renders a beautiful celestial illustration from a (date, location, message)
 * triple and outputs SVG (for live preview) plus optionally high-resolution PNG
 * (for DTG printing).
 */
import { celestialPositions, hashSeed, skySeed, moonPhaseName } from './stars';
import type { SkyInputs } from './stars';

export interface DesignInput extends SkyInputs {
  /** Display name for the location, e.g. "Paris, France" */
  locationName: string;
  /** Two- to four-line message the customer wants on the garment */
  message: string;
  /** Optional flavor / theme label, e.g. "The Night We Met" */
  headline?: string;
  /** Dark ink palette to use. "ink" = dark design on light shirts, "ivory" = light design on dark shirts */
  palette?: 'ink' | 'ivory' | 'rose' | 'sage';
}

export interface RenderedSvg {
  svg: string;
  width: number;
  height: number;
}

/** Print-ready canvas size for the Bella+Canvas 3001.
 *  4677x5881 px @ 300dpi -> roughly 12.46" x 15.68" safe print area. */
export const PRINT_W = 4677;
export const PRINT_H = 5881;

/** Premium preview canvas; we re-rasterize at print resolution over the wire. */
const PREVIEW_RATIO = 4677 / 1200;  // ~3.9x upsample, decided at server time
export const PREVIEW_W = 1200;
export const PREVIEW_H = 1508;

interface Palette {
  bg: string;
  bg2: string;
  ink: string;
  inkSoft: string;
  inkLine: string;
  accent: string;
  star: string;
  starBright: string;
}

const PALETTES: Record<NonNullable<DesignInput['palette']>, Palette> = {
  ink: {
    bg: '#0c101a',
    bg2: '#1a2236',
    ink: '#e8edf5',
    inkSoft: '#9aa8c2',
    inkLine: '#6c7d9f',
    accent: '#d4a857',
    star: '#e8edf5',
    starBright: '#fff8d6',
  },
  ivory: {
    bg: '#f3ecdf',
    bg2: '#e8dcc6',
    ink: '#1d2638',
    inkSoft: '#4d5e80',
    inkLine: '#6c7d9f',
    accent: '#b5893c',
    star: '#1d2638',
    starBright: '#b5893c',
  },
  rose: {
    bg: '#1a141c',
    bg2: '#2a1f2a',
    ink: '#fbe6e4',
    inkSoft: '#caa9b0',
    inkLine: '#7d6573',
    accent: '#e08b8a',
    star: '#fbe6e4',
    starBright: '#ffd9d4',
  },
  sage: {
    bg: '#0f1a18',
    bg2: '#19282a',
    ink: '#dde7df',
    inkSoft: '#8aa094',
    inkLine: '#5e7a72',
    accent: '#b8c89a',
    star: '#dde7df',
    starBright: '#f0f3d0',
  },
};

/** Helper: format a Date into a clean display string. */
function fmtDate(d: Date): {
  longLine: string;
  bigLine: string;
  shortLine: string;
} {
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'];
  const m = months[d.getUTCMonth()];
  const day = d.getUTCDate();
  const year = d.getUTCFullYear();
  const hour = d.getUTCHours();
  const min = d.getUTCMinutes();
  const hh = String(hour).padStart(2, '0');
  const mm = String(min).padStart(2, '0');
  const longLine = `${m} ${day}, ${year} \u00B7 ${hh}:${mm} UTC`;
  const bigLine = `${m.toUpperCase()} ${day}, ${year}`;
  const shortLine = `${year}.${String(d.getUTCMonth() + 1).padStart(2, '0')}.${String(day).padStart(2, '0')}`;
  return { longLine, bigLine, shortLine };
}

/** Convert (azimuth, altitude) into a planar projection suitable for printing.
 *  Uses a stereographic-style projection clipped to a circular sky disc.
 *  Returns {x, y} normalised to canvas half-units, centered on (cx, cy).
 */
function project(azDeg: number, altDeg: number, R: number): { x: number; y: number } {
  // Azimuth: 0 = North, increases clockwise.  We map azimuth -> screen angle
  // starting at the top (12 o'clock) and rotating clockwise to match visual
  // expectation (east on the right, south down, west left).
  const theta = (azDeg - 0) * (Math.PI / 180);
  // Altitude: how high above the horizon.  90deg = zenith (center),
  // -90deg = nadir (down).  We map 0deg (horizon) to radius R,
  // altitude 90deg to radius 0, altitude below 0 -> we clamp.
  const a = Math.max(0, Math.min(1, altDeg / 90));
  const r = (1 - a) * R;
  const x = r * Math.sin(theta);
  const y = -r * Math.cos(theta);
  return { x, y };
}

/** Build the SVG composition. */
export function generateSvg(input: DesignInput, opts: { width: number; height: number }): RenderedSvg {
  const W = opts.width;
  const H = opts.height;
  const palette = PALETTES[input.palette ?? 'ink'];

  const sky = celestialPositions(input);
  const dateStr = fmtDate(input.when);

  // Sky disc: centered in the top "sky" portion of the print area.
  const discCx = W * 0.5;
  const discCy = H * 0.32;
  const discR = W * 0.38;

  const rng = hashSeed(skySeed(input));

  // Generate ~280 stars across the upper sky disc, biased higher in the disc.
  const stars: Array<{ x: number; y: number; size: number; sparkle: boolean }> = [];
  const STAR_COUNT = 280;
  for (let i = 0; i < STAR_COUNT; i++) {
    const r = Math.sqrt(rng()) * discR;
    const t = rng() * Math.PI * 2;
    const x = discCx + r * Math.cos(t);
    const y = discCy + r * Math.sin(t);
    const size = rng() * 0.6 + 0.4;   // 0.4 to 1.0 px
    const sparkle = rng() < 0.05;     // ~5% are big bright stars
    stars.push({ x, y, size, sparkle });
  }

  // Pick a handful of "anchor" stars to join with constellation lines,
  // giving the print a real chart feel rather than a flat starfield.
  const anchors = stars
    .slice()
    .sort((a, b) => b.size - a.size)
    .slice(0, 8)
    .sort((a, b) => a.x - b.x);  // order left-to-right for predictable flow

  // Constellation lines (closed poly)
  const lines: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
  for (let i = 0; i < anchors.length - 1; i++) {
    lines.push({ x1: anchors[i].x, y1: anchors[i].y, x2: anchors[i + 1].x, y2: anchors[i + 1].y });
  }
  // Closing arc on the longer side for a nicer shape
  if (anchors.length >= 4) {
    lines.push({
      x1: anchors[Math.floor(anchors.length / 2)].x,
      y1: anchors[Math.floor(anchors.length / 2)].y,
      x2: anchors[anchors.length - 1].x,
      y2: anchors[anchors.length - 1].y,
    });
  }

  // Project planets into the disc.  Azimuth is mapped by our `project`,
  // altitude determines how close to center.
  const planetNodes = sky.points.map((p) => {
    const proj = project(p.azimuthDeg, p.altitudeDeg, discR);
    return { x: discCx + proj.x, y: discCy + proj.y, label: p.label };
  });

  // Render `(az, alt)` to display: a small concentric gauge at the bottom of
  // the sky disc, showing horizon meridian (N at bottom, E/W on sides).
  const compassR = discR * 0.06;
  const compassCx = discCx;
  const compassCy = discCy + discR + W * 0.012;
  const compassLabels = [
    { tag: 'N', dx: 0, dy: compassR + 22 },
    { tag: 'E', dx: compassR + 14, dy: 4 },
    { tag: 'S', dx: 0, dy: -compassR - 12 },
    { tag: 'W', dx: -compassR - 14, dy: 4 },
  ];

  // Layout below the disc: typography.
  // We pad generously so the print reads on a chest.
  const pad = W * 0.07;
  const titleY = H * 0.555;
  const dateY  = H * 0.66;
  const locY   = H * 0.71;
  const metaY  = H * 0.765;
  const msgLineH = W * 0.045;
  const msgStartY = H * 0.83;
  const footerY = H * 0.965;

  const lines_message = (input.message ?? '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 4);
  while (lines_message.length < 4) lines_message.push('');

  // Build SVG piece by piece.  We intentionally inline styles so the
  // rasterized PNG (from resvg-js) gets a faithful match.
  const svgDefs = `
    <defs>
      <radialGradient id="discBg" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="${palette.bg2}" stop-opacity="0.8"/>
        <stop offset="65%" stop-color="${palette.bg}" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="border" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="${palette.inkLine}" stop-opacity="0.8"/>
        <stop offset="50%" stop-color="${palette.accent}" stop-opacity="0.9"/>
        <stop offset="100%" stop-color="${palette.inkLine}" stop-opacity="0.8"/>
      </linearGradient>
      <filter id="glow">
        <feGaussianBlur stdDeviation="${W * 0.0008}" result="b"/>
        <feMerge>
          <feMergeNode in="b"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
  `;

  // Border rectangle using SVG group
  const border = `
    <rect x="${pad * 0.6}" y="${pad * 0.6}"
          width="${W - pad * 1.2}" height="${H - pad * 1.2}"
          fill="none" stroke="${palette.inkLine}" stroke-opacity="0.35"
          stroke-width="${W * 0.0028}"/>
    <rect x="${pad * 0.85}" y="${pad * 0.85}"
          width="${W - pad * 1.7}" height="${H - pad * 1.7}"
          fill="none" stroke="${palette.accent}" stroke-opacity="0.55"
          stroke-width="${W * 0.0014}"/>
  `;

  // Decorative ornaments in the corners (constellation-style charts)
  const cornerDec = `
    <g opacity="0.85" stroke="${palette.accent}" stroke-opacity="0.65" fill="none"
       stroke-width="${W * 0.0013}">
      <path d="M ${pad} ${pad * 1.5}
              l ${W * 0.018} 0
              l ${W * 0.012} ${W * 0.012}"
            stroke-linecap="round"/>
      <path d="M ${W - pad} ${pad * 1.5}
              l ${-W * 0.018} 0
              l ${-W * 0.012} ${W * 0.012}"
            stroke-linecap="round"/>
      <path d="M ${pad} ${H - pad * 1.5}
              l ${W * 0.018} 0
              l ${W * 0.012} ${-W * 0.012}"
            stroke-linecap="round"/>
      <path d="M ${W - pad} ${H - pad * 1.5}
              l ${-W * 0.018} 0
              l ${-W * 0.012} ${-W * 0.012}"
            stroke-linecap="round"/>
    </g>
  `;

  // Stars: small filled circles, with the brightest stars getting a 4-point cross.
  const starsSvg = stars.map((s) => {
    if (!s.sparkle) {
      return `<circle cx="${s.x.toFixed(1)}" cy="${s.y.toFixed(1)}"
                    r="${(s.size * W * 0.0011).toFixed(2)}"
                    fill="${palette.star}" opacity="0.92"/>`;
    }
    const lw = s.size * W * 0.011;
    return `
      <g filter="url(#glow)">
        <circle cx="${s.x.toFixed(1)}" cy="${s.y.toFixed(1)}"
                r="${(s.size * W * 0.0022).toFixed(2)}"
                fill="${palette.starBright}"/>
        <path d="M ${(s.x - lw).toFixed(1)} ${s.y.toFixed(1)}
                  l ${(lw * 2).toFixed(1)} 0
                  M ${s.x.toFixed(1)} ${(s.y - lw).toFixed(1)}
                  l 0 ${(lw * 2).toFixed(1)}"
                  stroke="${palette.starBright}" stroke-width="${(W * 0.0006).toFixed(2)}"
                  stroke-linecap="round"/>
      </g>
    `;
  }).join('\n');

  // Constellation lines
  const linesSvg = lines
    .map(
      (ln) => `<line x1="${ln.x1.toFixed(1)}" y1="${ln.y1.toFixed(1)}"
                     x2="${ln.x2.toFixed(1)}" y2="${ln.y2.toFixed(1)}"
                     stroke="${palette.inkLine}" stroke-opacity="0.45"
                     stroke-width="${(W * 0.0010).toFixed(2)}"
                     stroke-dasharray="${(W * 0.012).toFixed(1)} ${(W * 0.006).toFixed(1)}"
                     stroke-linecap="round"/>`
    )
    .join('\n');

  // Planets as small labelled markers (text label written in tiny mono).
  const planetsSvg = planetNodes
    .map(
      (p) => `
        <g>
          <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}"
                  r="${W * 0.0042}"
                  fill="${palette.accent}" stroke="${palette.ink}"
                  stroke-width="${W * 0.0009}"/>
          <text x="${(p.x + W * 0.008).toFixed(1)}" y="${(p.y + W * 0.004).toFixed(1)}"
                font-family="JetBrains Mono, monospace"
                font-size="${(W * 0.011).toFixed(1)}"
                fill="${palette.inkSoft}"
                letter-spacing="1.6">${p.label.toUpperCase()}</text>
        </g>
      `
    )
    .join('\n');

  // Sky disc background
  const disc = `
    <circle cx="${discCx}" cy="${discCy}" r="${discR}"
            fill="url(#discBg)"/>
    <circle cx="${discCx}" cy="${discCy}" r="${discR}"
            fill="none" stroke="${palette.inkLine}" stroke-opacity="0.35"
            stroke-width="${W * 0.0014}"/>
  `;

  // Compass rose under the disc
  const compass = `
    <g transform="translate(${compassCx} ${compassCy})">
      <circle r="${compassR}" fill="${palette.bg}" stroke="${palette.accent}"
              stroke-width="${W * 0.0009}"/>
      <line x1="${-compassR}" y1="0" x2="${compassR}" y2="0"
            stroke="${palette.inkLine}" stroke-width="${W * 0.0009}"/>
      <line x1="0" y1="${-compassR}" x2="0" y2="${compassR}"
            stroke="${palette.inkLine}" stroke-width="${W * 0.0009}"/>
      <polygon points="0,${-compassR} ${W * 0.0045},${-compassR * 0.6} ${-W * 0.0045},${-compassR * 0.6}"
               fill="${palette.accent}"/>
      ${compassLabels
        .map(
          (c) => `<text x="${c.dx}" y="${c.dy}" font-family="JetBrains Mono, monospace"
                              font-size="${(W * 0.012).toFixed(1)}" text-anchor="middle"
                              fill="${palette.inkSoft}">${c.tag}</text>`
        )
        .join('\n')}
    </g>
  `;

  // Typography: headline, big date, location, message lines, footer.
  const headline = input.headline?.trim() || 'The Night Sky';
  const headlineSvg = `
    <text x="${W / 2}" y="${titleY}" text-anchor="middle"
          font-family="Cormorant Garamond, Georgia, serif" font-style="italic"
          font-size="${(W * 0.062).toFixed(1)}"
          fill="${palette.accent}" letter-spacing="2">${escapeXml(headline)}</text>
  `;

  const dateBigSvg = `
    <text x="${W / 2}" y="${dateY}" text-anchor="middle"
          font-family="Cormorant Garamond, Georgia, serif"
          font-size="${(W * 0.097).toFixed(1)}"
          fill="${palette.ink}" letter-spacing="3.5"
          font-weight="600">${escapeXml(dateStr.bigLine)}</text>
  `;

  const locSvg = `
    <text x="${W / 2}" y="${locY}" text-anchor="middle"
          font-family="JetBrains Mono, monospace"
          font-size="${(W * 0.022).toFixed(1)}"
          fill="${palette.inkSoft}" letter-spacing="6">
      ${escapeXml((input.locationName || '').toUpperCase())}
    </text>
  `;

  // Three small meta lines under location (lat/lng, moon phase, time)
  const phaseText = `${sky.moon.phaseName.toUpperCase()} \u00B7 ${(sky.moon.phaseFraction * 100).toFixed(0)}%`;
  const coordText = `${Math.abs(input.latitudeDeg).toFixed(2)}\u00B0${input.latitudeDeg >= 0 ? 'N' : 'S'} \u00B7 ${Math.abs(input.longitudeDeg).toFixed(2)}\u00B0${input.longitudeDeg >= 0 ? 'E' : 'W'}`;
  const metaSvg = `
    <g font-family="JetBrains Mono, monospace"
       fill="${palette.inkLine}" letter-spacing="3"
       font-size="${(W * 0.0135).toFixed(1)}">
      <text x="${W * 0.18}" y="${metaY}" text-anchor="start">${escapeXml(coordText)}</text>
      <text x="${W / 2}" y="${metaY}" text-anchor="middle">${escapeXml(dateStr.shortLine)}</text>
      <text x="${W * 0.82}" y="${metaY}" text-anchor="end">${escapeXml(phaseText)}</text>
    </g>
  `;

  // The customer's message - up to 4 lines, italic display font
  const messageSvg = lines_message
    .map((line, i) => {
      const y = msgStartY + i * msgLineH;
      return line.trim()
        ? `<text x="${W / 2}" y="${y}" text-anchor="middle"
                  font-family="Cormorant Garamond, Georgia, serif" font-style="italic"
                  font-size="${(W * 0.038).toFixed(1)}"
                  fill="${palette.ink}"
                  letter-spacing="0.6">${escapeXml(line)}</text>`
        : '';
    })
    .join('\n');

  // Tiny footer: brand mark and edition info.
  const footerSvg = `
    <g font-family="JetBrains Mono, monospace"
       fill="${palette.inkLine}" letter-spacing="4"
       font-size="${(W * 0.0115).toFixed(1)}">
      <text x="${W * 0.18}" y="${footerY}" text-anchor="start">${escapeXml(formatStarsLabel(stars.length))}</text>
      <text x="${W / 2}" y="${footerY}" text-anchor="middle">\u2728  STARPRINT  \u2728</text>
      <text x="${W * 0.82}" y="${footerY}" text-anchor="end">${escapeXml((`DTG \u00B7 ${dateStr.longLine.split(' \u00B7 ')[1] || ''}`).toUpperCase())}</text>
    </g>
  `;

  // Outer "milemarker" ticks at left and right margins, like a celestial chart
  const ticks = `
    <g stroke="${palette.inkLine}" stroke-opacity="0.5"
       stroke-width="${W * 0.0009}" fill="none">
      ${[0.18, 0.30, 0.42, 0.50, 0.58, 0.70, 0.82]
        .map((t) => `<line x1="${pad * 0.78}" y1="${H * t}" x2="${pad * 0.95}" y2="${H * t}"/>
                      <line x1="${W - pad * 0.95}" y1="${H * t}" x2="${W - pad * 0.78}" y2="${H * t}"/>`)
        .join('\n')}
    </g>
  `;

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}"
     width="${W}" height="${H}">
  ${svgDefs}
  <rect width="${W}" height="${H}" fill="${palette.bg}"/>
  ${border}
  ${cornerDec}
  ${ticks}
  ${disc}
  ${linesSvg}
  ${starsSvg}
  ${planetsSvg}
  ${compass}
  ${headlineSvg}
  ${dateBigSvg}
  ${locSvg}
  ${metaSvg}
  ${messageSvg}
  ${footerSvg}
</svg>`;

  return { svg, width: W, height: H };
}

function formatStarsLabel(n: number): string {
  return `${n} STARS \u00B7 NET-CAT`;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ---------- Default style helpers ----------
export type DesignStyle = 'standard' | 'minimal' | 'cosmic';
export const STYLE_OPTIONS: Array<{ value: DesignStyle; label: string; description: string }> = [
  {
    value: 'standard',
    label: 'Heritage',
    description: 'The classic chart: ornate borders, sky disc, big date.',
  },
  {
    value: 'minimal',
    label: 'Clean',
    description: 'Just the essentials - date, location and small starfield.',
  },
  {
    value: 'cosmic',
    label: 'Cosmic',
    description: 'Dense stars, no borders, more dramatic.',
  },
];

// ---------- Color palette options ----------
export const PALETTE_OPTIONS: Array<{ value: NonNullable<DesignInput['palette']>; label: string; description: string; defaultGarment: string }> = [
  { value: 'ink', label: 'Midnight Ink', description: 'Dark cobalt + gold. Best on light garments.', defaultGarment: 'white' },
  { value: 'ivory', label: 'Antique Ivory', description: 'Dark ink on warm cream. Best on light garments.', defaultGarment: 'white' },
  { value: 'rose', label: 'Dusty Rose', description: 'Pink + ruby. A romantic option for gifts.', defaultGarment: 'white' },
  { value: 'sage', label: 'Forest Sage', description: 'Green + cream. Earthy and grounding.', defaultGarment: 'white' },
];

// ---------- Suggested headline tags (UI suggestions) ----------
export const HEADLINE_OPTIONS = [
  'The Night We Met',
  'Under These Stars',
  'A Moment in Time',
  'Our Sky, Our Story',
  'The Night I Was Born',
  'The First Night',
  'Our Last First Kiss',
];

/**
 * Default suggested inputs so the UI has an immediate, beautiful preview.
 */
export function defaultInput(): DesignInput {
  const d = new Date();
  // Use a romantic, well-known date so the demo always looks good.
  d.setUTCFullYear(2023, 6, 4);  // July 4, 2023
  d.setUTCHours(22, 30, 0, 0);
  return {
    when: d,
    latitudeDeg: 48.8566,
    longitudeDeg: 2.3522,
    locationName: 'Paris, France',
    message: 'And so\nthe adventure\nbegan.',
    headline: 'The Night We Met',
    palette: 'ink',
  };
}
