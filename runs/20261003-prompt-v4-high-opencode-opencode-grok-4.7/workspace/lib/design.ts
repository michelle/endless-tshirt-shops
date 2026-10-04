import sky from "./sky-data.json";
import type { DesignSpec, Ink } from "./catalog";
import { shirtById } from "./catalog";

export const PRINT_W = 4665;
export const PRINT_H = 5844;

const MAG_LIMIT = 3.85;

type InkSet = {
  star: string;
  line: string;
  ring: string;
  type: string;
  quiet: string;
};

const INK: Record<Ink, InkSet> = {
  light: {
    star: "#F4EFE6",
    line: "#E0C48A",
    ring: "#E7D3A4",
    type: "#F4EFE6",
    quiet: "#E0C48A",
  },
  dark: {
    star: "#1A1714",
    line: "#8C3D2C",
    ring: "#8C3D2C",
    type: "#1A1714",
    quiet: "#8C3D2C",
  },
};

export type Place = {
  name: string;
  admin1?: string;
  country?: string;
  latitude: number;
  longitude: number;
  timezone: string;
  label: string;
};

export function placeLabel(name: string, admin1?: string): string {
  const city = name.trim();
  const region = (admin1 || "").trim();
  if (!region || region.toLowerCase() === city.toLowerCase()) return city;
  return `${city}, ${region}`;
}

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  if (!y || !m || !d) return iso;
  return `${d} ${months[m - 1]} ${y}`;
}

export function formatDateUpper(iso: string): string {
  return formatDate(iso).toUpperCase();
}

export function formatTime(time: string, approximate: boolean): string {
  if (approximate) return "EVENING";
  const [hRaw, minRaw] = time.split(":");
  let h = Number(hRaw);
  const min = (minRaw || "00").padStart(2, "0");
  if (Number.isNaN(h)) return time;
  const suffix = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${min} ${suffix}`;
}

export function formatCoord(lat: number, lon: number): string {
  const ns = lat >= 0 ? "N" : "S";
  const ew = lon >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(2)}° ${ns}    ${Math.abs(lon).toFixed(2)}° ${ew}`;
}

export function zonedToUtc(date: string, time: string, timeZone: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  let utc = Date.UTC(y, m - 1, d, hh || 0, mm || 0, 0);
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  for (let i = 0; i < 4; i++) {
    const parts = Object.fromEntries(fmt.formatToParts(new Date(utc)).map((p) => [p.type, p.value]));
    const shown = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute);
    const wanted = Date.UTC(y, m - 1, d, hh || 0, mm || 0);
    const delta = wanted - shown;
    if (delta === 0) break;
    utc += delta;
  }
  return new Date(utc);
}

function gmstDegrees(date: Date): number {
  const jd = date.getTime() / 86400000 + 2440587.5;
  const d = jd - 2451545.0;
  const gmst = 280.46061837 + 360.98564736629 * d;
  return ((gmst % 360) + 360) % 360;
}

type SkyPoint = { x: number; y: number; alt: number; mag?: number };

function projectStar(
  raHours: number,
  decDeg: number,
  latDeg: number,
  lstDeg: number,
  cx: number,
  cy: number,
  radius: number,
): SkyPoint {
  const ra = raHours * 15;
  let ha = lstDeg - ra;
  ha = ((((ha + 180) % 360) + 360) % 360) - 180;
  const haR = (ha * Math.PI) / 180;
  const dec = (decDeg * Math.PI) / 180;
  const lat = (latDeg * Math.PI) / 180;
  const sinAlt = Math.sin(dec) * Math.sin(lat) + Math.cos(dec) * Math.cos(lat) * Math.cos(haR);
  const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt)));
  // atan2 here is measured from south. Convert to north-through-east, then
  // plot looking up: north at the top, east to the left.
  const azFromSouth = Math.atan2(Math.sin(haR), Math.cos(haR) * Math.sin(lat) - Math.tan(dec) * Math.cos(lat));
  const az = azFromSouth + Math.PI;
  const zenith = Math.PI / 2 - alt;
  const r = radius * Math.tan(zenith / 2);
  const x = cx - r * Math.sin(az);
  const y = cy - r * Math.cos(az);
  return { x, y, alt: (alt * 180) / Math.PI };
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function starRadius(mag: number): number {
  const t = Math.min(1, Math.max(0, (mag + 1.46) / (MAG_LIMIT + 1.46)));
  return 20 - t * 14.5;
}

