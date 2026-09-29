import { STARS } from "./stars";
import { CONSTELLATIONS } from "./constellations";
import {
  julianDate,
  lstHours,
  toHorizontal,
  projectZenith,
  moonRaDec,
} from "./astronomy";

export interface StarMapOptions {
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM (24h, local) — optional
  lat: number;
  lng: number;
  title: string;
  names: string;
  message?: string;
  locationLabel: string;
  /** shirt color key, used to pick a palette */
  shirtColor?: string;
  /** include the moon when above the horizon */
  showMoon?: boolean;
}

export interface Palette {
  star: string;
  starBright: string;
  line: string;
  horizon: string;
  title: string;
  names: string;
  subtitle: string;
  moon: string;
  cardinal: string;
}

const DARK_PALETTE: Palette = {
  star: "#ffffff",
  starBright: "#fff6e0",
  line: "rgba(170,190,235,0.30)",
  horizon: "rgba(255,255,255,0.45)",
  title: "#f4ead2",
  names: "#e6c47a",
  subtitle: "rgba(244,234,210,0.82)",
  moon: "#f2e6c8",
  cardinal: "rgba(244,234,210,0.55)",
};

const LIGHT_PALETTE: Palette = {
  star: "#1b2a4a",
  starBright: "#0f1c38",
  line: "rgba(30,50,90,0.30)",
  horizon: "rgba(20,35,70,0.45)",
  title: "#1b2a4a",
  names: "#8a6a2a",
  subtitle: "rgba(30,45,80,0.82)",
  moon: "#3a4a6a",
  cardinal: "rgba(30,45,80,0.55)",
};

const LIGHT_SHIRTS = new Set([
  "white",
  "natural",
  "sand",
  "daisy",
  "light blue",
  "light pink",
  "heather grey",
  "sport grey",
  "ice grey",
]);

function paletteFor(shirtColor?: string): Palette {
  const c = (shirtColor || "black").toLowerCase();
  return LIGHT_SHIRTS.has(c) ? LIGHT_PALETTE : DARK_PALETTE;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function starRadius(mag: number): number {
  return Math.max(0.9, 1.0 + (3.5 - mag) * 0.72);
}

// Portrait canvas matching the Prodigi front print area (15.6" x 19.3").
const W = 1000;
const H = 1250;
const CX = 500;
const CY = 640;
const R = 360;

export function buildStarMapSvg(opts: StarMapOptions): string {
  const p = paletteFor(opts.shirtColor);

  const [y, mo, d] = opts.date.split("-").map(Number);
  let hh = 21;
  let mm = 0;
  if (opts.time) {
    const [th, tm] = opts.time.split(":").map(Number);
    if (!Number.isNaN(th)) hh = th;
    if (!Number.isNaN(tm)) mm = tm;
  }
  const local = new Date(Date.UTC(y, mo - 1, d, hh, mm, 0));
  const utc = new Date(local.getTime() - (opts.lng / 15) * 3600 * 1000);

  const jd = julianDate(utc);
  const lst = lstHours(jd, opts.lng);

  const projected: { x: number; y: number; mag: number; ra: number; dec: number }[] = [];
  for (const [ra, dec, mag] of STARS) {
    const h = toHorizontal(ra, dec, opts.lat, lst);
    if (h.alt <= 0) continue;
    const pt = projectZenith(h.alt, h.az);
    projected.push({ x: pt.x, y: pt.y, mag, ra, dec });
  }

  const px = (x: number) => CX + x * R;
  const py = (y: number) => CY + y * R;

  const starByCoord = new Map<string, { x: number; y: number }>();
  for (const s of projected) {
    starByCoord.set(`${s.ra.toFixed(2)},${s.dec.toFixed(2)}`, { x: s.x, y: s.y });
  }

  const lineEls: string[] = [];
  for (const con of CONSTELLATIONS) {
    for (const [ra1, dec1, ra2, dec2] of con.segments) {
      const a = starByCoord.get(`${ra1.toFixed(2)},${dec1.toFixed(2)}`);
      const b = starByCoord.get(`${ra2.toFixed(2)},${dec2.toFixed(2)}`);
      if (!a || !b) continue;
      lineEls.push(
        `<line x1="${px(a.x).toFixed(2)}" y1="${py(a.y).toFixed(2)}" x2="${px(b.x).toFixed(2)}" y2="${py(b.y).toFixed(2)}" stroke="${p.line}" stroke-width="1.1" stroke-linecap="round"/>`
      );
    }
  }

  const starEls: string[] = [];
  for (const s of projected) {
    const r = starRadius(s.mag);
    const color = s.mag < 0.5 ? p.starBright : p.star;
    const x = px(s.x);
    const y = py(s.y);
    if (s.mag < 0.5) {
      starEls.push(
        `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${(r * 2.4).toFixed(2)}" fill="${p.starBright}" opacity="0.18"/>`
      );
    }
    starEls.push(
      `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${r.toFixed(2)}" fill="${color}"/>`
    );
  }

  let moonEl = "";
  if (opts.showMoon !== false) {
    const moon = moonRaDec(jd);
    const h = toHorizontal(moon.ra, moon.dec, opts.lat, lst);
    if (h.alt > 0) {
      const pt = projectZenith(h.alt, h.az);
      const mx = px(pt.x);
      const my = py(pt.y);
      const mr = 9;
      moonEl = `<circle cx="${mx.toFixed(2)}" cy="${my.toFixed(2)}" r="${mr}" fill="${p.moon}" opacity="0.9"/>`;
    }
  }

  const cardinal = (label: string, angleDeg: number) => {
    const a = (angleDeg * Math.PI) / 180;
    const lx = CX + (R + 28) * Math.sin(a);
    const ly = CY - (R + 28) * Math.cos(a);
    return `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle" dominant-baseline="middle" font-family="Georgia, 'Times New Roman', serif" font-size="20" fill="${p.cardinal}" letter-spacing="2">${label}</text>`;
  };

  const title = escapeXml(opts.title || "The Night Sky");
  const names = escapeXml(opts.names || "");
  const message = escapeXml(opts.message || "");
  const loc = escapeXml(opts.locationLabel || "");

  const dateObj = new Date(Date.UTC(y, mo - 1, d));
  const dateStr = dateObj.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });

  const messageEl = message
    ? `<text x="${CX}" y="1160" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="22" font-style="italic" fill="${p.subtitle}">${message}</text>`
    : "";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <g>
    <text x="${CX}" y="110" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="54" fill="${p.title}" letter-spacing="3">${title}</text>
    ${names ? `<text x="${CX}" y="176" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="36" fill="${p.names}" letter-spacing="2">${names}</text>` : ""}
    <line x1="360" y1="205" x2="640" y2="205" stroke="${p.horizon}" stroke-width="1" opacity="0.5"/>
    <circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="${p.horizon}" stroke-width="1.6"/>
    <circle cx="${CX}" cy="${CY}" r="${R - 1}" fill="none" stroke="${p.horizon}" stroke-width="0.5" opacity="0.4"/>
    ${lineEls.join("\n    ")}
    ${starEls.join("\n    ")}
    ${moonEl}
    ${cardinal("N", 0)}
    ${cardinal("E", 90)}
    ${cardinal("S", 180)}
    ${cardinal("W", 270)}
    <text x="${CX}" y="1085" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="24" fill="${p.subtitle}" letter-spacing="1">${dateStr}</text>
    ${loc ? `<text x="${CX}" y="1120" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="20" fill="${p.subtitle}" letter-spacing="1">${loc}</text>` : ""}
    ${messageEl}
  </g>
</svg>`;

  return svg;
}
