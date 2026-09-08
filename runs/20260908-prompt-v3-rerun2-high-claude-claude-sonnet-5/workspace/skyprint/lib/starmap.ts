import * as Astronomy from 'astronomy-engine';
import starsRaw from '@/data/stars.json';
import constellationsRaw from '@/data/constellations.json';

// stars.json: [ra_deg, dec_deg, magnitude][]
type StarRow = [number, number, number];
const STARS = starsRaw as unknown as StarRow[];

// constellations.json: [id, lines][] where lines is an array of polylines,
// each polyline an array of [ra_deg, dec_deg] points.
type ConstellationRow = [string, [number, number][][]];
const CONSTELLATIONS = constellationsRaw as unknown as ConstellationRow[];

export interface StarChartParams {
  lat: number;
  lon: number;
  /** Exact UTC instant the sky should be depicted for. */
  instantUTC: Date;
  title: string;
  subtitle: string;
  message?: string;
  /** Small caption line, e.g. coordinates + local time. Auto-generated if omitted. */
  caption?: string;
  /** Output canvas size in SVG user units == px at 1x. */
  width?: number;
  height?: number;
  inkColor?: string;
}

// Internal fixed coordinate system the chart is composed in; `width`/`height`
// just scale the final <svg> viewport, keeping the design proportions fixed.
const VB_W = 1000;
const VB_H = 1258;
const CX = 500;
const CY = 460;
const RADIUS = 420;

function escapeXml(input: string): string {
  return input.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case "'":
        return '&apos;';
      case '"':
        return '&quot;';
      default:
        return c;
    }
  });
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

interface Projected {
  x: number;
  y: number;
  alt: number;
}

function project(
  observer: Astronomy.Observer,
  time: Astronomy.AstroTime,
  raDeg: number,
  decDeg: number
): Projected {
  const raHours = ((raDeg % 360) + 360) % 360 / 15;
  const hor = Astronomy.Horizon(time, observer, raHours, decDeg, undefined);
  const r = ((90 - hor.altitude) / 90) * RADIUS;
  const azRad = (hor.azimuth * Math.PI) / 180;
  return {
    x: CX + r * Math.sin(azRad),
    y: CY - r * Math.cos(azRad),
    alt: hor.altitude,
  };
}

const MIN_MAG = -1.5;
const MAX_MAG = 5.3;

function starRadius(mag: number): number {
  const t = clamp((mag - MIN_MAG) / (MAX_MAG - MIN_MAG), 0, 1);
  return lerp(2.9, 0.5, t);
}

function starOpacity(mag: number): number {
  const t = clamp((mag - MIN_MAG) / (MAX_MAG - MIN_MAG), 0, 1);
  return lerp(1, 0.38, t);
}

export function buildStarChartSVG(params: StarChartParams): string {
  const {
    lat,
    lon,
    instantUTC,
    title,
    subtitle,
    message,
    caption,
    width = VB_W,
    height = VB_H,
    inkColor = '#f3e6c8',
  } = params;

  const observer = new Astronomy.Observer(lat, lon, 0);
  const time = Astronomy.MakeTime(instantUTC);

  // --- stars ---
  const starEls: string[] = [];
  for (const [raDeg, decDeg, mag] of STARS) {
    const p = project(observer, time, raDeg, decDeg);
    if (p.alt < 0) continue;
    const r = starRadius(mag);
    const o = starOpacity(mag);
    starEls.push(
      `<circle cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="${r.toFixed(
        2
      )}" fill="${inkColor}" fill-opacity="${o.toFixed(2)}"/>`
    );
  }

  // --- constellation lines ---
  const lineEls: string[] = [];
  for (const [, polylines] of CONSTELLATIONS) {
    for (const line of polylines) {
      let d = '';
      let penDown = false;
      for (const [raDeg, decDeg] of line) {
        const p = project(observer, time, raDeg, decDeg);
        if (p.alt < 0) {
          penDown = false;
          continue;
        }
        d += `${penDown ? 'L' : 'M'}${p.x.toFixed(2)},${p.y.toFixed(2)} `;
        penDown = true;
      }
      if (d) lineEls.push(`<path d="${d.trim()}" />`);
    }
  }

  const safeTitle = escapeXml(title || '').toUpperCase();
  const safeSubtitle = escapeXml(subtitle || '').toUpperCase();
  const safeMessage = message ? escapeXml(message) : '';
  const safeCaption = escapeXml(caption || '');

  // Auto-shrink long titles a touch so they don't overrun the canvas width.
  const titleFontSize = clamp(96 - Math.max(0, safeTitle.length - 12) * 2.6, 46, 96);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${VB_W} ${VB_H}">
  <defs>
    <radialGradient id="vignette" cx="50%" cy="50%" r="50%">
      <stop offset="78%" stop-color="${inkColor}" stop-opacity="0"/>
      <stop offset="100%" stop-color="${inkColor}" stop-opacity="0.05"/>
    </radialGradient>
  </defs>

  <g stroke="${inkColor}" stroke-opacity="0.32" stroke-width="1.1" fill="none" stroke-linecap="round">
    ${lineEls.join('\n    ')}
  </g>

  <g>
    ${starEls.join('\n    ')}
  </g>

  <circle cx="${CX}" cy="${CY}" r="${RADIUS}" fill="url(#vignette)" />
  <circle cx="${CX}" cy="${CY}" r="${RADIUS}" fill="none" stroke="${inkColor}" stroke-width="2.25" stroke-opacity="0.9" />
  <circle cx="${CX}" cy="${CY}" r="${RADIUS + 10}" fill="none" stroke="${inkColor}" stroke-width="0.75" stroke-opacity="0.45" />

  <g font-family="Cormorant Garamond" fill="${inkColor}" text-anchor="middle">
    <text x="${CX}" y="1000" font-size="${titleFontSize}" font-weight="600">${safeTitle}</text>
    <line x1="${CX - 90}" y1="1034" x2="${CX + 90}" y2="1034" stroke="${inkColor}" stroke-width="1" stroke-opacity="0.65"/>
    <circle cx="${CX}" cy="1034" r="3.5" fill="${inkColor}"/>
    <text x="${CX}" y="1082" font-size="30" font-weight="500" letter-spacing="6">${safeSubtitle}</text>
    ${
      safeMessage
        ? `<text x="${CX}" y="1130" font-size="24" font-weight="400" fill-opacity="0.85">${safeMessage}</text>`
        : ''
    }
    ${
      safeCaption
        ? `<text x="${CX}" y="${safeMessage ? 1178 : 1140}" font-size="17" font-weight="400" letter-spacing="2" fill-opacity="0.55">${safeCaption}</text>`
        : ''
    }
  </g>
</svg>`;
}

export function formatCaption(lat: number, lon: number, localLabel: string): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lonDir = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(4)}°${latDir}  ${Math.abs(lon).toFixed(
    4
  )}°${lonDir}  —  ${localLabel}`;
}
