// Planet positions from the JPL "Keplerian elements for approximate positions" (valid 1800-2050).
const DEG = Math.PI / 180;

// [a, da, e, de, I, dI, L, dL, varpi, dvarpi, Omega, dOmega] (per Julian century)
const ELEMENTS = {
  mercury: [0.38709927, 0.00000037, 0.20563593, 0.00001906, 7.00497902, -0.00594749, 252.2503235, 149472.67411175, 77.45779628, 0.16047689, 48.33076593, -0.12534081],
  venus: [0.72333566, 0.0000039, 0.00677672, -0.00004107, 3.39467605, -0.0007889, 181.9790995, 58517.81538729, 131.60246718, 0.00268329, 76.67984255, -0.27769418],
  earth: [1.00000261, 0.00000562, 0.01671123, -0.00004392, -0.00001531, -0.01294668, 100.46457166, 35999.37244981, 102.93768193, 0.32327364, 0, 0],
  mars: [1.52371034, 0.00001847, 0.0933941, 0.00007882, 1.84969142, -0.00813131, -4.55343205, 19140.30268499, -23.94362959, 0.44441088, 49.55953891, -0.29257343],
  jupiter: [5.202887, -0.00011607, 0.04838624, -0.00013253, 1.30439695, -0.00183714, 34.39644051, 3034.74612775, 14.72847983, 0.21252668, 100.47390909, 0.20469106],
  saturn: [9.53667594, -0.0012506, 0.05386179, -0.00050991, 2.48599187, 0.00193609, 49.95424423, 1222.49362201, 92.59887831, -0.41897216, 113.66242448, -0.28867794],
  uranus: [19.18916464, -0.00196176, 0.04725744, -0.00004397, 0.77263783, -0.00242939, 313.23810451, 428.48202785, 170.9542763, 0.40805281, 74.01692503, 0.04240589],
  neptune: [30.06992276, 0.00026291, 0.00859048, 0.00005105, 1.77004347, 0.00035372, -55.12002969, 218.45945325, 44.96476227, -0.32241464, 131.78422574, -0.00508664],
};

export const PLANETS = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];

export const MIN_DATE = '1800-01-01';
export const MAX_DATE = '2050-12-31';

const norm360 = (x) => ((x % 360) + 360) % 360;

export function parseDate(str) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str || '');
  if (!m) return null;
  const [y, mo, d] = [+m[1], +m[2], +m[3]];
  const dt = new Date(Date.UTC(y, mo - 1, d, 12));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  if (str < MIN_DATE || str > MAX_DATE) return null;
  return dt;
}

export const julianDay = (dt) => dt.getTime() / 86400000 + 2440587.5;

function helio(name, T) {
  const el = ELEMENTS[name];
  const v = (i) => el[i] + el[i + 1] * T;
  const a = v(0), e = v(2), I = v(4) * DEG, L = v(6), varpi = v(8), Om = v(10) * DEG;
  const w = (varpi - v(10)) * DEG;
  let M = norm360(L - varpi);
  if (M > 180) M -= 360;
  M *= DEG;
  let E = M + e * Math.sin(M);
  for (let i = 0; i < 30; i++) {
    const dE = (M - (E - e * Math.sin(E))) / (1 - e * Math.cos(E));
    E += dE;
    if (Math.abs(dE) < 1e-12) break;
  }
  const xp = a * (Math.cos(E) - e);
  const yp = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const cw = Math.cos(w), sw = Math.sin(w), cO = Math.cos(Om), sO = Math.sin(Om), cI = Math.cos(I);
  const x = (cw * cO - sw * sO * cI) * xp + (-sw * cO - cw * sO * cI) * yp;
  const y = (cw * sO + sw * cO * cI) * xp + (-sw * sO + cw * cO * cI) * yp;
  return { x, y, au: Math.hypot(x, y), lon: norm360(Math.atan2(y, x) / DEG) };
}

// Moon's elongation from the Sun (degrees, 0 = new, 180 = full), after Meeus ch. 48.
export function moonElongation(T) {
  const D = 297.8501921 + 445267.1114034 * T - 0.0018819 * T * T + (T * T * T) / 545868;
  const M = 357.5291092 + 35999.0502909 * T - 0.0001536 * T * T;
  const Mp = 134.9633964 + 477198.8675055 * T + 0.0087414 * T * T + (T * T * T) / 69699;
  const s = (x) => Math.sin(x * DEG);
  return norm360(D + 6.289 * s(Mp) - 2.1 * s(M) + 1.274 * s(2 * D - Mp) + 0.658 * s(2 * D) + 0.214 * s(2 * Mp) + 0.11 * s(D));
}

export function moonPhaseName(elong) {
  const names = ['New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous', 'Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent'];
  return names[Math.floor(((elong + 22.5) % 360) / 45)];
}

export function skyOn(dateStr) {
  const dt = parseDate(dateStr);
  if (!dt) throw new Error('Invalid date');
  const T = (julianDay(dt) - 2451545.0) / 36525;
  const planets = {};
  for (const p of PLANETS) planets[p] = helio(p, T);
  const elong = moonElongation(T);
  return {
    date: dateStr,
    planets,
    moon: {
      elongation: elong,
      illumination: (1 - Math.cos(elong * DEG)) / 2,
      phase: moonPhaseName(elong),
      // direction of the Moon as seen from Earth in the ecliptic plane, in the heliocentric frame
      dirLon: norm360(planets.earth.lon + 180 + elong),
    },
  };
}
