/**
 * Lightweight astronomy for the Orbitday design.
 *
 * Planet positions use the JPL "Approximate Positions of the Planets"
 * Keplerian elements (Table 1, valid 1800–2050). Accuracy is well within a
 * degree of heliocentric longitude, which is far more than a printed diagram needs.
 */

const DEG = Math.PI / 180;

export type PlanetId =
  | "mercury"
  | "venus"
  | "earth"
  | "mars"
  | "jupiter"
  | "saturn"
  | "uranus"
  | "neptune";

interface Elements {
  id: PlanetId;
  label: string;
  // a (AU), e, I (deg), L (deg), longPeri (deg), longNode (deg) at J2000
  base: [number, number, number, number, number, number];
  // rates per Julian century
  rate: [number, number, number, number, number, number];
}

// prettier-ignore
const ELEMENTS: Elements[] = [
  { id: "mercury", label: "Mercury", base: [0.38709927, 0.20563593, 7.00497902, 252.25032350, 77.45779628, 48.33076593], rate: [0.00000037, 0.00001906, -0.00594749, 149472.67411175, 0.16047689, -0.12534081] },
  { id: "venus",   label: "Venus",   base: [0.72333566, 0.00677672, 3.39467605, 181.97909950, 131.60246718, 76.67984255], rate: [0.00000390, -0.00004107, -0.00078890, 58517.81538729, 0.00268329, -0.27769418] },
  { id: "earth",   label: "Earth",   base: [1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0.0], rate: [0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0.0] },
  { id: "mars",    label: "Mars",    base: [1.52371034, 0.09339410, 1.84969142, -4.55343205, -23.94362959, 49.55953891], rate: [0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343] },
  { id: "jupiter", label: "Jupiter", base: [5.20288700, 0.04838624, 1.30439695, 34.39644051, 14.72847983, 100.47390909], rate: [-0.00011607, -0.00013253, -0.00183714, 3034.74612775, 0.21252668, 0.20469106] },
  { id: "saturn",  label: "Saturn",  base: [9.53667594, 0.05386179, 2.48599187, 49.95424423, 92.59887831, 113.66242448], rate: [-0.00125060, -0.00050991, 0.00193609, 1222.49362201, -0.41897216, -0.28867794] },
  { id: "uranus",  label: "Uranus",  base: [19.18916464, 0.04725744, 0.77263783, 313.23810451, 170.95427630, 74.01692503], rate: [-0.00196176, -0.00004397, -0.00242939, 428.48202785, 0.40805281, 0.04240589] },
  { id: "neptune", label: "Neptune", base: [30.06992276, 0.00859048, 1.77004347, -55.12002969, 44.96476227, 131.78422574], rate: [0.00026291, 0.00005105, 0.00035372, 218.45945325, -0.32241464, -0.00508664] },
];

export interface PlanetPosition {
  id: PlanetId;
  label: string;
  /** heliocentric ecliptic longitude, degrees 0–360 */
  longitude: number;
  /** heliocentric distance, AU */
  distance: number;
  /** semi-major axis, AU */
  a: number;
}

export interface MoonInfo {
  /** phase angle in degrees, 0 = new, 90 = first quarter, 180 = full, 270 = last quarter */
  phase: number;
  /** illuminated fraction 0–1 */
  illumination: number;
  name: string;
  waxing: boolean;
}

export interface SkySnapshot {
  jd: number;
  planets: PlanetPosition[];
  moon: MoonInfo;
}

const norm360 = (d: number) => ((d % 360) + 360) % 360;

/** Julian Day for a UTC calendar date/time. */
export function julianDay(y: number, m: number, d: number, hourUtc = 12): number {
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return (
    Math.floor(365.25 * (y + 4716)) +
    Math.floor(30.6001 * (m + 1)) +
    d +
    hourUtc / 24 +
    B -
    1524.5
  );
}

function solveKepler(M: number, e: number): number {
  // M in radians
  let E = M + e * Math.sin(M);
  for (let i = 0; i < 20; i++) {
    const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= dE;
    if (Math.abs(dE) < 1e-9) break;
  }
  return E;
}

export function planetPositions(jd: number): PlanetPosition[] {
  const T = (jd - 2451545.0) / 36525;
  return ELEMENTS.map((el) => {
    const a = el.base[0] + el.rate[0] * T;
    const e = el.base[1] + el.rate[1] * T;
    const I = (el.base[2] + el.rate[2] * T) * DEG;
    const L = el.base[3] + el.rate[3] * T;
    const wbar = el.base[4] + el.rate[4] * T;
    const Om = (el.base[5] + el.rate[5] * T) * DEG;
    const w = wbar * DEG - Om;
    const M = norm360(L - wbar) * DEG;
    const E = solveKepler(M, e);
    const xp = a * (Math.cos(E) - e);
    const yp = a * Math.sqrt(1 - e * e) * Math.sin(E);
    const cw = Math.cos(w), sw = Math.sin(w);
    const cO = Math.cos(Om), sO = Math.sin(Om);
    const cI = Math.cos(I);
    const x = (cw * cO - sw * sO * cI) * xp + (-sw * cO - cw * sO * cI) * yp;
    const y = (cw * sO + sw * cO * cI) * xp + (-sw * sO + cw * cO * cI) * yp;
    return {
      id: el.id,
      label: el.label,
      longitude: norm360(Math.atan2(y, x) / DEG),
      distance: Math.sqrt(x * x + y * y),
      a: el.base[0],
    };
  });
}

export function moonInfo(jd: number): MoonInfo {
  const D = jd - 2451545.0;
  // Sun
  const Ms = norm360(357.528 + 0.9856003 * D) * DEG;
  const Ls = 280.46 + 0.9856474 * D;
  const sunLon = Ls + 1.915 * Math.sin(Ms) + 0.02 * Math.sin(2 * Ms);
  // Moon (truncated series, ~0.3° accuracy)
  const Lm = 218.316 + 13.176396 * D;
  const Mm = norm360(134.963 + 13.064993 * D) * DEG;
  const Dm = norm360(297.85 + 12.190749 * D) * DEG;
  const moonLon =
    Lm +
    6.289 * Math.sin(Mm) +
    1.274 * Math.sin(2 * Dm - Mm) +
    0.658 * Math.sin(2 * Dm) -
    0.186 * Math.sin(Ms) -
    0.214 * Math.sin(2 * Mm);
  const phase = norm360(moonLon - sunLon);
  const illumination = (1 - Math.cos(phase * DEG)) / 2;
  const waxing = phase < 180;
  let name: string;
  if (phase < 11.25 || phase >= 348.75) name = "New Moon";
  else if (phase < 78.75) name = "Waxing Crescent";
  else if (phase < 101.25) name = "First Quarter";
  else if (phase < 168.75) name = "Waxing Gibbous";
  else if (phase < 191.25) name = "Full Moon";
  else if (phase < 258.75) name = "Waning Gibbous";
  else if (phase < 281.25) name = "Last Quarter";
  else name = "Waning Crescent";
  return { phase, illumination, name, waxing };
}

export function skySnapshot(isoDate: string): SkySnapshot {
  const [y, m, d] = isoDate.split("-").map(Number);
  const jd = julianDay(y, m, d, 12);
  return { jd, planets: planetPositions(jd), moon: moonInfo(jd) };
}
