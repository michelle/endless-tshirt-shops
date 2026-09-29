// Renders a Design to SVG. The same function drives the live browser preview
// and the server-side print file, so what the customer sees is what gets printed.

import { colorByKey } from "./catalog";
import { Design, formatCoords, formatMomentDate, formatMomentTime, paletteFor, zonedTimeToUtc } from "./design";
import { computeSky } from "./sky";

// Print canvas: Prodigi's front print area for GLOBAL-TEE-BC-3001 (≈12" × 14.8").
export const ART_W = 4680;
export const ART_H = 5790;

const CX = ART_W / 2;
const CY = 2250;
const R = 1860;

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const n = (v: number) => Math.round(v * 10) / 10;

const starRadius = (mag: number) => 6 + 4.6 * Math.pow(Math.max(0, 5.4 - mag), 1.3);

function sparkle(x: number, y: number, len: number, w: number): string {
  return `M${n(x)},${n(y - len)}L${n(x + w)},${n(y)}L${n(x)},${n(y + len)}L${n(x - w)},${n(y)}Z` +
    `M${n(x - len)},${n(y)}L${n(x)},${n(y - w)}L${n(x + len)},${n(y)}L${n(x)},${n(y + w)}Z`;
}

function moonPath(r: number, fraction: number): string {
  const rx = Math.abs(1 - 2 * fraction) * r;
  const sweep = fraction > 0.5 ? 1 : 0;
  return `M0,${-r}A${r},${r} 0 0 1 0,${r}A${n(rx)},${r} 0 0 ${sweep} 0,${-r}Z`;
}

/** Inner SVG markup (no <svg> wrapper) for the print artwork, in a 4680×5790 space. */
export function renderArtBody(d: Design, idPrefix = "a"): string {
  const pal = paletteFor(d);
  const when = zonedTimeToUtc(d.date, d.time, d.tz);
  const sky = computeSky(when, d.lat, d.lon);
  const px = (x: number) => n(CX + x * R);
  const py = (y: number) => n(CY + y * R);
  const clip = `${idPrefix}-disc`;
  const out: string[] = [];

  out.push(`<defs><clipPath id="${clip}"><circle cx="${CX}" cy="${CY}" r="${R}"/></clipPath></defs>`);

  // Compass ring
  const ringOuter = R + 58;
  out.push(`<circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="${pal.ink}" stroke-width="12"/>`);
  out.push(`<circle cx="${CX}" cy="${CY}" r="${ringOuter}" fill="none" stroke="${pal.ink}" stroke-width="6"/>`);
  let ticks = "";
  for (let deg = 0; deg < 360; deg += 5) {
    const a = deg * (Math.PI / 180);
    const inner = deg % 15 === 0 ? R : ringOuter - 26;
    const s = Math.sin(a), c = Math.cos(a);
    ticks += `M${n(CX + s * inner)},${n(CY - c * inner)}L${n(CX + s * ringOuter)},${n(CY - c * ringOuter)}`;
  }
  out.push(`<path d="${ticks}" stroke="${pal.ink}" stroke-width="6" fill="none"/>`);
  const cardinal = (label: string, x: number, y: number) =>
    `<text x="${n(x)}" y="${n(y)}" font-family="Jost" font-weight="500" font-size="104" letter-spacing="8" text-anchor="middle" dominant-baseline="central" fill="${pal.ink}">${label}</text>`;
  const lr = ringOuter + 110;
  out.push(cardinal("N", CX, CY - lr), cardinal("S", CX, CY + lr), cardinal("E", CX - lr, CY), cardinal("W", CX + lr, CY));

  out.push(`<g clip-path="url(#${clip})">`);

  if (d.grid) {
    let g = "";
    for (const alt of [30, 60]) {
      const r = Math.tan(((90 - alt) / 2) * (Math.PI / 180)) * R;
      g += `<circle cx="${CX}" cy="${CY}" r="${n(r)}"/>`;
    }
    g += `<path d="M${CX},${CY - R}V${CY + R}M${CX - R},${CY}H${CX + R}"/>`;
    out.push(`<g fill="none" stroke="${pal.soft}" stroke-width="5" stroke-dasharray="18 22">${g}</g>`);
  }

  if (d.lines) {
    const dstr = sky.lines
      .map((run) => "M" + run.map(([x, y]) => `${px(x)},${py(y)}`).join("L"))
      .join("");
    out.push(`<path d="${dstr}" fill="none" stroke="${pal.accent}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`);
  }

  if (d.names) {
    for (const c of sky.names) {
      out.push(`<text x="${px(c.x)}" y="${py(c.y) + 70}" font-family="Jost" font-size="54" letter-spacing="10" text-anchor="middle" fill="${pal.soft}">${esc(c.name.toUpperCase())}</text>`);
    }
  }

  let dots = "";
  let flares = "";
  for (const s of sky.stars) {
    const r = starRadius(s.mag);
    const x = px(s.x), y = py(s.y);
    dots += `<circle cx="${x}" cy="${y}" r="${n(r)}"/>`;
    if (s.mag < 0.6) flares += sparkle(x, y, r * 2.6, r * 0.32);
  }
  out.push(`<g fill="${pal.ink}">${dots}<path d="${flares}"/></g>`);

  if (d.planets) {
    for (const p of sky.planets) {
      const x = px(p.x), y = py(p.y);
      out.push(
        `<circle cx="${x}" cy="${y}" r="30" fill="none" stroke="${pal.accent}" stroke-width="9"/>` +
        `<circle cx="${x}" cy="${y}" r="11" fill="${pal.accent}"/>` +
        `<text x="${n(x + 52)}" y="${n(y + 20)}" font-family="Jost" font-weight="500" font-size="60" letter-spacing="10" fill="${pal.accent}">${p.name.toUpperCase()}</text>`,
      );
    }
    if (sky.moon) {
      const m = sky.moon;
      const rot = (m.sunAngle * 180) / Math.PI;
      const rm = 78;
      out.push(
        `<g transform="translate(${px(m.x)},${py(m.y)})">` +
        `<circle r="${rm}" fill="none" stroke="${pal.accent}" stroke-width="7"/>` +
        (m.fraction > 0.01 ? `<path transform="rotate(${n(rot)})" d="${moonPath(rm, m.fraction)}" fill="${pal.accent}"/>` : "") +
        `</g>`,
      );
    }
  }
  out.push(`</g>`);

  // Words
  const title = d.title.toUpperCase();
  if (title) {
    const fs = Math.min(300, 4400 / (title.length * 0.82));
    out.push(`<text x="${CX}" y="4660" font-family="Cormorant Garamond" font-weight="600" font-size="${n(fs)}" letter-spacing="${n(fs * 0.14)}" text-anchor="middle" fill="${pal.ink}">${esc(title)}</text>`);
  }
  if (d.message) {
    const fs = Math.min(170, 4300 / (d.message.length * 0.42));
    out.push(`<text x="${CX}" y="4890" font-family="Cormorant Garamond" font-style="italic" font-weight="500" font-size="${n(fs)}" text-anchor="middle" fill="${pal.accent}">${esc(d.message)}</text>`);
  }
  out.push(
    `<path d="M${CX - 560},5025H${CX - 110}M${CX + 110},5025H${CX + 560}" stroke="${pal.soft}" stroke-width="6"/>` +
    `<path d="${sparkle(CX, 5025, 52, 14)}" fill="${pal.accent}"/>`,
  );
  const line = (text: string, y: number, size: number, weight: number, fill: string, spacing: number) => {
    const fs = Math.min(size, 4300 / Math.max(1, text.length * (0.62 + spacing)));
    return `<text x="${CX}" y="${y}" font-family="Jost" font-weight="${weight}" font-size="${n(fs)}" letter-spacing="${n(fs * spacing)}" text-anchor="middle" fill="${fill}">${esc(text)}</text>`;
  };
  if (d.place) out.push(line(d.place.toUpperCase(), 5240, 120, 500, pal.ink, 0.3));
  out.push(line(`${formatMomentDate(d.date)}  ·  ${formatMomentTime(d.time)}`.toUpperCase(), 5410, 100, 400, pal.soft, 0.24));
  out.push(line(formatCoords(d.lat, d.lon), 5560, 88, 400, pal.soft, 0.2));

  return out.join("");
}

