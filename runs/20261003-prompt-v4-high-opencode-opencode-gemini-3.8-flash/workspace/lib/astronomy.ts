import { Star, Constellation, MoonPhaseInfo } from './types';

export function getJulianDate(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5;
}

export function getLST(date: Date, longitudeDeg: number): number {
  const jd = getJulianDate(date);
  const d = jd - 2451545.0;
  let gmst = 280.46061837 + 360.98564736629 * d;
  gmst = ((gmst % 360) + 360) % 360;
  let lst = gmst + longitudeDeg;
  return ((lst % 360) + 360) % 360;
}

export function equatorialToHorizontal(
  raHours: number,
  decDeg: number,
  latDeg: number,
  lstDeg: number
): { alt: number; az: number } {
  const raDeg = raHours * 15;
  let hDeg = lstDeg - raDeg;
  hDeg = ((hDeg % 360) + 360) % 360;

  const toRad = Math.PI / 180;
  const toDeg = 180 / Math.PI;

  const latRad = latDeg * toRad;
  const decRad = decDeg * toRad;
  const hRad = hDeg * toRad;

  const sinAlt = Math.sin(latRad) * Math.sin(decRad) + Math.cos(latRad) * Math.cos(decRad) * Math.cos(hRad);
  const altRad = Math.asin(Math.max(-1, Math.min(1, sinAlt)));
  const alt = altRad * toDeg;

  const cosAlt = Math.cos(altRad);
  if (Math.abs(cosAlt) < 1e-6) {
    return { alt, az: 0 };
  }

  const sinAz = (-Math.cos(decRad) * Math.sin(hRad)) / cosAlt;
  const cosAz = (Math.sin(decRad) - Math.sin(latRad) * Math.sin(altRad)) / (Math.cos(latRad) * cosAlt);
  let az = Math.atan2(sinAz, cosAz) * toDeg;
  az = ((az % 360) + 360) % 360;

  return { alt, az };
}

export function getMoonPhase(date: Date): MoonPhaseInfo {
  // Known new moon reference epoch: 2000-01-06T18:14:00Z
  const ref = new Date('2000-01-06T18:14:00Z').getTime();
  const diffDays = (date.getTime() - ref) / 86400000;
  const synodicMonth = 29.53058867;
  const age = ((diffDays % synodicMonth) + synodicMonth) % synodicMonth;
  const frac = age / synodicMonth;
  const illumination = Math.round(((1 - Math.cos(frac * 2 * Math.PI)) / 2) * 100);

  let phaseName = 'New Moon';
  if (age < 1.84) phaseName = 'New Moon';
  else if (age < 5.53) phaseName = 'Waxing Crescent';
  else if (age < 9.22) phaseName = 'First Quarter';
  else if (age < 12.91) phaseName = 'Waxing Gibbous';
  else if (age < 16.61) phaseName = 'Full Moon';
  else if (age < 20.3) phaseName = 'Waning Gibbous';
  else if (age < 23.99) phaseName = 'Third Quarter';
  else if (age < 27.68) phaseName = 'Waning Crescent';
  else phaseName = 'New Moon';

  return {
    ageDays: age.toFixed(1),
    phaseName,
    illumination,
    phaseFrac: frac
  };
}

