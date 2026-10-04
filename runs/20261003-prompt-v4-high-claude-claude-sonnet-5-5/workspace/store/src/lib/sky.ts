// Server-side renderer: computes the real sky for a moment/place and emits a print-ready SVG.
// Text is converted to outlines, so the output has no font dependency (browser, sharp, anywhere).
//
// DTG print rules baked in: transparent background (shirt colour shows through), solid fills only
// (no gradients / semi-transparent pixels, which print poorly on dark garments), and a minimum
// feature size of ~0.6mm at 300dpi.
import fs from "node:fs";
import path from "node:path";
import * as Astronomy from "astronomy-engine";
import { parse as parseFont } from "opentype.js";
import { INKS, SHIRT_COLORS, inksFor } from "./catalog";
import type { Design } from "./design";

export const CANVAS_W = 4677;
export const CANVAS_H = 5881;

const root = process.cwd();
const readJson = (f: string) => JSON.parse(fs.readFileSync(path.join(root, "data", f), "utf8"));
const loadFont = (f: string) => {
  const b = fs.readFileSync(path.join(root, "fonts", f));
  return parseFont(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
};

let cache: any;
function assets() {
  if (!cache) {
    cache = {
      stars: readJson("stars.json") as [number, number, number][],
      lines: readJson("constellation-lines.json") as [number, number][][],
      display: loadFont("DMSerifDisplay-Regular.ttf"),
      italic: loadFont("DMSerifDisplay-Italic.ttf"),
      semi: loadFont("Barlow-SemiBold.ttf"),
      medium: loadFont("Barlow-Medium.ttf"),
    };
  }
  return cache as {
    stars: [number, number, number][];
    lines: [number, number][][];
    display: any; italic: any; semi: any; medium: any;
  };
}

// ---------- time ----------
function tzOffsetMs(utcMs: number, tz: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    }).formatToParts(new Date(utcMs)).map((p) => [p.type, p.value]),
  );
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return asUtc - Math.floor(utcMs / 1000) * 1000;
}

export function localToUtc(date: string, time: string, tz: string) {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = (time || "21:00").split(":").map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const t1 = guess - tzOffsetMs(guess, tz);
  return new Date(guess - tzOffsetMs(t1, tz));
}

// ---------- astronomy ----------
const rad = Math.PI / 180;

function makeSky(d: Design) {
  const when = localToUtc(d.date, d.time, d.place.tz);
  const time = Astronomy.MakeTime(when);
  const observer = new Astronomy.Observer(d.place.lat, d.place.lon, 0);
  const lst = Astronomy.SiderealTime(time) * 15 + d.place.lon; // degrees
  const sinLat = Math.sin(d.place.lat * rad), cosLat = Math.cos(d.place.lat * rad);
  const prec = Astronomy.Rotation_EQJ_EQD(time);

  // RA/Dec of date (degrees) -> altitude/azimuth (degrees, azimuth from north through east)
  const altAz = (raDeg: number, decDeg: number) => {
    const ha = (lst - raDeg) * rad, dec = decDeg * rad;
    const sinAlt = sinLat * Math.sin(dec) + cosLat * Math.cos(dec) * Math.cos(ha);
    const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt))) / rad;
    const az = Math.atan2(-Math.cos(dec) * Math.sin(ha), Math.sin(dec) * cosLat - Math.cos(dec) * sinLat * Math.cos(ha)) / rad;
    return { alt, az: (az + 360) % 360 };
  };
  const fromJ2000 = (raDeg: number, decDeg: number) => {
    const ra = raDeg * rad, dec = decDeg * rad;
    const v = Astronomy.RotateVector(prec, new Astronomy.Vector(Math.cos(dec) * Math.cos(ra), Math.cos(dec) * Math.sin(ra), Math.sin(dec), time));
    return altAz(((Math.atan2(v.y, v.x) / rad) + 360) % 360, Math.asin(Math.max(-1, Math.min(1, v.z))) / rad);
  };
  const body = (b: Astronomy.Body) => {
    const e = Astronomy.Equator(b, time, observer, true, true);
    return altAz(e.ra * 15, e.dec);
  };
  return { fromJ2000, body, time };
}