function nameFontSize(text: string): number {
  const len = Math.max(text.length, 6);
  return Math.max(108, Math.min(214, 3100 / (len * 0.46)));
}

export function inkForColor(colorId: string): Ink {
  return shirtById(colorId)?.ink ?? "light";
}

export function designFragment(spec: DesignSpec): string {
  return designSvg(spec).replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
}

export function designSvg(spec: DesignSpec): string {
  const ink = INK[inkForColor(spec.color)];
  const W = PRINT_W;
  const H = PRINT_H;
  const cx = W / 2;
  const radius = 1120;
  const top = 360;
  const cy = top + radius;

  const when = spec.approximate ? "22:00" : spec.time || "22:00";
  let utc = new Date(`${spec.date}T${when}:00Z`);
  try {
    utc = zonedToUtc(spec.date, when, spec.tz || "UTC");
  } catch {
    utc = new Date(`${spec.date}T${when}:00Z`);
  }
  const lst = (gmstDegrees(utc) + spec.lon + 360) % 360;

  const stars = (sky.stars as number[][])
    .filter((s) => s[2] <= MAG_LIMIT)
    .map((s) => {
      const p = projectStar(s[0], s[1], spec.lat, lst, cx, cy, radius);
      return { ...p, mag: s[2] };
    })
    .filter((s) => s.alt > 1.5 && Math.hypot(s.x - cx, s.y - cy) < radius - 8);

  let brightest: (typeof stars)[number] | null = null;
  for (const s of stars) {
    if (s.alt < 12) continue;
    if (!brightest || (s.mag ?? 99) < (brightest.mag ?? 99)) brightest = s;
  }

  const lines: string[] = [];
  for (const seg of sky.lines as number[][][]) {
    let run: Array<{ x: number; y: number }> = [];
    const flush = () => {
      if (run.length >= 2) {
        const d = run.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
        lines.push(d);
      }
      run = [];
    };
    for (const [ra, dec] of seg) {
      const p = projectStar(ra, dec, spec.lat, lst, cx, cy, radius);
      const inside = p.alt > 0.8 && Math.hypot(p.x - cx, p.y - cy) < radius - 6;
      if (!inside) {
        flush();
        continue;
      }
      run.push(p);
    }
    flush();
  }

  const ticks: string[] = [];
  const dirs: string[] = [];
  const labels = [
    { az: 0, t: "N" },
    { az: 90, t: "E" },
    { az: 180, t: "S" },
    { az: 270, t: "W" },
  ];
  for (let deg = 0; deg < 360; deg += 10) {
    const az = (deg * Math.PI) / 180;
    const cardinal = deg % 90 === 0;
    const inner = radius - (cardinal ? 42 : 24);
    const outer = radius - 8;
    const x1 = cx - inner * Math.sin(az);
    const y1 = cy - inner * Math.cos(az);
    const x2 = cx - outer * Math.sin(az);
    const y2 = cy - outer * Math.cos(az);
    ticks.push(
      `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${ink.ring}" stroke-width="${cardinal ? 8 : 4}" stroke-linecap="square"/>`,
    );
  }
  for (const dir of labels) {
    const az = (dir.az * Math.PI) / 180;
    const rr = radius - 92;
    const x = cx - rr * Math.sin(az);
    const y = cy - rr * Math.cos(az);
    dirs.push(
      `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" dominant-baseline="central" fill="${ink.quiet}" font-family="Instrument Sans" font-size="36" font-weight="500" letter-spacing="2">${dir.t}</text>`,
    );
  }

  const starDots = stars
    .map((s) => {
      const r = starRadius(s.mag ?? 4);
      return `<circle cx="${s.x.toFixed(1)}" cy="${s.y.toFixed(1)}" r="${r.toFixed(1)}" fill="${ink.star}"/>`;
    })
    .join("");

  const kept = brightest
    ? `<circle cx="${brightest.x.toFixed(1)}" cy="${brightest.y.toFixed(1)}" r="${(starRadius(brightest.mag ?? 0) + 16).toFixed(1)}" fill="none" stroke="${ink.ring}" stroke-width="4"/>`
    : "";

  const names = [spec.name1.trim(), spec.name2.trim()].filter(Boolean);
  const nameText = names.join("  &  ");
  const nameSize = nameFontSize(nameText || "Stillpoint");
  const place = placeLabel(spec.place, spec.region).toUpperCase();
  const placeSize = place.length > 28 ? 36 : place.length > 20 ? 42 : 48;
  const line = spec.line.trim();
  const lineSize = line.length > 36 ? 58 : 70;

  const nameY = cy + radius + Math.round(nameSize * 0.95);
  const ruleY = nameY + Math.round(nameSize * 0.42);
  let y = ruleY + 84;
  const dateY = y;
  y += 64;
  const placeY = y;
  y += 56;
  const coordY = y;
  y += line ? 104 : 40;
  const lineY = y;
  y += line ? 92 : 24;
  const markY = y;

  const dateLine = `${formatDateUpper(spec.date)}    ·    ${formatTime(spec.time, spec.approximate)}`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" fill="none">
  <g fill="none" stroke="none">
    <circle cx="${cx}" cy="${cy}" r="${radius}" stroke="${ink.ring}" stroke-width="8"/>
    <circle cx="${cx}" cy="${cy}" r="${radius - 22}" stroke="${ink.ring}" stroke-width="2.5"/>
    ${ticks.join("")}
    ${dirs.join("")}
    <g stroke="${ink.line}" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round">
      ${lines.map((d) => `<path d="${d}"/>`).join("")}
    </g>
    ${starDots}
    ${kept}
    <path d="M${cx} ${cy - 16} V${cy + 16} M${cx - 16} ${cy} H${cx + 16}" stroke="${ink.ring}" stroke-width="4" stroke-linecap="square"/>
    <text x="${cx}" y="${nameY}" text-anchor="middle" fill="${ink.type}" font-family="Instrument Serif" font-style="italic" font-size="${nameSize.toFixed(0)}">${esc(nameText || "Stillpoint")}</text>
    <line x1="${cx - 150}" y1="${ruleY}" x2="${cx - 14}" y2="${ruleY}" stroke="${ink.ring}" stroke-width="3"/>
    <circle cx="${cx}" cy="${ruleY}" r="5" fill="${ink.ring}"/>
    <line x1="${cx + 14}" y1="${ruleY}" x2="${cx + 150}" y2="${ruleY}" stroke="${ink.ring}" stroke-width="3"/>
    <text x="${cx}" y="${dateY}" text-anchor="middle" fill="${ink.type}" font-family="Instrument Sans" font-size="46" font-weight="500" letter-spacing="6">${esc(dateLine)}</text>
    <text x="${cx}" y="${placeY}" text-anchor="middle" fill="${ink.type}" font-family="Instrument Sans" font-size="${placeSize}" font-weight="500" letter-spacing="5">${esc(place)}</text>
    <text x="${cx}" y="${coordY}" text-anchor="middle" fill="${ink.quiet}" font-family="Instrument Sans" font-size="32" font-weight="500" letter-spacing="3">${esc(formatCoord(spec.lat, spec.lon))}</text>
    ${line ? `<text x="${cx}" y="${lineY}" text-anchor="middle" fill="${ink.quiet}" font-family="Instrument Serif" font-style="italic" font-size="${lineSize}">${esc(line)}</text>` : ""}
    <text x="${cx}" y="${markY}" text-anchor="middle" fill="${ink.type}" font-family="Instrument Sans" font-size="30" font-weight="500" letter-spacing="14">STILLPOINT</text>
  </g>
</svg>`;
}