export const NAMED_STARS: Star[] = [
  // Polaris
  { id: 'polaris', name: 'Polaris', ra: 2.53, dec: 89.26, mag: 1.97 },
  // Ursa Major (Big Dipper)
  { id: 'uma_dubhe', name: 'Dubhe', ra: 11.06, dec: 61.75, mag: 1.81 },
  { id: 'uma_merak', name: 'Merak', ra: 11.03, dec: 56.38, mag: 2.34 },
  { id: 'uma_phecda', name: 'Phecda', ra: 11.9, dec: 53.69, mag: 2.41 },
  { id: 'uma_megrez', name: 'Megrez', ra: 12.25, dec: 57.03, mag: 3.32 },
  { id: 'uma_alioth', name: 'Alioth', ra: 12.9, dec: 55.96, mag: 1.76 },
  { id: 'uma_mizar', name: 'Mizar', ra: 13.4, dec: 54.92, mag: 2.23 },
  { id: 'uma_alkaid', name: 'Alkaid', ra: 13.79, dec: 49.31, mag: 1.85 },

  // Orion
  { id: 'ori_betelgeuse', name: 'Betelgeuse', ra: 5.92, dec: 7.41, mag: 0.5 },
  { id: 'ori_rigel', name: 'Rigel', ra: 5.24, dec: -8.2, mag: 0.18 },
  { id: 'ori_bellatrix', name: 'Bellatrix', ra: 5.42, dec: 6.35, mag: 1.64 },
  { id: 'ori_saiph', name: 'Saiph', ra: 5.79, dec: -9.67, mag: 2.07 },
  { id: 'ori_alnitak', name: 'Alnitak', ra: 5.68, dec: -1.94, mag: 1.74 },
  { id: 'ori_alnilam', name: 'Alnilam', ra: 5.6, dec: -1.2, mag: 1.69 },
  { id: 'ori_mintaka', name: 'Mintaka', ra: 5.53, dec: -0.3, mag: 2.25 },

  // Cassiopeia
  { id: 'cas_caph', name: 'Caph', ra: 0.15, dec: 59.15, mag: 2.28 },
  { id: 'cas_schedar', name: 'Schedar', ra: 0.68, dec: 56.54, mag: 2.24 },
  { id: 'cas_gamma', name: 'Navi', ra: 0.94, dec: 60.72, mag: 2.15 },
  { id: 'cas_ruchbah', name: 'Ruchbah', ra: 1.43, dec: 60.23, mag: 2.66 },
  { id: 'cas_segin', name: 'Segin', ra: 1.9, dec: 63.67, mag: 3.35 },

  // Canis Major
  { id: 'cma_sirius', name: 'Sirius', ra: 6.75, dec: -16.72, mag: -1.46 },
  { id: 'cma_adhara', name: 'Adhara', ra: 6.98, dec: -28.97, mag: 1.5 },
  { id: 'cma_wezen', name: 'Wezen', ra: 7.14, dec: -26.39, mag: 1.83 },
  { id: 'cma_mirzam', name: 'Mirzam', ra: 6.38, dec: -17.96, mag: 1.98 },

  // Cygnus (Northern Cross)
  { id: 'cyg_deneb', name: 'Deneb', ra: 20.69, dec: 45.28, mag: 1.25 },
  { id: 'cyg_sadr', name: 'Sadr', ra: 20.37, dec: 40.26, mag: 2.23 },
  { id: 'cyg_gienah', name: 'Gienah', ra: 20.77, dec: 33.97, mag: 2.48 },
  { id: 'cyg_delta', name: 'Fawaris', ra: 19.75, dec: 45.13, mag: 2.86 },
  { id: 'cyg_albireo', name: 'Albireo', ra: 19.51, dec: 27.96, mag: 3.05 },

  // Lyra
  { id: 'lyr_vega', name: 'Vega', ra: 18.62, dec: 38.78, mag: 0.03 },
  { id: 'lyr_sheliak', name: 'Sheliak', ra: 18.83, dec: 33.36, mag: 3.52 },
  { id: 'lyr_sulafat', name: 'Sulafat', ra: 18.98, dec: 32.69, mag: 3.25 },

  // Aquila
  { id: 'aql_altair', name: 'Altair', ra: 19.84, dec: 8.87, mag: 0.77 },
  { id: 'aql_tarazed', name: 'Tarazed', ra: 19.77, dec: 10.61, mag: 2.72 },
  { id: 'aql_alshain', name: 'Alshain', ra: 19.92, dec: 6.41, mag: 3.71 },

  // Boötes
  { id: 'boo_arcturus', name: 'Arcturus', ra: 14.26, dec: 19.18, mag: -0.05 },
  { id: 'boo_izar', name: 'Izar', ra: 14.75, dec: 27.07, mag: 2.35 },
  { id: 'boo_muphrid', name: 'Muphrid', ra: 13.91, dec: 18.4, mag: 2.68 },

  // Taurus
  { id: 'tau_aldebaran', name: 'Aldebaran', ra: 4.6, dec: 16.51, mag: 0.85 },
  { id: 'tau_elnath', name: 'Elnath', ra: 5.44, dec: 28.61, mag: 1.65 },
  { id: 'tau_alcyone', name: 'Alcyone (Pleiades)', ra: 3.79, dec: 24.11, mag: 2.85 },

  // Gemini
  { id: 'gem_pollux', name: 'Pollux', ra: 7.76, dec: 28.03, mag: 1.16 },
  { id: 'gem_castor', name: 'Castor', ra: 7.58, dec: 31.89, mag: 1.58 },
  { id: 'gem_alhena', name: 'Alhena', ra: 6.63, dec: 16.4, mag: 1.93 },

  // Leo
  { id: 'leo_regulus', name: 'Regulus', ra: 10.14, dec: 11.97, mag: 1.36 },
  { id: 'leo_denebola', name: 'Denebola', ra: 11.82, dec: 14.57, mag: 2.14 },
  { id: 'leo_algieba', name: 'Algieba', ra: 10.33, dec: 19.84, mag: 2.01 },
  { id: 'leo_zosma', name: 'Zosma', ra: 11.24, dec: 20.52, mag: 2.56 },

  // Scorpius
  { id: 'sco_antares', name: 'Antares', ra: 16.49, dec: -26.43, mag: 1.06 },
  { id: 'sco_shaula', name: 'Shaula', ra: 17.56, dec: -37.1, mag: 1.62 },
  { id: 'sco_sargas', name: 'Sargas', ra: 17.62, dec: -43.0, mag: 1.86 },
  { id: 'sco_dschubba', name: 'Dschubba', ra: 16.01, dec: -22.62, mag: 2.29 },

  // Crux (Southern Cross)
  { id: 'cru_acrux', name: 'Acrux', ra: 12.44, dec: -63.1, mag: 0.77 },
  { id: 'cru_mimosa', name: 'Mimosa', ra: 12.79, dec: -59.69, mag: 1.25 },
  { id: 'cru_gacrux', name: 'Gacrux', ra: 12.52, dec: -57.11, mag: 1.59 },
  { id: 'cru_imai', name: 'Imai', ra: 12.25, dec: -58.75, mag: 2.78 },

  // Centaurus
  { id: 'cen_rigilkent', name: 'Rigil Kentaurus', ra: 14.66, dec: -60.83, mag: -0.01 },
  { id: 'cen_hadar', name: 'Hadar', ra: 14.06, dec: -60.37, mag: 0.61 },

  // Auriga
  { id: 'aur_capella', name: 'Capella', ra: 5.28, dec: 45.99, mag: 0.08 },
  { id: 'aur_menkalinan', name: 'Menkalinan', ra: 5.99, dec: 44.95, mag: 1.9 },

  // Virgo
  { id: 'vir_spica', name: 'Spica', ra: 13.42, dec: -11.16, mag: 0.98 },

  // Canis Minor
  { id: 'cmi_procyon', name: 'Procyon', ra: 7.65, dec: 5.22, mag: 0.34 },

  // Carina & Eridanus
  { id: 'car_canopus', name: 'Canopus', ra: 6.4, dec: -52.7, mag: -0.74 },
  { id: 'eri_achernar', name: 'Achernar', ra: 1.63, dec: -57.24, mag: 0.45 },

  // Piscis Austrinus
  { id: 'psa_fomalhaut', name: 'Fomalhaut', ra: 22.96, dec: -29.62, mag: 1.17 }
];