// ---------- text -> outlines ----------
type Anchor = "middle" | "start" | "end";
const n1 = (v: number) => String(Math.round(v * 10) / 10);
// opentype.js 2.0's toPathData can emit NaN for some offsets, so serialise commands directly.
function pathData(cmds: any[]) {
  let d = "";
  for (const c of cmds) {
    if (c.type === "M" || c.type === "L") d += `${c.type}${n1(c.x)} ${n1(c.y)}`;
    else if (c.type === "Q") d += `Q${n1(c.x1)} ${n1(c.y1)} ${n1(c.x)} ${n1(c.y)}`;
    else if (c.type === "C") d += `C${n1(c.x1)} ${n1(c.y1)} ${n1(c.x2)} ${n1(c.y2)} ${n1(c.x)} ${n1(c.y)}`;
    else if (c.type === "Z") d += "Z";
  }
  return d;
}
function kern(font: any, a: any, b: any) {
  const k = font.getKerningValue(a, b);
  return Number.isFinite(k) ? k : 0;
}
function measure(font: any, text: string, size: number, tracking: number) {
  const glyphs = font.stringToGlyphs(text);
  const scale = size / font.unitsPerEm;
  let w = 0;
  glyphs.forEach((g: any, i: number) => {
    w += g.advanceWidth * scale + tracking * size;
    if (glyphs[i + 1]) w += kern(font, g, glyphs[i + 1]) * scale;
  });
  return w - tracking * size;
}
function textPath(font: any, text: string, x: number, y: number, size: number, tracking: number, fill: string, anchor: Anchor = "middle") {
  if (!text) return "";
  const glyphs = font.stringToGlyphs(text);
  const scale = size / font.unitsPerEm;
  const w = measure(font, text, size, tracking);
  let cx = anchor === "middle" ? x - w / 2 : anchor === "end" ? x - w : x;
  let d = "";
  glyphs.forEach((g: any, i: number) => {
    d += pathData(g.getPath(cx, y, size).commands);
    cx += g.advanceWidth * scale + tracking * size;
    if (glyphs[i + 1]) cx += kern(font, g, glyphs[i + 1]) * scale;
  });
  return `<path d="${d}" fill="${fill}"/>`;
}
function fitSize(font: any, text: string, maxSize: number, minSize: number, maxWidth: number, tracking: number) {
  const w1 = measure(font, text, 100, tracking);
  return Math.max(minSize, Math.min(maxSize, (maxWidth / w1) * 100));
}

const MONTHS = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
export function formatDate(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}
export function formatTime(time: string) {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}
function formatCoord(v: number, pos: string, neg: string) {
  const a = Math.abs(v);
  let deg = Math.floor(a), min = Math.round((a - deg) * 60);
  if (min === 60) { deg += 1; min = 0; }
  return `${deg}°${String(min).padStart(2, "0")}′${v >= 0 ? pos : neg}`;
}

const f1 = (n: number) => Math.round(n * 10) / 10;

