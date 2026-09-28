// The star chart design: a deterministic function of (title, subtitle, moment,
// location, ink). The same code renders the browser preview (inline SVG) and the
// 4680x5790 print file (SVG -> PNG via sharp in /api/design.png).
import { STARS } from '@/data/stars';
import { CONSTELLATION_LINES } from '@/data/constellations';
import { altAz, project } from './astro';
import { centerText, type Font } from './textpath';

export const PRINT_W = 4680;
export const PRINT_H = 5790;

export interface DesignInput {
  title: string; // big line, e.g. "THE NIGHT WE MET"
  subtitle: string; // e.g. "JUNE 14, 2023 · LISBON, PORTUGAL"
  utcIso: string; // moment, UTC instant
  lat: number; // degrees, north positive
  lon: number; // degrees, east positive
}

export const MAX_TITLE_LEN = 42;
export const MAX_SUBTITLE_LEN = 64;

// ---------- encoding (compact `d` param used in URLs and Stripe metadata) ----------

export function encodeDesign(d: DesignInput): string {
  const raw = [d.title, d.subtitle, d.utcIso, d.lat.toFixed(4), d.lon.toFixed(4)].join('\n');
  return b64urlEncode(raw);
}

export function decodeDesign(s: string): DesignInput | null {
  try {
    const raw = b64urlDecode(s);
    const parts = raw.split('\n');
    if (parts.length !== 5) return null;
    const [title, subtitle, utcIso, latS, lonS] = parts;
    const lat = parseFloat(latS);
    const lon = parseFloat(lonS);
    if (title.length === 0 || title.length > MAX_TITLE_LEN) return null;
    if (subtitle.length > MAX_SUBTITLE_LEN) return null;
    if (!Number.isFinite(lat) || Math.abs(lat) > 89.9) return null;
    if (!Number.isFinite(lon) || Math.abs(lon) > 180) return null;
    const t = new Date(utcIso);
    if (isNaN(t.getTime())) return null;
    const yr = t.getUTCFullYear();
    if (yr < 1900 || yr > 2100) return null;
    return { title, subtitle, utcIso: t.toISOString(), lat, lon };
  } catch {
    return null;
  }
}