/** Print-ready artwork: transparent background, exact print-area dimensions. */
export function renderArtSVG(d: Design, idPrefix = "a"): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${ART_W}" height="${ART_H}" viewBox="0 0 ${ART_W} ${ART_H}">${renderArtBody(d, idPrefix)}</svg>`;
}

export const SHIRT_PATH =
  "M390,70 Q500,150 610,70 L752,106 Q842,150 912,300 L816,380 L736,318 L740,902 Q500,918 260,902 L264,318 L184,380 L88,300 Q158,150 248,106 Z";

// Print placement on the mockup (≈12" wide on a size-L chest, ~3" below the collar).
const MOCK = { x: 350, y: 190, w: 300 };

/** A flat garment mockup with the artwork placed on the chest. */
/** Studio backdrop behind the mockup: light for dark garments, deeper for light ones. */
export function mockupBackdrop(d: Pick<Design, "color">): string {
  return colorByKey(d.color).dark ? "#ebe6dc" : "#c9c2b4";
}

export function renderMockupSVG(d: Design, idPrefix = "m", opts: { background?: string | false } = {}): string {
  const pal = paletteFor(d);
  const h = (MOCK.w * ART_H) / ART_W;
  const g = `${idPrefix}-shade`;
  const fill = opts.background === false ? null : opts.background ?? mockupBackdrop(d);
  const bg = fill ? `<rect width="1000" height="960" fill="${fill}"/>` : "";
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 960" width="1000" height="960">` +
    `<defs><linearGradient id="${g}" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="#fff" stop-opacity="0.07"/><stop offset="0.55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.16"/>` +
    `</linearGradient></defs>` +
    bg +
    `<path d="${SHIRT_PATH}" fill="${pal.shirt}"/>` +
    `<path d="M390,70 Q500,150 610,70 M372,76 Q500,176 628,76" fill="none" stroke="#000" stroke-opacity="0.18" stroke-width="5"/>` +
    `<path d="M264,318 L248,106 M736,318 L752,106" fill="none" stroke="#000" stroke-opacity="0.1" stroke-width="3"/>` +
    `<svg x="${MOCK.x}" y="${MOCK.y}" width="${MOCK.w}" height="${n(h)}" viewBox="0 0 ${ART_W} ${ART_H}">${renderArtBody(d, idPrefix)}</svg>` +
    `<path d="${SHIRT_PATH}" fill="url(#${g})"/>` +
    `</svg>`
  );
}