// ---------- the design ----------
export function renderDesignInner(d: Design): string {
  const A = assets();
  const sky = makeSky(d);
  const ink = INKS.find((i) => i.id === d.ink) ?? inksFor(d.shirt)[0] ?? INKS[0];
  const main = ink.main, accent = ink.accent;

  const CX = CANVAS_W / 2, CY = 2470, R = 1690;
  const proj = (alt: number, az: number) => {
    const r = (R * (90 - alt)) / 90;
    return { x: CX - r * Math.sin(az * rad), y: CY - r * Math.cos(az * rad) };
  };

  const out: string[] = [];
  out.push(`<defs><clipPath id="sky"><circle cx="${CX}" cy="${CY}" r="${R - 6}"/></clipPath></defs>`);

  // Solar-system bodies first (so stars can avoid them).
  type Obj = { x: number; y: number; r: number };
  const keepOut: Obj[] = [];
  const bodies: string[] = [];
  const moonAlt = sky.body(Astronomy.Body.Moon);
  const sunAlt = sky.body(Astronomy.Body.Sun);

  if (sunAlt.alt > 3) {
    const p = proj(sunAlt.alt, sunAlt.az);
    let s = `<circle cx="${f1(p.x)}" cy="${f1(p.y)}" r="52" fill="${accent}"/>`;
    for (let i = 0; i < 12; i++) {
      const a = (i * 30 * Math.PI) / 180;
      s += `<line x1="${f1(p.x + Math.cos(a) * 74)}" y1="${f1(p.y + Math.sin(a) * 74)}" x2="${f1(p.x + Math.cos(a) * 112)}" y2="${f1(p.y + Math.sin(a) * 112)}" stroke="${accent}" stroke-width="11" stroke-linecap="round"/>`;
    }
    bodies.push(s);
    keepOut.push({ x: p.x, y: p.y, r: 135 });
  }

  const planetSpec: [Astronomy.Body, number][] = [
    [Astronomy.Body.Venus, 34], [Astronomy.Body.Jupiter, 30], [Astronomy.Body.Mars, 25],
    [Astronomy.Body.Saturn, 25], [Astronomy.Body.Mercury, 20],
  ];
  for (const [b, r] of planetSpec) {
    const h = sky.body(b);
    if (h.alt < 3) continue;
    const p = proj(h.alt, h.az);
    bodies.push(
      `<circle cx="${f1(p.x)}" cy="${f1(p.y)}" r="${r}" fill="${accent}"/>` +
        `<circle cx="${f1(p.x)}" cy="${f1(p.y)}" r="${r + 22}" fill="none" stroke="${accent}" stroke-width="7"/>`,
    );
    keepOut.push({ x: p.x, y: p.y, r: r + 38 });
  }

  if (moonAlt.alt > 3) {
    const p = proj(moonAlt.alt, moonAlt.az);
    const mr = 96;
    const frac = Astronomy.Illumination(Astronomy.Body.Moon, sky.time).phase_fraction;
    const sp = proj(sunAlt.alt, sunAlt.az);
    const theta = (Math.atan2(sp.y - p.y, sp.x - p.x) / rad) || 0; // bright limb faces the Sun
    const rx = Math.abs(1 - 2 * frac) * mr;
    const sweep = frac < 0.5 ? 0 : 1;
    let lit = "";
    if (frac > 0.02) {
      lit = `<path d="M0 ${-mr}A${mr} ${mr} 0 0 1 0 ${mr}A${f1(rx)} ${mr} 0 0 ${sweep} 0 ${-mr}Z" fill="${accent}"/>`;
    }
    bodies.push(
      `<g transform="translate(${f1(p.x)} ${f1(p.y)}) rotate(${f1(theta)})">` +
        `<circle r="${mr}" fill="none" stroke="${accent}" stroke-width="9"/>${lit}</g>`,
    );
    keepOut.push({ x: p.x, y: p.y, r: mr + 32 });
  }

  // Constellation lines
  if (d.lines) {
    let seg = "";
    for (const poly of A.lines) {
      const pts = poly.map(([ra, dec]) => {
        const h = sky.fromJ2000(ra, dec);
        return { ...proj(h.alt, h.az), alt: h.alt };
      });
      for (let i = 0; i < pts.length - 1; i++) {
        if (pts[i].alt < 0 && pts[i + 1].alt < 0) continue;
        seg += `M${f1(pts[i].x)} ${f1(pts[i].y)}L${f1(pts[i + 1].x)} ${f1(pts[i + 1].y)}`;
      }
    }
    out.push(`<g clip-path="url(#sky)"><path d="${seg}" fill="none" stroke="${main}" stroke-width="7" stroke-linecap="round"/></g>`);
  }

  // Stars
  let dots = "";
  for (const [ra, dec, mag] of A.stars) {
    if (mag > 5.0) break; // sorted brightest first
    const h = sky.fromJ2000(ra, dec);
    if (h.alt < 0.5) continue;
    const p = proj(h.alt, h.az);
    if (keepOut.some((o) => Math.hypot(o.x - p.x, o.y - p.y) < o.r)) continue;
    const r = 6.5 + 28 * Math.pow(10, -0.28 * (mag + 1.5));
    dots += `<circle cx="${f1(p.x)}" cy="${f1(p.y)}" r="${f1(r)}"/>`;
  }
  out.push(`<g clip-path="url(#sky)" fill="${main}">${dots}</g>`);
  out.push(...bodies.map((b) => `<g clip-path="url(#sky)">${b}</g>`));

  // Frame: horizon ring, outer ring, compass ticks, cardinal letters
  const ro = R + 78;
  out.push(`<circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="${main}" stroke-width="12"/>`);
  out.push(`<circle cx="${CX}" cy="${CY}" r="${ro}" fill="none" stroke="${main}" stroke-width="5"/>`);
  let ticks = "";
  for (let a = 0; a < 360; a += 5) {
    const major = a % 45 === 0;
    const len = major ? 58 : 26;
    const s = Math.sin(a * rad), c = Math.cos(a * rad);
    ticks += `M${f1(CX + s * ro)} ${f1(CY - c * ro)}L${f1(CX + s * (ro - len))} ${f1(CY - c * (ro - len))}`;
  }
  out.push(`<path d="${ticks}" stroke="${accent}" stroke-width="7" fill="none"/>`);
  const cardR = ro + 62, cs = 104;
  const capH = cs * 0.7;
  out.push(textPath(A.semi, "N", CX, CY - cardR, cs, 0, main));
  out.push(textPath(A.semi, "S", CX, CY + cardR + capH, cs, 0, main));
  out.push(textPath(A.semi, "E", CX - cardR - 20, CY + capH / 2, cs, 0, main, "end"));
  out.push(textPath(A.semi, "W", CX + cardR + 20, CY + capH / 2, cs, 0, main, "start"));

  // Text block
  const title = (d.title || "").toUpperCase();
  let y = CY + R + 78 + 62 + cs * 0.7 + 380;
  if (title) {
    const size = fitSize(A.display, title, 340, 150, 4000, 0.04);
    out.push(textPath(A.display, title, CX, y, size, 0.04, main));
  }
  y += 215;
  const when = [formatDate(d.date), formatTime(d.time)].filter(Boolean).join("   ·   ");
  out.push(textPath(A.semi, when, CX, y, fitSize(A.semi, when, 120, 70, 3700, 0.24), 0.24, accent));
  y += 150;
  const placeLine = [d.place.name, d.place.cc && (new Intl.DisplayNames(["en"], { type: "region" }).of(d.place.cc) ?? "")]
    .filter(Boolean).join(", ").toUpperCase();
  if (placeLine) out.push(textPath(A.medium, placeLine, CX, y, fitSize(A.medium, placeLine, 100, 60, 3700, 0.22), 0.22, main));
  y += 118;
  const coords = `${formatCoord(d.place.lat, "N", "S")}   ${formatCoord(d.place.lon, "E", "W")}`;
  out.push(textPath(A.medium, coords, CX, y, 80, 0.2, main));
  if (d.caption) {
    y += 230;
    out.push(textPath(A.italic, d.caption, CX, y, fitSize(A.italic, d.caption, 190, 110, 3900, 0.01), 0.01, accent));
  }
  return out.join("");
}