export function b64urlEncode(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function b64urlDecode(s: string): string {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

// ---------- chart geometry ----------

const CX = PRINT_W / 2; // 2340
const CY = 3380;
const R = 1740; // horizon circle radius

function fmt(n: number): string {
  return n.toFixed(1);
}

/** Fit text into maxWidth by shrinking size; returns path data for centered text. */
function fitCenter(
  font: Font,
  text: string,
  cy: number,
  startSize: number,
  trackingEm: number,
  maxWidth: number
): string {
  let size = startSize;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const laid = centerText(font, text, CX, cy, size, trackingEm);
    if (laid.width <= maxWidth || size <= 40) return laid.d;
    size -= 6;
  }
}

type Pt = { x: number; y: number; alt: number; ra: number; dec: number };

/** Bisection search for where a segment between two sky points crosses alt=0. */
function horizonCross(a: Pt, b: Pt, when: Date, lat: number, lon: number): { x: number; y: number } | null {
  if (a.alt < 0 === b.alt < 0) return null;
  let lo = a.alt < 0 ? a : b; // below horizon
  let hi = a.alt < 0 ? b : a; // above horizon
  for (let i = 0; i < 16; i++) {
    const mRa = (lo.ra + hi.ra) / 2;
    const mDec = (lo.dec + hi.dec) / 2;
    const mAlt = altAz(mRa, mDec, when, lat, lon).alt;
    const m: Pt = { x: 0, y: 0, alt: mAlt, ra: mRa, dec: mDec };
    if (mAlt < 0) lo = m;
    else hi = m;
  }
  const ra = (lo.ra + hi.ra) / 2;
  const dec = (lo.dec + hi.dec) / 2;
  const p = project(ra, dec, when, lat, lon, CX, CY, R, -0.6);
  return p ? { x: p.x, y: p.y } : null;
}

/** Inner SVG content (no root <svg> element) for the full print design. */
export function buildDesignContent(design: DesignInput, ink: string, font: Font): string {
  const when = new Date(design.utcIso);
  const out: string[] = [];
  const push = (s: string) => out.push(s);

  // ---- title & subtitle ----
  push(`<path fill="${ink}" d="${fitCenter(font, design.title.toUpperCase(), 700, 216, 0.22, 3960)}"/>`);
  if (design.subtitle.trim().length > 0) {
    push(`<path fill="${ink}" fill-opacity="0.85" d="${fitCenter(font, design.subtitle.toUpperCase(), 950, 96, 0.16, 4200)}"/>`);
  }

  // ornament: small 4-point star between text and chart
  const oy = 1110;
  const orad = 26;
  push(
    `<path fill="${ink}" d="M ${fmt(CX)} ${fmt(oy - orad)} L ${fmt(CX + 7)} ${fmt(oy - 7)} L ${fmt(CX + orad)} ${fmt(oy)} L ${fmt(CX + 7)} ${fmt(oy + 7)} L ${fmt(CX)} ${fmt(oy + orad)} L ${fmt(CX - 7)} ${fmt(oy + 7)} L ${fmt(CX - orad)} ${fmt(oy)} L ${fmt(CX - 7)} ${fmt(oy - 7)} Z"/>`
  );

  // ---- graticule ----
  for (const altCircle of [30, 60]) {
    const r = R * Math.tan(((90 - altCircle) / 2) * (Math.PI / 180));
    push(`<circle cx="${CX}" cy="${CY}" r="${fmt(r)}" fill="none" stroke="${ink}" stroke-width="2.5" stroke-opacity="0.28"/>`);
  }
  for (let a = 0; a < 360; a += 45) {
    const rad = (a * Math.PI) / 180;
    push(
      `<line x1="${fmt(CX + R * Math.sin(rad) * 0.04)}" y1="${fmt(CY - R * Math.cos(rad) * 0.04)}" x2="${fmt(CX + R * Math.sin(rad))}" y2="${fmt(CY - R * Math.cos(rad))}" stroke="${ink}" stroke-width="2.5" stroke-opacity="0.22"/>`
    );
  }

  push(`<clipPath id="horizon"><circle cx="${CX}" cy="${CY}" r="${R}"/></clipPath>`);

  // ---- constellation lines (bisection-clipped at the horizon) ----
  const segs: string[] = [];
  for (const poly of CONSTELLATION_LINES) {
    let prev: Pt | null = null;
    for (let i = 0; i + 1 < poly.length; i += 2) {
      const ra = poly[i];
      const dec = poly[i + 1];
      const pr = project(ra, dec, when, design.lat, design.lon, CX, CY, R, -90);
      const cur: Pt = {
        x: pr ? pr.x : 0,
        y: pr ? pr.y : 0,
        alt: pr ? pr.alt : altAz(ra, dec, when, design.lat, design.lon).alt,
        ra,
        dec,
      };
      if (prev) {
        const aUp = prev.alt >= 0;
        const bUp = cur.alt >= 0;
        if (aUp && bUp) {
          segs.push(`M ${fmt(prev.x)} ${fmt(prev.y)} L ${fmt(cur.x)} ${fmt(cur.y)}`);
        } else if (aUp !== bUp) {
          const q = horizonCross(prev, cur, when, design.lat, design.lon);
          if (q) {
            const inPt = aUp ? prev : cur;
            segs.push(`M ${fmt(inPt.x)} ${fmt(inPt.y)} L ${fmt(q.x)} ${fmt(q.y)}`);
          }
        }
      }
      prev = cur;
    }
  }
  push(
    `<g clip-path="url(#horizon)"><path d="${segs.join(' ')}" fill="none" stroke="${ink}" stroke-width="4.5" stroke-opacity="0.32" stroke-linecap="round"/></g>`
  );

  // ---- stars ----
  const glow: string[] = [];
  const dots: string[] = [];
  for (const [ra, dec, m10] of STARS) {
    const p = project(ra, dec, when, design.lat, design.lon, CX, CY, R, 0);
    if (!p) continue;
    const mag = m10 / 10;
    const r = Math.max(3.4, 46 * Math.pow(10, -0.2 * (mag + 1.5)));
    if (mag <= 1.4)
      glow.push(`<circle cx="${fmt(p.x)}" cy="${fmt(p.y)}" r="${fmt(r * 2.6)}" fill="${ink}" fill-opacity="0.08"/>`);
    dots.push(`<circle cx="${fmt(p.x)}" cy="${fmt(p.y)}" r="${fmt(r)}" fill="${ink}"/>`);
  }
  push(`<g clip-path="url(#horizon)">${glow.join('')}${dots.join('')}</g>`);

  // ---- horizon ring & cardinal points ----
  push(`<circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="${ink}" stroke-width="9"/>`);
  const cardinals: [string, number][] = [
    ['N', 0],
    ['E', 90],
    ['S', 180],
    ['W', 270],
  ];
  for (const [label, azDeg] of cardinals) {
    const a = (azDeg * Math.PI) / 180;
    const x = CX + (R + 165) * Math.sin(a);
    const y = CY - (R + 165) * Math.cos(a);
    const laid = centerText(font, label, x, y + 44, 120, 0);
    push(`<path fill="${ink}" fill-opacity="0.8" d="${laid.d}"/>`);
  }

  // ---- footer: coordinates + brand ----
  const latStr = `${Math.abs(design.lat).toFixed(2)}° ${design.lat >= 0 ? 'N' : 'S'}`;
  const lonStr = `${Math.abs(design.lon).toFixed(2)}° ${design.lon >= 0 ? 'E' : 'W'}`;
  push(`<path fill="${ink}" fill-opacity="0.75" d="${fitCenter(font, `${latStr}  ·  ${lonStr}`, 5470, 84, 0.2, 4200)}"/>`);
  push(`<path fill="${ink}" fill-opacity="0.45" d="${centerText(font, 'SIDEREAL', CX, 5670, 58, 0.42).d}"/>`);

  return out.join('\n');
}

/** Full standalone SVG document for the design. */
export function buildDesignSVG(design: DesignInput, ink: string, font: Font): string {
  const content = buildDesignContent(design, ink, font);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${PRINT_W} ${PRINT_H}">\n${content}\n</svg>`;
}

// ---------- shirt mockup (preview only, never printed) ----------

export const SHIRT_VIEW = 1000;

/**
 * Flat front view of a tee. The design is composited on the chest. Preview only;
 * the print file itself is transparent-background art from buildDesignContent.
 */
export function buildMockupSVG(shirtHex: string, designContent: string): string {
  const dw = 400;
  const dh = (dw * PRINT_H) / PRINT_W; // keep design aspect
  const dx = (SHIRT_VIEW - dw) / 2;
  const dy = 285;
  // prettier-ignore
  const shirtPath =
    'M 385 92 ' + // left collar
    'C 415 178 585 178 615 92 ' + // collar scoop
    'L 762 138 ' + // right shoulder
    'C 800 152 838 196 872 262 ' + // right sleeve outer
    'L 902 320 L 796 388 L 724 316 ' + // sleeve hem + armpit
    'L 722 892 ' + // body right
    'Q 722 914 700 914 L 300 914 Q 278 914 278 892 ' + // hem
    'L 276 316 L 204 388 L 98 320 L 128 262 ' + // left sleeve
    'C 162 196 200 152 238 138 Z';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SHIRT_VIEW} ${SHIRT_VIEW}">
  <defs>
    <linearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#000" stop-opacity="0.14"/>
      <stop offset="0.25" stop-color="#000" stop-opacity="0.03"/>
      <stop offset="1" stop-color="#000" stop-opacity="0.10"/>
    </linearGradient>
    <clipPath id="teeclip"><path d="${shirtPath}"/></clipPath>
  </defs>
  <path d="${shirtPath}" fill="${shirtHex}"/>
  <path d="${shirtPath}" fill="url(#shade)"/>
  <g clip-path="url(#teeclip)">
    <svg x="${dx}" y="${dy}" width="${dw}" height="${dh}" viewBox="0 0 ${PRINT_W} ${PRINT_H}">${designContent}</svg>
    <path d="M 385 92 C 415 178 585 178 615 92 L 596 84 C 572 152 428 152 404 84 Z" fill="#000" fill-opacity="0.18"/>
  </g>
  <path d="${shirtPath}" fill="none" stroke="#000" stroke-opacity="0.22" stroke-width="3"/>
</svg>`;
}
