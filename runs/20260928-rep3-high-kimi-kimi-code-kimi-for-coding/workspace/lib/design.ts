// Builds the Meridian shirt artwork as an SVG string.
// The artwork fills Prodigi's front print area for GLOBAL-TEE-BC-3001 (4680 x 5790 px
// recommended); we render at 0.6 scale (2808 x 3474) to stay within serverless limits.
// Interior of the disc is an honest sun-path chart: x = azimuth (E..W through S),
// y = elevation, horizon line with landscape below, sun/moon plotted for the actual moment.

import { solarPosition, sunPath, moonPosition, moonInfo, mulberry32, hashSeed, classifySky, type SkyKind } from "./solar";

export const PRINT_W = 2808;
export const PRINT_H = 3474;

export interface DesignParams {
  placeLabel: string;
  lat: number;
  lon: number;
  /** UTC instant of the moment */
  timeMs: number;
  /** IANA timezone name, used for display formatting */
  tz: string;
  caption?: string;
  /** true = light artwork (for dark shirts), false = dark artwork (for light shirts) */
  dark: boolean;
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const PALETTES: Record<
  SkyKind,
  { stops: [string, string][]; sun: string; halo: string; groundFar: string; groundNear: string; grid: string }
> = {
  day: {
    stops: [["0%", "#5ea6e0"], ["40%", "#a8d2f0"], ["70%", "#e2f0fa"], ["100%", "#fff0c8"]],
    sun: "#ffd76a", halo: "#fff3c4", groundFar: "#8aa9c4", groundNear: "#587798", grid: "#ffffff",
  },
  golden: {
    stops: [["0%", "#1d1a4b"], ["35%", "#6e3a6b"], ["65%", "#cf6a5f"], ["85%", "#ffab60"], ["100%", "#ffdd96"]],
    sun: "#ffdf8e", halo: "#fff0c0", groundFar: "#54355a", groundNear: "#2e2347", grid: "#ffe9c9",
  },
  night: {
    stops: [["0%", "#02060f"], ["55%", "#0a1430"], ["85%", "#16294f"], ["100%", "#24407c"]],
    sun: "#ffd76a", halo: "#fff3c4", groundFar: "#0c1734", groundNear: "#050a1c", grid: "#8fa3d9",
  },
};

function fmtCoords(lat: number, lon: number): string {
  const dms = (v: number, pos: string, neg: string) => {
    const a = Math.abs(v);
    const d = Math.floor(a);
    const m = Math.floor((a - d) * 60);
    return `${d}°${String(m).padStart(2, "0")}′${v >= 0 ? pos : neg}`;
  };
  return `${dms(lat, "N", "S")}  ${dms(lon, "E", "W")}`;
}

function fmtDateLine(timeMs: number, tz: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: tz, day: "2-digit", month: "long", year: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: false,
    }).formatToParts(new Date(timeMs));
    const get = (t: string) => parts.find((pp) => pp.type === t)?.value ?? "";
    return `${get("day")} ${get("month").toUpperCase()} ${get("year")} · ${get("hour")}:${get("minute")} LOCAL`;
  } catch {
    return new Date(timeMs).toISOString().slice(0, 16).replace("T", " · ") + " UTC";
  }
}

function moonPhaseName(age: number): string {
  if (age < 0.033 || age > 0.967) return "NEW MOON";
  if (age < 0.216) return "WAXING CRESCENT";
  if (age < 0.284) return "FIRST QUARTER";
  if (age < 0.466) return "WAXING GIBBOUS";
  if (age < 0.534) return "FULL MOON";
  if (age < 0.716) return "WANING GIBBOUS";
  if (age < 0.784) return "LAST QUARTER";
  return "WANING CRESCENT";
}

/** Pick a font size so the text fits within maxWidth (rough glyph-width heuristic). */
function fitSize(text: string, base: number, maxWidth: number): number {
  const est = text.length * base * 0.6;
  if (est <= maxWidth) return base;
  return Math.floor(base * (maxWidth / est));
}

