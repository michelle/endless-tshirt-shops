// Heliocentric planetary positions from Keplerian elements.
// Source: JPL "Approximate Positions of the Planets" (E.M. Standish), Table 1,
// valid 1800 AD – 2050 AD with degree-level accuracy; still visually correct well outside that range.

export type PlanetId =
  | "mercury" | "venus" | "earth" | "mars"
  | "jupiter" | "saturn" | "uranus" | "neptune" | "pluto";

type Elements = [number, number, number, number, number, number]; // a, e, I, L, varpi, Omega

const ELEMENTS: Record<PlanetId, { e0: Elements; rate: Elements }> = {
  mercury: { e0: [0.38709927, 0.20563593, 7.00497902, 252.2503235, 77.45779628, 48.33076593], rate: [0.00000037, 0.00001906, -0.00594749, 149472.67411175, 0.16047689, -0.12534081] },
  venus:   { e0: [0.72333566, 0.00677672, 3.39467605, 181.9790995, 131.60246718, 76.67984255], rate: [0.0000039, -0.00004107, -0.0007889, 58517.81538729, 0.00268329, -0.27769418] },
  earth:   { e0: [1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0], rate: [0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0] },
  mars:    { e0: [1.52371034, 0.0933941, 1.84969142, -4.55343205, -23.94362959, 49.55953891], rate: [0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343] },
  jupiter: { e0: [5.202887, 0.04838624, 1.30439695, 34.39644051, 14.72847983, 100.47390909], rate: [-0.00011607, -0.00013253, -0.00183714, 3034.74612775, 0.21252668, 0.20469106] },
  saturn:  { e0: [9.53667594, 0.05386179, 2.48599187, 49.95424423, 92.59887831, 113.66242448], rate: [-0.0012506, -0.00050991, 0.00193609, 1222.49362201, -0.41897216, -0.28867794] },
  uranus:  { e0: [19.18916464, 0.04725744, 0.77263783, 313.23810451, 170.9542763, 74.01692503], rate: [-0.00196176, -0.00004397, -0.00242939, 428.48202785, 0.40805281, 0.04240589] },
  neptune: { e0: [30.06992276, 0.00859048, 1.77004347, -55.12002969, 44.96476227, 131.78422574], rate: [0.00026291, 0.00005105, 0.00035372, 218.45945325, -0.32241464, -0.00508664] },
  pluto:   { e0: [39.48211675, 0.2488273, 17.14001206, 238.92903833, 224.06891629, 110.30393684], rate: [-0.00031596, 0.0000517, 0.00004818, 145.20780515, -0.04062942, -0.01183482] },
};

export const PLANET_ORDER: PlanetId[] = ["mercury", "venus", "earth", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"];

export const PLANET_NAMES: Record<PlanetId, string> = {
  mercury: "Mercury", venus: "Venus", earth: "Earth", mars: "Mars", jupiter: "Jupiter",
  saturn: "Saturn", uranus: "Uranus", neptune: "Neptune", pluto: "Pluto",
};

const DEG = Math.PI / 180;

/** Julian day for a civil date at 12:00 UTC. */
export function julianDay(year: number, month: number, day: number, hourUtc = 12): number {
  let y = year, m = month;
  if (m <= 2) { y -= 1; m += 12; }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + B - 1524.5 + hourUtc / 24;
}

function solveKepler(Mdeg: number, e: number): number {
  const M = ((Mdeg % 360) + 360) % 360;
  const Mrad = M * DEG;
  let E = Mrad + e * Math.sin(Mrad);
  for (let i = 0; i < 30; i++) {
    const dE = (Mrad - (E - e * Math.sin(E))) / (1 - e * Math.cos(E));
    E += dE;
    if (Math.abs(dE) < 1e-10) break;
  }
  return E;
}

export interface PlanetPosition {
  id: PlanetId;
  /** heliocentric ecliptic longitude, degrees 0–360 */
  longitude: number;
  /** distance from the Sun in AU */
  distance: number;
  /** semi-major axis in AU */
  a: number;
}

export function planetPosition(id: PlanetId, jd: number): PlanetPosition {
  const T = (jd - 2451545.0) / 36525;
  const { e0, rate } = ELEMENTS[id];
  const [a, e, I, L, varpi, Omega] = e0.map((v, i) => v + rate[i] * T);
  const omega = varpi - Omega;
  const M = L - varpi;
  const E = solveKepler(M, e);
  const xp = a * (Math.cos(E) - e);
  const yp = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const cw = Math.cos(omega * DEG), sw = Math.sin(omega * DEG);
  const cO = Math.cos(Omega * DEG), sO = Math.sin(Omega * DEG);
  const cI = Math.cos(I * DEG), sI = Math.sin(I * DEG);
  const x = (cw * cO - sw * sO * cI) * xp + (-sw * cO - cw * sO * cI) * yp;
  const y = (cw * sO + sw * cO * cI) * xp + (-sw * sO + cw * cO * cI) * yp;
  const z = (sw * sI) * xp + (cw * sI) * yp;
  let lon = Math.atan2(y, x) / DEG;
  if (lon < 0) lon += 360;
  return { id, longitude: lon, distance: Math.sqrt(x * x + y * y + z * z), a };
}

export function solarSystemOn(year: number, month: number, day: number, ids: PlanetId[] = PLANET_ORDER): PlanetPosition[] {
  const jd = julianDay(year, month, day);
  return ids.map((id) => planetPosition(id, jd));
}