export const CONSTELLATIONS: Constellation[] = [
  {
    id: 'orion',
    name: 'Orion',
    lines: [
      ['ori_betelgeuse', 'ori_bellatrix'],
      ['ori_bellatrix', 'ori_mintaka'],
      ['ori_mintaka', 'ori_alnilam'],
      ['ori_alnilam', 'ori_alnitak'],
      ['ori_alnitak', 'ori_saiph'],
      ['ori_saiph', 'ori_rigel'],
      ['ori_rigel', 'ori_mintaka'],
      ['ori_betelgeuse', 'ori_alnitak']
    ]
  },
  {
    id: 'ursa_major',
    name: 'Ursa Major',
    lines: [
      ['uma_dubhe', 'uma_merak'],
      ['uma_merak', 'uma_phecda'],
      ['uma_phecda', 'uma_megrez'],
      ['uma_megrez', 'uma_dubhe'],
      ['uma_megrez', 'uma_alioth'],
      ['uma_alioth', 'uma_mizar'],
      ['uma_mizar', 'uma_alkaid']
    ]
  },
  {
    id: 'cassiopeia',
    name: 'Cassiopeia',
    lines: [
      ['cas_caph', 'cas_schedar'],
      ['cas_schedar', 'cas_gamma'],
      ['cas_gamma', 'cas_ruchbah'],
      ['cas_ruchbah', 'cas_segin']
    ]
  },
  {
    id: 'cygnus',
    name: 'Cygnus',
    lines: [
      ['cyg_deneb', 'cyg_sadr'],
      ['cyg_sadr', 'cyg_albireo'],
      ['cyg_delta', 'cyg_sadr'],
      ['cyg_sadr', 'cyg_gienah']
    ]
  },
  {
    id: 'crux',
    name: 'Crux',
    lines: [
      ['cru_gacrux', 'cru_acrux'],
      ['cru_mimosa', 'cru_imai']
    ]
  },
  {
    id: 'gemini',
    name: 'Gemini',
    lines: [
      ['gem_castor', 'gem_pollux'],
      ['gem_castor', 'gem_alhena']
    ]
  },
  {
    id: 'leo',
    name: 'Leo',
    lines: [
      ['leo_regulus', 'leo_algieba'],
      ['leo_algieba', 'leo_zosma'],
      ['leo_zosma', 'leo_denebola']
    ]
  },
  {
    id: 'scorpius',
    name: 'Scorpius',
    lines: [
      ['sco_dschubba', 'sco_antares'],
      ['sco_antares', 'sco_shaula'],
      ['sco_shaula', 'sco_sargas']
    ]
  },
  {
    id: 'canis_major',
    name: 'Canis Major',
    lines: [
      ['cma_sirius', 'cma_mirzam'],
      ['cma_sirius', 'cma_wezen'],
      ['cma_wezen', 'cma_adhara']
    ]
  },
  {
    id: 'taurus',
    name: 'Taurus',
    lines: [
      ['tau_aldebaran', 'tau_elnath'],
      ['tau_aldebaran', 'tau_alcyone']
    ]
  }
];