/** Hills silhouettes: two smooth layers rising from the bottom of the disc. */
function hills(x0: number, x1: number, yBase: number, yBottom: number, amp: number, color: string, seed: number): string {
  const rng = mulberry32(seed);
  const w = x1 - x0;
  let d = `M ${x0} ${yBottom} L ${x0} ${yBase - rng() * amp}`;
  const steps = 8;
  let prevY = yBase - rng() * amp * 0.4;
  d = `M ${x0} ${yBottom} L ${x0} ${prevY}`;
  for (let i = 1; i <= steps; i++) {
    const x = x0 + (i / steps) * w;
    const y = yBase - rng() * amp;
    const cxp = x0 + ((i - 0.5) / steps) * w;
    const cyp = Math.min(prevY, y) - amp * (0.2 + rng() * 0.5);
    d += ` Q ${cxp.toFixed(1)} ${cyp.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`;
    prevY = y;
  }
  d += ` L ${x1} ${yBottom} Z`;
  return `<path d="${d}" fill="${color}"/>`;
}

/** SVG path for the lit portion of the moon, centered on 0,0 with radius r. */
function moonLitPath(r: number, age: number): string {
  const waxing = age < 0.5;
  const t = waxing ? age : 1 - age;
  const a = Math.max(Math.abs(Math.cos(2 * Math.PI * t)) * r, 0.01);
  const crescent = t < 0.25;
  const sweep = waxing ? (crescent ? 0 : 1) : crescent ? 1 : 0;
  return `M 0 ${-r} A ${r} ${r} 0 0 1 0 ${r} A ${a} ${r} 0 0 ${sweep} 0 ${-r} Z`;
}

function tzShort(tz: string): string {
  const last = tz.split("/").pop() ?? tz;
  return last.replace(/_/g, " ").toUpperCase();
}

