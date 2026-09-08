// Deterministic "night sky" design generator.
//
// Every shirt is generated from the customer's chosen date, time and place.
// The same inputs always produce the same star field, so we never need to
// store a rendered image anywhere -- we just store the inputs (in Stripe
// PaymentIntent metadata) and regenerate the artwork on demand, both for the
// live preview in the browser and for the real print file we hand to Prodigi.

export type SkyDesignInput = {
  dateISO: string; // e.g. "2023-06-14T21:30"
  lat: number;
  lon: number;
  locationLabel: string; // "Brooklyn, NY, USA"
  caption: string; // free text, e.g. "Where it all began"
};

export type Star = {
  x: number; // 0-1000 design space
  y: number; // 0-1250 design space
  r: number;
  o: number; // opacity 0-1
  bright: boolean;
};

export type SkyDesign = {
  stars: Star[];
  lines: { x1: number; y1: number; x2: number; y2: number }[];
  moon: { cx: number; cy: number; r: number; illumination: number; name: string };
  dateLabel: string;
  timeLabel: string;
  coordLabel: string;
  locationLabel: string;
  caption: string;
};

// ---- deterministic PRNG -------------------------------------------------

function hashStringToSeed(s: string): number {
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---- real moon phase for the given date ---------------------------------

const SYNODIC_MONTH_DAYS = 29.530588861;
// A known new moon reference instant (UTC).
const REF_NEW_MOON_MS = Date.UTC(2000, 0, 6, 18, 14, 0);

export function moonPhaseFor(date: Date): { illumination: number; name: string; age: number } {
  const diffDays = (date.getTime() - REF_NEW_MOON_MS) / 86400000;
  const age = ((diffDays % SYNODIC_MONTH_DAYS) + SYNODIC_MONTH_DAYS) % SYNODIC_MONTH_DAYS;
  const phaseFraction = age / SYNODIC_MONTH_DAYS; // 0..1, 0 = new, 0.5 = full
  const illumination = (1 - Math.cos(2 * Math.PI * phaseFraction)) / 2;

  let name: string;
  if (phaseFraction < 0.03 || phaseFraction > 0.97) name = "New Moon";
  else if (phaseFraction < 0.22) name = "Waxing Crescent";
  else if (phaseFraction < 0.28) name = "First Quarter";
  else if (phaseFraction < 0.47) name = "Waxing Gibbous";
  else if (phaseFraction < 0.53) name = "Full Moon";
  else if (phaseFraction < 0.72) name = "Waning Gibbous";
  else if (phaseFraction < 0.78) name = "Last Quarter";
  else name = "Waning Crescent";

  return { illumination, name, age };
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatTimeUTC(date: Date): string {
  const h24 = date.getUTCHours();
  const m = date.getUTCMinutes();
  const period = h24 < 12 ? "AM" : "PM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${period}`;
}

// ---- coordinate label -----------------------------------------------------

export function formatCoords(lat: number, lon: number): string {
  const latDir = lat >= 0 ? "N" : "S";
  const lonDir = lon >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(4)}°${latDir}  ${Math.abs(lon).toFixed(4)}°${lonDir}`;
}

// ---- main generator ---------------------------------------------------

// Matches the ~0.8 aspect ratio of Prodigi's front print area on the
// Gildan tee SKUs (4665x5844 / 4677x5881) so the design fills the print
// area with no letterboxing. Kept as plain design-space units, reused
// 1:1 both by the browser SVG preview (via viewBox) and by the server-side
// PNG generator that becomes the actual Prodigi print asset.
const W = 1600;
const H = 2000;

// A bare "YYYY-MM-DDTHH:mm[:ss]" (no offset) is parsed by `Date` as *local*
// time to whatever machine runs it -- meaning the same string resolves to a
// different instant on a UTC server than in a visitor's browser, which
// among other things silently breaks the deterministic design (and, worse,
// produces a server/client hydration mismatch when rendered as text). Every
// call site is supposed to hand this a UTC-anchored string already, but we
// normalize defensively here since this function is the one shared source
// of truth for the design.
function normalizeToUTC(dateISO: string): string {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(dateISO) ? `${dateISO}Z` : dateISO;
}

export function generateSkyDesign(input: SkyDesignInput): SkyDesign {
  const normalizedDateISO = normalizeToUTC(input.dateISO);
  const seed = hashStringToSeed(
    `${normalizedDateISO}|${input.lat.toFixed(3)}|${input.lon.toFixed(3)}`
  );
  const rand = mulberry32(seed);

  const date = new Date(normalizedDateISO);
  const validDate = isNaN(date.getTime()) ? new Date(0) : date;

  // Star field: mostly small dim stars, a handful of bright "named" stars.
  const STAR_COUNT = 220;
  const stars: Star[] = [];
  const brightStars: Star[] = [];
  const margin = 96;
  for (let i = 0; i < STAR_COUNT; i++) {
    const bright = rand() > 0.93;
    const star: Star = {
      x: margin + rand() * (W - margin * 2),
      y: margin + 64 + rand() * (H - margin * 2 - 410),
      r: bright ? 7 + rand() * 5 : 1.6 + rand() * 3.5,
      o: bright ? 0.85 + rand() * 0.15 : 0.35 + rand() * 0.5,
      bright,
    };
    stars.push(star);
    if (bright) brightStars.push(star);
  }

  // Connect bright stars into a loose constellation-style path: sort by a
  // random walk that always hops to a nearby (not necessarily nearest)
  // unused bright star, which produces pleasant non-crossing-ish lines.
  const lines: SkyDesign["lines"] = [];
  const remaining = [...brightStars];
  if (remaining.length > 1) {
    let current = remaining.splice(Math.floor(rand() * remaining.length), 1)[0];
    while (remaining.length > 0) {
      // pick one of the 3 closest remaining stars at random, for variety
      const withDist = remaining
        .map((s) => ({ s, d: Math.hypot(s.x - current.x, s.y - current.y) }))
        .sort((a, b) => a.d - b.d)
        .slice(0, 3);
      const pick = withDist[Math.floor(rand() * withDist.length)].s;
      lines.push({ x1: current.x, y1: current.y, x2: pick.x, y2: pick.y });
      remaining.splice(remaining.indexOf(pick), 1);
      current = pick;
    }
  }

  const moon = moonPhaseFor(validDate);
  const moonPos = { cx: W - 240 - rand() * 96, cy: 240 + rand() * 96 };

  // Formatted by hand rather than with Intl/toLocale*: those pull in
  // whatever ICU data the running engine ships, and Node's and a browser's
  // can render e.g. the AM/PM space differently (regular vs narrow
  // no-break), which is a byte-for-byte text mismatch and trips a React
  // hydration error between the prerendered HTML and the client render.
  const dateLabel = `${MONTHS[validDate.getUTCMonth()]} ${validDate.getUTCDate()}, ${validDate.getUTCFullYear()}`;
  const timeLabel = formatTimeUTC(validDate);

  return {
    stars,
    lines,
    moon: { ...moonPos, r: 67, illumination: moon.illumination, name: moon.name },
    dateLabel,
    timeLabel,
    coordLabel: formatCoords(input.lat, input.lon),
    locationLabel: input.locationLabel,
    caption: input.caption?.slice(0, 60) ?? "",
  };
}

export const DESIGN_SPACE = { W, H };
