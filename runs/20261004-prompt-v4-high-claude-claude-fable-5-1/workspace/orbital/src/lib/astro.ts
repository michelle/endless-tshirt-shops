/**
 * Heliocentric planet positions from Keplerian elements.
 * Source: E.M. Standish, "Keplerian Elements for Approximate Positions of the
 * Major Planets" (JPL), Table 1 — valid 1800 AD to 2050 AD, accurate to well
 * under a degree of heliocentric longitude, which is far beyond what a printed
 * diagram can show.
 */

export type PlanetId =
  | "mercury" | "venus" | "earth" | "mars" | "jupiter"
  | "saturn" | "uranus" | "neptune" | "pluto";

type Elements = {
  a: number; e: number; I: number; L: number; w: number; O: number; // J2000 values
  da: number; de: number; dI: number; dL: number; dw: number; dO: number; // per century
};

const ELEMENTS: Record<PlanetId, Elements> = {
  mercury: { a: 0.38709927, e: 0.20563593, I: 7.00497902, L: 252.2503235, w: 77.45779628, O: 48.33076593,
    da: 0.00000037, de: 0.00001906, dI: -0.00594749, dL: 149472.67411175, dw: 0.16047689, dO: -0.12534081 },
  venus: { a: 0.72333566, e: 0.00677672, I: 3.39467605, L: 181.9790995, w: 131.60246718, O: 76.67984255,
    da: 0.0000039, de: -0.00004107, dI: -0.0007889, dL: 58517.81538729, dw: 0.00268329, dO: -0.27769418 },
  earth: { a: 1.00000261, e: 0.01671123, I: -0.00001531, L: 100.46457166, w: 102.93768193, O: 0,
    da: 0.00000562, de: -0.00004392, dI: -0.01294668, dL: 35999.37244981, dw: 0.32327364, dO: 0 },
  mars: { a: 1.52371034, e: 0.0933941, I: 1.84969142, L: -4.55343205, w: -23.94362959, O: 49.55953891,
    da: 0.00001847, de: 0.00007882, dI: -0.00813131, dL: 19140.30268499, dw: 0.44441088, dO: -0.29257343 },
  jupiter: { a: 5.202887, e: 0.04838624, I: 1.30439695, L: 34.39644051, w: 14.72847983, O: 100.47390909,
    da: -0.00011607, de: -0.00013253, dI: -0.00183714, dL: 3034.74612775, dw: 0.21252668, dO: 0.20469106 },
  saturn: { a: 9.53667594, e: 0.05386179, I: 2.48599187, L: 49.95424423, w: 92.59887831, O: 113.66242448,
    da: -0.0012506, de: -0.00050991, dI: 0.00193609, dL: 1222.49362201, dw: -0.41897216, dO: -0.28867794 },
  uranus: { a: 19.18916464, e: 0.04725744, I: 0.77263783, L: 313.23810451, w: 170.9542763, O: 74.01692503,
    da: -0.00196176, de: -0.00004397, dI: -0.00242939, dL: 428.48202785, dw: 0.40805281, dO: 0.04240589 },
  neptune: { a: 30.06992276, e: 0.00859048, I: 1.77004347, L: -55.12002969, w: 44.96476227, O: 131.78422574,
    da: 0.00026291, de: 0.00005105, dI: 0.00035372, dL: 218.45945325, dw: -0.32241464, dO: -0.00508664 },
  pluto: { a: 39.48211675, e: 0.2488273, I: 17.14001206, L: 238.92903833, w: 224.06891629, O: 110.30393684,
    da: -0.00031596, de: 0.0000517, dI: 0.00004818, dL: 145.20780515, dw: -0.04062942, dO: -0.01183482 },
};

export const PLANET_ORDER: PlanetId[] = [
  "mercury", "venus", "earth", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto",
];

const DEG = Math.PI / 180;

function norm360(d: number) {
  return ((d % 360) + 360) % 360;
}

/** Julian day number at 0h UT for a calendar date (proleptic Gregorian). */
export function julianDay(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) -
    Math.floor(y / 100) + Math.floor(y / 400) - 32045 - 0.5 + 0.5; // noon-based JDN, fine for a daily diagram
}

export type PlanetPosition = {
  id: PlanetId;
  /** heliocentric ecliptic longitude, degrees 0..360, J2000 */
  longitude: number;
  /** distance from the Sun in AU */
  distance: number;
  /** semi-major axis */
  a: number;
};

export function planetPosition(id: PlanetId, jd: number): PlanetPosition {
  const el = ELEMENTS[id];
  const T = (jd - 2451545.0) / 36525;
  const a = el.a + el.da * T;
  const e = el.e + el.de * T;
  const I = (el.I + el.dI * T) * DEG;
  const L = el.L + el.dL * T;
  const wbar = el.w + el.dw * T;
  const O = (el.O + el.dO * T) * DEG;
  const w = wbar * DEG - O; // argument of perihelion
  let M = norm360(L - wbar);
  if (M > 180) M -= 360;
  const Mr = M * DEG;
  // Solve Kepler's equation
  let E = Mr + e * Math.sin(Mr);
  for (let i = 0; i < 30; i++) {
    const dE = (E - e * Math.sin(E) - Mr) / (1 - e * Math.cos(E));
    E -= dE;
    if (Math.abs(dE) < 1e-10) break;
  }
  const xp = a * (Math.cos(E) - e);
  const yp = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const cw = Math.cos(w), sw = Math.sin(w), cO = Math.cos(O), sO = Math.sin(O), cI = Math.cos(I);
  const x = (cw * cO - sw * sO * cI) * xp + (-sw * cO - cw * sO * cI) * yp;
  const y = (cw * sO + sw * cO * cI) * xp + (-sw * sO + cw * cO * cI) * yp;
  return {
    id,
    longitude: norm360(Math.atan2(y, x) / DEG),
    distance: Math.sqrt(xp * xp + yp * yp),
    a,
  };
}

export function solarSystemOn(dateISO: string, includePluto: boolean): PlanetPosition[] {
  const [y, m, d] = dateISO.split("-").map(Number);
  const jd = julianDay(y, m, d);
  return PLANET_ORDER.filter((p) => includePluto || p !== "pluto").map((p) => planetPosition(p, jd));
}
