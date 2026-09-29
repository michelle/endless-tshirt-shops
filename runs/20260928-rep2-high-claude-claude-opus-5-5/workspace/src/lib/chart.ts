// Renders a design to an SVG string. Pure + deterministic so the browser preview
// and the print file sent to Prodigi are byte-for-byte the same artwork.
import {
  Body, Equator, HorizonFromVector, Illumination, MakeTime, Observer, RotateVector,
  Rotation_EQJ_HOR, Vector, type AstroTime, type RotationMatrix,
} from "astronomy-engine";
import sky from "@/data/sky.json";
import { SHIRTS, formatCoords, formatWhen, zonedToUtc, type Design } from "./design";

// Artboard matches Prodigi's GLOBAL-TEE-BC-3001 front print area (4680 x 5790 px) ratio.
export const ART_W = 1000;
export const ART_H = 1237;
export const PRINT_W = 4680;
export const PRINT_H = 5790;

const CX = 500;
const CY = 478;
const R = 410;
const MAG_LIMIT = 5.4; // DTG can't hold dots much smaller than ~0.5 mm

type Palette = { ink: string; dim: string; faint: string; accent: string };

// Solid colours only (no opacity): semi-transparent ink prints poorly over a DTG white underbase.
const PALETTES: Record<"light" | "dark", (fabric: string) => Palette> = {
  light: (fabric) => ({ ink: "#f6eedd", dim: mix("#f6eedd", fabric, 0.55), faint: mix("#f6eedd", fabric, 0.32), accent: "#e8c27a" }),
  dark: (fabric) => ({ ink: "#18233a", dim: mix("#18233a", fabric, 0.62), faint: mix("#18233a", fabric, 0.38), accent: "#a35a1f" }),
};