export function buildDesignSvg(p: DesignParams): string {
  const W = PRINT_W, H = PRINT_H;
  const uid = Math.abs(hashSeed(p.timeMs, p.lat, p.lon)).toString(36);
  const ink = p.dark ? "#f4ecdc" : "#20304a";
  const inkSoft = p.dark ? "#cfc4ab" : "#4a5c74";

  const sun = solarPosition({ timeMs: p.timeMs, lat: p.lat, lon: p.lon });
  const moon = moonPosition({ timeMs: p.timeMs, lat: p.lat, lon: p.lon });
  const moonI = moonInfo(p.timeMs);
  const kind = classifySky(sun.elevation);
  const pal = PALETTES[kind];
  const path = sunPath(p.timeMs, p.lat, p.lon, 12);

  const cx = W / 2;
  const cy = H * 0.512;
  const R = W * 0.335; // sky disc

  // ---- chart mapping: azimuth -> x, elevation -> y ----
  const yHorizon = cy + R * 0.30; // el = 0
  const yTop = cy - R * 0.52; // el = 90
  const ppd = (yHorizon - yTop) / 90; // pixels per elevation degree
  const xScale = (R * 1.06) / 120; // px per azimuth degree (E..W through S across the disc)
  const X = (az: number) => cx + (az - 180) * xScale;
  const Y = (el: number) => yHorizon - el * ppd;

  const gradStops = pal.stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join("");

  // sun path polyline
  let pathD = "";
  let pen = false;
  for (const pt of path) {
    if (pt.elevation < -16) { pen = false; continue; }
    const x = X(pt.azimuth), y = Y(pt.elevation);
    pathD += `${pen ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)} `;
    pen = true;
  }

  // graticule: elevation lines + azimuth lines
  const grid: string[] = [];
  for (const el of [30, 60]) {
    grid.push(`<line x1="${X(96).toFixed(0)}" y1="${Y(el)}" x2="${X(264).toFixed(0)}" y2="${Y(el)}" stroke="${pal.grid}" stroke-opacity="0.35" stroke-width="2" stroke-dasharray="3 16"/>`);
    grid.push(`<text x="${X(258).toFixed(0)}" y="${Y(el) - 12}" font-family="IBM Plex Mono" font-size="30" fill="${pal.grid}" fill-opacity="0.6" text-anchor="start">${el}°</text>`);
  }
  for (const az of [120, 150, 210, 240]) {
    grid.push(`<line x1="${X(az).toFixed(0)}" y1="${Y(88).toFixed(0)}" x2="${X(az).toFixed(0)}" y2="${yHorizon}" stroke="${pal.grid}" stroke-opacity="0.22" stroke-width="2" stroke-dasharray="3 16"/>`);
  }
  grid.push(`<line x1="${X(96).toFixed(0)}" y1="${yHorizon}" x2="${X(264).toFixed(0)}" y2="${yHorizon}" stroke="${ink}" stroke-opacity="0.8" stroke-width="4"/>`);

  // stars (night): fill the sky region
  const rng = mulberry32(hashSeed(p.lat, p.lon, Math.round(p.timeMs / 86400000)));
  let stars = "";
  if (kind === "night") {
    for (let i = 0; i < 190; i++) {
      const az = 92 + rng() * 176;
      const el = 2 + Math.pow(rng(), 0.8) * 88;
      const x = X(az), y = Y(el);
      const rad = 0.9 + rng() * 2.8;
      const op = 0.25 + rng() * 0.75;
      stars += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${rad.toFixed(2)}" fill="#ffffff" fill-opacity="${op.toFixed(2)}"/>`;
      if (rng() > 0.94) {
        const s = rad * 4;
        stars += `<path d="M ${x.toFixed(1)} ${(y - s).toFixed(1)} L ${x.toFixed(1)} ${(y + s).toFixed(1)} M ${(x - s).toFixed(1)} ${y.toFixed(1)} L ${(x + s).toFixed(1)} ${y.toFixed(1)}" stroke="#ffffff" stroke-opacity="${(op * 0.8).toFixed(2)}" stroke-width="1.4"/>`;
      }
    }
  }

  // sun marker (clamped into the chart frame)
  const sAz = Math.min(258, Math.max(102, sun.azimuth));
  const sx = X(sAz), sy = Y(Math.max(sun.elevation, -15));
  const sunMarker = sun.elevation > -14
    ? `<circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="105" fill="${pal.halo}" fill-opacity="0.55"/>
       <circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="52" fill="${pal.sun}"/>
       <circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="52" fill="none" stroke="${ink}" stroke-opacity="0.5" stroke-width="3"/>
       <circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="80" fill="none" stroke="${ink}" stroke-opacity="0.35" stroke-width="2" stroke-dasharray="4 10"/>`
    : "";

  // moment star (night): glowing marker where the sun sits below the horizon
  const momentStar =
    kind === "night" && sun.elevation <= -14
      ? `<circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="62" fill="${pal.halo}" fill-opacity="0.45"/>
         <path d="M ${sx.toFixed(1)} ${(sy - 58).toFixed(1)} L ${(sx + 12).toFixed(1)} ${(sy - 12).toFixed(1)} L ${(sx + 58).toFixed(1)} ${sy.toFixed(1)} L ${(sx + 12).toFixed(1)} ${(sy + 12).toFixed(1)} L ${sx.toFixed(1)} ${(sy + 58).toFixed(1)} L ${(sx - 12).toFixed(1)} ${(sy + 12).toFixed(1)} L ${(sx - 58).toFixed(1)} ${sy.toFixed(1)} L ${(sx - 12).toFixed(1)} ${(sy - 12).toFixed(1)} Z" fill="${pal.sun}"/>`
      : "";

  // moon marker (clamped into frame — position is an approximation anyway)
  const moonUp = moon.elevation > -4;
  const mAz = Math.min(258, Math.max(102, moon.azimuth));
  const mEl = Math.min(84, Math.max(moon.elevation, 4));
  const mx = X(mAz), my = Y(mEl);
  const moonR = 66;
  const moonSvg =
    kind === "night" && moonUp
      ? `<g transform="translate(${mx.toFixed(1)} ${my.toFixed(1)})">
           <circle r="${moonR + 30}" fill="#cdd8f2" fill-opacity="0.15"/>
           <circle r="${moonR}" fill="#8e99b5"/>
           <path d="${moonLitPath(moonR, moonI.age)}" fill="#eef2fb"/>
           <circle r="${moonR}" fill="none" stroke="${ink}" stroke-opacity="0.4" stroke-width="2.5"/>
         </g>`
      : "";

  // ground (below horizon)
  const ground =
    hills(X(96) - R * 0.2, X(264) + R * 0.2, yHorizon + R * 0.10, cy + R * 1.05, R * 0.12, pal.groundFar, hashSeed(p.lon, p.lat)) +
    hills(X(96) - R * 0.2, X(264) + R * 0.2, yHorizon + R * 0.24, cy + R * 1.05, R * 0.09, pal.groundNear, hashSeed(p.lat, p.lon, 7));

  const footerData = `SUN ${sun.elevation >= 0 ? "+" : ""}${sun.elevation.toFixed(0)}° · ${moonPhaseName(moonI.age)} · ${esc(tzShort(p.tz))}`;

  const placeSize = fitSize(p.placeLabel.toUpperCase(), 118, W * 0.86);

  const caption = p.caption?.trim()
    ? `<text x="${cx}" y="${H * 0.885}" text-anchor="middle" font-family="Playfair Display" font-style="italic" font-size="64" fill="${ink}" fill-opacity="0.9">${esc(p.caption.trim())}</text>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
  <radialGradient id="sky${uid}" cx="50%" cy="38%" r="80%">
    ${gradStops}
  </radialGradient>
  <clipPath id="disc${uid}"><circle cx="${cx}" cy="${cy}" r="${R}"/></clipPath>
</defs>

<!-- header -->
<text x="${cx}" y="${H * 0.058}" text-anchor="middle" font-family="IBM Plex Mono" font-size="38" font-weight="medium" letter-spacing="9" fill="${inkSoft}">· MERIDIAN · SKY KEEPSAKE ·</text>
<text x="${cx}" y="${H * 0.118}" text-anchor="middle" font-family="Playfair Display" font-weight="bold" font-size="${placeSize}" fill="${ink}">${esc(p.placeLabel.toUpperCase())}</text>
<text x="${cx}" y="${H * 0.155}" text-anchor="middle" font-family="IBM Plex Mono" font-size="44" font-weight="medium" letter-spacing="6" fill="${inkSoft}">${fmtCoords(p.lat, p.lon)}</text>

<!-- sky disc -->
<g clip-path="url(#disc${uid})">
  <circle cx="${cx}" cy="${cy}" r="${R}" fill="url(#sky${uid})"/>
  ${grid.join("\n  ")}
  ${stars}
  ${ground}
  <path d="${pathD}" fill="none" stroke="${pal.sun}" stroke-opacity="0.8" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"/>
  ${momentStar}
  ${moonSvg}
  ${sunMarker}
</g>

<!-- frame rings -->
<circle cx="${cx}" cy="${cy}" r="${R + 8}" fill="none" stroke="${ink}" stroke-opacity="0.9" stroke-width="5"/>
<circle cx="${cx}" cy="${cy}" r="${R + 54}" fill="none" stroke="${ink}" stroke-opacity="0.3" stroke-width="2"/>
<text x="${X(96) - R * 0.12}" y="${yHorizon + 14}" font-family="IBM Plex Mono" font-size="30" fill="${ink}" fill-opacity="0.7" text-anchor="end">E</text>
<text x="${X(264) + R * 0.12}" y="${yHorizon + 14}" font-family="IBM Plex Mono" font-size="30" fill="${ink}" fill-opacity="0.7" text-anchor="start">W</text>
<text x="${cx}" y="${cy - R + 66}" text-anchor="middle" font-family="IBM Plex Mono" font-size="30" letter-spacing="8" fill="${ink}" fill-opacity="0.55">ZENITH</text>

<!-- footer -->
<text x="${cx}" y="${H * 0.822}" text-anchor="middle" font-family="IBM Plex Mono" font-size="50" font-weight="medium" letter-spacing="4" fill="${ink}">${fmtDateLine(p.timeMs, p.tz)}</text>
${caption}
<text x="${cx}" y="${H * 0.945}" text-anchor="middle" font-family="IBM Plex Mono" font-size="31" letter-spacing="5" fill="${inkSoft}" fill-opacity="0.8">${footerData}</text>
</svg>`;
}