// Deterministic pseudorandom field of 320 background stars
export function getBackgroundStars(): Star[] {
  const bgStars: Star[] = [];
  let seed = 1234567;
  function rand() {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  }

  for (let i = 0; i < 320; i++) {
    const ra = rand() * 24;
    const dec = Math.asin(rand() * 2 - 1) * (180 / Math.PI);
    const mag = 3.2 + rand() * 2.8;
    bgStars.push({
      id: `bg_star_${i}`,
      ra,
      dec,
      mag
    });
  }
  return bgStars;
}

const ALL_BACKGROUND_STARS = getBackgroundStars();

export interface VisibleStar {
  id: string;
  name?: string;
  mag: number;
  alt: number;
  az: number;
  x: number; // coordinate relative to celestial center
  y: number;
  radius: number;
  opacity: number;
}

export function computeVisibleSky(
  date: Date,
  latDeg: number,
  lngDeg: number,
  domeRadius: number
): {
  visibleStars: VisibleStar[];
  visibleLines: { x1: number; y1: number; x2: number; y2: number }[];
  starLookup: Map<string, VisibleStar>;
} {
  const lstDeg = getLST(date, lngDeg);
  const visibleStars: VisibleStar[] = [];
  const starLookup = new Map<string, VisibleStar>();

  const allStars = [...NAMED_STARS, ...ALL_BACKGROUND_STARS];

  for (const s of allStars) {
    const { alt, az } = equatorialToHorizontal(s.ra, s.dec, latDeg, lstDeg);
    if (alt > 0) {
      // Stereographic polar projection onto celestial circle
      // Center is zenith (alt=90), edge is horizon (alt=0)
      const r = domeRadius * ((90 - alt) / 90);
      const azRad = az * (Math.PI / 180);
      const x = r * Math.sin(azRad);
      const y = -r * Math.cos(azRad);

      // Star size scaling: bright stars (mag < 1) get larger radius and sparkle
      const radius = Math.max(1.8, Math.min(8.5, (6.0 - s.mag) * 1.35));
      const opacity = Math.max(0.35, Math.min(1.0, 0.4 + (5.5 - s.mag) * 0.12));

      const vStar: VisibleStar = {
        id: s.id,
        name: s.name,
        mag: s.mag,
        alt,
        az,
        x,
        y,
        radius,
        opacity
      };

      visibleStars.push(vStar);
      starLookup.set(s.id, vStar);
    }
  }

  // Calculate visible constellation lines
  const visibleLines: { x1: number; y1: number; x2: number; y2: number }[] = [];
  for (const c of CONSTELLATIONS) {
    for (const [starId1, starId2] of c.lines) {
      const s1 = starLookup.get(starId1);
      const s2 = starLookup.get(starId2);
      if (s1 && s2) {
        visibleLines.push({
          x1: s1.x,
          y1: s1.y,
          x2: s2.x,
          y2: s2.y
        });
      }
    }
  }

  return { visibleStars, visibleLines, starLookup };
}