export function renderDesignSvg(d: Design): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS_W}" height="${CANVAS_H}" viewBox="0 0 ${CANVAS_W} ${CANVAS_H}">${renderDesignInner(d)}</svg>`;
}

// ---------- shirt mockup (preview only, never sent to the printer) ----------
export function renderMockupSvg(d: Design, opts: { background?: boolean } = {}): string {
  const shirt = SHIRT_COLORS.find((s) => s.id === d.shirt) ?? SHIRT_COLORS[0];
  const body =
    "M395 78C440 150 560 150 605 78L790 118Q830 128 855 160L960 330L845 405L765 318L765 940Q500 968 235 940L235 318L155 405L40 330L145 160Q170 128 210 118Z";
  const shade = shirt.dark ? "#000" : "#3a2f1c";
  const printW = 413, printH = (printW * CANVAS_H) / CANVAS_W;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="1000" height="1000">
${opts.background ? `<rect width="1000" height="1000" fill="#ece7dc"/>` : ""}
<defs>
<linearGradient id="sideShade" x1="0" x2="1" y1="0" y2="0">
<stop offset="0" stop-color="${shade}" stop-opacity=".22"/><stop offset=".2" stop-color="${shade}" stop-opacity=".04"/>
<stop offset=".5" stop-color="#fff" stop-opacity=".04"/><stop offset=".8" stop-color="${shade}" stop-opacity=".04"/>
<stop offset="1" stop-color="${shade}" stop-opacity=".24"/></linearGradient>
<linearGradient id="vShade" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".06"/><stop offset=".75" stop-color="${shade}" stop-opacity="0"/><stop offset="1" stop-color="${shade}" stop-opacity=".16"/></linearGradient>
<radialGradient id="fold" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="${shade}" stop-opacity=".10"/><stop offset="1" stop-color="${shade}" stop-opacity="0"/></radialGradient>
<clipPath id="shirtClip"><path d="${body}"/></clipPath>
</defs>
<ellipse cx="500" cy="958" rx="300" ry="16" fill="#000" opacity=".10"/>
<path d="${body}" fill="${shirt.hex}"/>
<g clip-path="url(#shirtClip)">
<rect width="1000" height="1000" fill="url(#sideShade)"/><rect width="1000" height="1000" fill="url(#vShade)"/>
<path d="M40 330L145 160L210 118L235 318L155 405Z" fill="${shade}" fill-opacity=".07"/>
<path d="M960 330L855 160L790 118L765 318L845 405Z" fill="${shade}" fill-opacity=".07"/>
<ellipse cx="300" cy="760" rx="120" ry="60" fill="url(#fold)"/>
<ellipse cx="720" cy="700" rx="110" ry="50" fill="url(#fold)"/>
<path d="M235 318Q215 250 210 118M765 318Q785 250 790 118" stroke="${shade}" stroke-opacity=".28" stroke-width="2.5" fill="none"/>
<path d="M240 916H760" stroke="${shade}" stroke-opacity=".22" stroke-width="2" stroke-dasharray="7 5" fill="none"/>
</g>
<path d="M395 78C440 40 560 40 605 78C560 150 440 150 395 78Z" fill="${shirt.hex}"/>
<path d="M395 78C440 40 560 40 605 78C560 150 440 150 395 78Z" fill="${shade}" fill-opacity=".45"/>
<path d="M395 78C440 150 560 150 605 78" fill="none" stroke="${shirt.hex}" stroke-width="22" stroke-linecap="round"/>
<path d="M395 78C440 150 560 150 605 78" fill="none" stroke="${shade}" stroke-opacity=".18" stroke-width="22" stroke-linecap="round"/>
<path d="M402 92C448 160 552 160 598 92" fill="none" stroke="#fff" stroke-opacity=".12" stroke-width="2"/>
<svg x="${500 - printW / 2}" y="158" width="${printW}" height="${f1(printH)}" viewBox="0 0 ${CANVAS_W} ${CANVAS_H}">${renderDesignInner(d)}</svg>
</svg>`;
}