function mix(a: string, b: string, t: number) {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return "#" + x.map((v, i) => Math.round(v * t + y[i] * (1 - t)).toString(16).padStart(2, "0")).join("");
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const f1 = (n: number) => (Math.round(n * 10) / 10).toString();

type Pt = { x: number; y: number; alt: number };

function makeProjector(time: AstroTime, observer: Observer) {
  const rot: RotationMatrix = Rotation_EQJ_HOR(time, observer);
  const d2r = Math.PI / 180;
  const fromEqj = (v: Vector): Pt => {
    const hor = HorizonFromVector(RotateVector(rot, v), "normal");
    const alt = hor.lat;
    const az = hor.lon * d2r;
    // Stereographic projection centred on the zenith: horizon lands on r = 1.
    const zen = Math.min(90 - alt, 170) * d2r;
    const r = Math.tan(zen / 2) * R;
    // Looking up: north at top, east on the left.
    return { x: CX - r * Math.sin(az), y: CY - r * Math.cos(az), alt };
  };
  const fromRaDec = (raDeg: number, decDeg: number): Pt => {
    const ra = raDeg * d2r;
    const dec = decDeg * d2r;
    const c = Math.cos(dec);
    return fromEqj(new Vector(c * Math.cos(ra), c * Math.sin(ra), Math.sin(dec), time));
  };
  return { fromEqj, fromRaDec };
}

export type ChartInfo = { visibleStars: number; moonIllumination: number; planetsUp: string[] };

export function renderSvg(design: Design): { svg: string; info: ChartInfo } {
  const shirt = SHIRTS[design.shirt];
  const pal = PALETTES[shirt.ink](shirt.fabric);
  const utc = zonedToUtc(design.when, design.tz);
  const time = MakeTime(utc);
  const observer = new Observer(design.lat, design.lon, 0);
  const P = makeProjector(time, observer);
  const out: string[] = [];
  const info: ChartInfo = { visibleStars: 0, moonIllumination: 0, planetsUp: [] };

  // ---------- chart frame ----------
  const frame: string[] = [];
  frame.push(`<circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="${pal.ink}" stroke-width="2.4"/>`);
  frame.push(`<circle cx="${CX}" cy="${CY}" r="${R + 16}" fill="none" stroke="${pal.dim}" stroke-width="1.1"/>`);
  for (let a = 0; a < 360; a += 5) {
    const major = a % 15 === 0;
    const t = (a * Math.PI) / 180;
    const r1 = R + 2;
    const r2 = R + (major ? 16 : 8);
    frame.push(
      `<line x1="${f1(CX - r1 * Math.sin(t))}" y1="${f1(CY - r1 * Math.cos(t))}" x2="${f1(CX - r2 * Math.sin(t))}" y2="${f1(CY - r2 * Math.cos(t))}" stroke="${major ? pal.ink : pal.dim}" stroke-width="${major ? 1.4 : 1}"/>`,
    );
  }
  const cardinal: [string, number][] = [["N", 0], ["E", 90], ["S", 180], ["W", 270]];
  for (const [label, a] of cardinal) {
    const t = (a * Math.PI) / 180;
    const r = R + 38;
    frame.push(
      `<text x="${f1(CX - r * Math.sin(t))}" y="${f1(CY - r * Math.cos(t) + 8)}" font-family="Jost" font-weight="500" font-size="22" fill="${pal.ink}" text-anchor="middle">${label}</text>`,
    );
  }

  const inner: string[] = [];

  // ---------- graticule ----------
  if (design.layers.grid) {
    const paths: string[] = [];
    const addLine = (pts: Pt[]) => {
      let seg: string[] = [];
      const flush = () => {
        if (seg.length > 1) paths.push("M" + seg.join("L"));
        seg = [];
      };
      for (const p of pts) {
        if (p.alt > -35) seg.push(`${f1(p.x)},${f1(p.y)}`);
        else flush();
      }
      flush();
    };
    for (let dec = -60; dec <= 60; dec += 30) {
      const pts: Pt[] = [];
      for (let ra = 0; ra <= 360; ra += 2) pts.push(P.fromRaDec(ra, dec));
      addLine(pts);
    }
    for (let ra = 0; ra < 360; ra += 30) {
      const pts: Pt[] = [];
      for (let dec = -80; dec <= 80; dec += 2) pts.push(P.fromRaDec(ra, dec));
      addLine(pts);
    }
    inner.push(`<path d="${paths.join("")}" fill="none" stroke="${pal.faint}" stroke-width="0.9" stroke-dasharray="3 4"/>`);
  }

  // ---------- constellation lines ----------
  if (design.layers.lines) {
    const paths: string[] = [];
    for (const c of sky.lines) {
      for (const line of c.lines) {
        let seg: string[] = [];
        const flush = () => {
          if (seg.length > 1) paths.push("M" + seg.join("L"));
          seg = [];
        };
        for (let i = 0; i < line.length; i += 2) {
          const p = P.fromRaDec(line[i], line[i + 1]);
          if (p.alt > -30) seg.push(`${f1(p.x)},${f1(p.y)}`);
          else flush();
        }
        flush();
      }
    }
    inner.push(`<path d="${paths.join("")}" fill="none" stroke="${pal.dim}" stroke-width="1.3" stroke-linejoin="round" stroke-linecap="round"/>`);
  }

  // ---------- stars ----------
  const stars: string[] = [];
  const sparkles: string[] = [];
  const s = sky.stars;
  for (let i = 0; i < s.length; i += 3) {
    const mag = s[i + 2];
    if (mag > MAG_LIMIT) break; // catalogue is sorted by magnitude
    const p = P.fromRaDec(s[i], s[i + 1]);
    if (p.alt < -1) continue;
    info.visibleStars++;
    const r = Math.max(1.05, 1.05 + (MAG_LIMIT - mag) * 0.62);
    stars.push(`M${f1(p.x - r)},${f1(p.y)}a${f1(r)},${f1(r)} 0 1,0 ${f1(2 * r)},0a${f1(r)},${f1(r)} 0 1,0 -${f1(2 * r)},0`);
    if (mag < 1.2) {
      const L = r * 3.2;
      const w = r * 0.28;
      sparkles.push(
        `M${f1(p.x)},${f1(p.y - L)}L${f1(p.x + w)},${f1(p.y - w)}L${f1(p.x + L)},${f1(p.y)}L${f1(p.x + w)},${f1(p.y + w)}L${f1(p.x)},${f1(p.y + L)}L${f1(p.x - w)},${f1(p.y + w)}L${f1(p.x - L)},${f1(p.y)}L${f1(p.x - w)},${f1(p.y - w)}Z`,
      );
    }
  }
  inner.push(`<path d="${sparkles.join("")}" fill="${pal.ink}"/>`);
  inner.push(`<path d="${stars.join("")}" fill="${pal.ink}"/>`);

  // ---------- constellation names ----------
  if (design.layers.names) {
    for (const n of sky.names) {
      if (n.rank > 2) continue;
      const p = P.fromRaDec(n.at[0], n.at[1]);
      if (p.alt < 8) continue;
      inner.push(
        `<text x="${f1(p.x)}" y="${f1(p.y)}" font-family="Jost" font-size="10.5" letter-spacing="1.6" fill="${pal.dim}" text-anchor="middle">${esc(n.name.toUpperCase())}</text>`,
      );
    }
  }

  // ---------- Moon + planets ----------
  if (design.layers.planets) {
    const sun = P.fromEqj(Equator(Body.Sun, time, observer, false, true).vec);
    const planets: [Body, string][] = [
      [Body.Mercury, "Mercury"], [Body.Venus, "Venus"], [Body.Mars, "Mars"], [Body.Jupiter, "Jupiter"], [Body.Saturn, "Saturn"],
    ];
    for (const [body, name] of planets) {
      const p = P.fromEqj(Equator(body, time, observer, false, true).vec);
      if (p.alt < 0) continue;
      info.planetsUp.push(name);
      inner.push(`<circle cx="${f1(p.x)}" cy="${f1(p.y)}" r="4.2" fill="${pal.accent}"/>`);
      inner.push(`<circle cx="${f1(p.x)}" cy="${f1(p.y)}" r="8" fill="none" stroke="${pal.accent}" stroke-width="1.1"/>`);
      inner.push(
        `<text x="${f1(p.x + 12)}" y="${f1(p.y + 4)}" font-family="Cormorant Garamond" font-style="italic" font-weight="500" font-size="14" fill="${pal.accent}">${name}</text>`,
      );
    }
    const moon = P.fromEqj(Equator(Body.Moon, time, observer, false, true).vec);
    const illum = Illumination(Body.Moon, time);
    info.moonIllumination = Math.round(((1 + Math.cos((illum.phase_angle * Math.PI) / 180)) / 2) * 100);
    if (moon.alt > 0) {
      const mr = 13;
      const angle = (Math.atan2(sun.y - moon.y, sun.x - moon.x) * 180) / Math.PI;
      const pa = (illum.phase_angle * Math.PI) / 180;
      const rx = Math.abs(Math.cos(pa)) * mr;
      const gibbous = illum.phase_angle < 90 ? 1 : 0;
      inner.push(
        `<g transform="translate(${f1(moon.x)},${f1(moon.y)}) rotate(${f1(angle)})">` +
          `<circle r="${mr}" fill="none" stroke="${pal.accent}" stroke-width="1.2"/>` +
          `<path d="M0,${-mr}A${mr},${mr} 0 0,1 0,${mr}A${f1(rx)},${mr} 0 0,${gibbous} 0,${-mr}Z" fill="${pal.accent}"/>` +
          `</g>`,
      );
    }
  }

  out.push(`<defs><clipPath id="sky"><circle cx="${CX}" cy="${CY}" r="${R - 1.5}"/></clipPath></defs>`);
  out.push(`<g clip-path="url(#sky)">${inner.join("")}</g>`);
  out.push(frame.join(""));

  // ---------- typography ----------
  const ty = CY + R + 108;
  out.push(
    `<text x="${CX}" y="${ty}" font-family="Cormorant Garamond" font-weight="600" font-size="${titleSize(design.title)}" fill="${pal.ink}" text-anchor="middle">${esc(design.title)}</text>`,
  );
  let y = ty + 50;
  if (design.message) {
    out.push(
      `<text x="${CX}" y="${y}" font-family="Cormorant Garamond" font-style="italic" font-weight="500" font-size="31" fill="${pal.ink}" text-anchor="middle">${esc(design.message)}</text>`,
    );
    y += 34;
  }
  out.push(`<line x1="${CX - 40}" y1="${y}" x2="${CX + 40}" y2="${y}" stroke="${pal.accent}" stroke-width="1.6"/>`);
  y += 40;
  const meta = [design.place.toUpperCase(), formatWhen(design.when).toUpperCase(), formatCoords(design.lat, design.lon)].filter(Boolean);
  for (const line of meta) {
    out.push(
      `<text x="${CX}" y="${y}" font-family="Jost" font-size="19" letter-spacing="4" fill="${mix(pal.ink, shirt.fabric, 0.8)}" text-anchor="middle" xml:space="preserve">${esc(line)}</text>`,
    );
    y += 31;
  }

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ART_W} ${ART_H}" width="${ART_W}" height="${ART_H}">` +
    out.join("") + `</svg>`;
  return { svg, info };
}

function titleSize(title: string) {
  // Shrink long titles so they stay inside the print area (≈ 0.52 em average glyph width).
  const max = 900;
  return Math.min(68, Math.floor(max / (Math.max(title.length, 1) * 0.5)));
}
