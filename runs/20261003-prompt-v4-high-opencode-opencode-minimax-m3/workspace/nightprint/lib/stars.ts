/**
 * Astronomy helpers built on astronomy-engine (Don Cross).
 *
 * Provides: planet positions (e.g., visible planets), sun/moon phase,
 * and a deterministic celestial coordinate transform so a given
 * (date, location) produces a consistent personal night sky.
 */
import * as A from 'astronomy-engine';

export interface SkyInputs {
  /** ISO 8601 timestamp at the moment we are rendering */
  when: Date;
  latitudeDeg: number;
  longitudeDeg: number;
}

/**
 * Lead planets (visible to the eye) and bright stars we sample for the chart.
 * Astronomy-engine has named bodies; we mirror altitude/azimuth for the
 * chosen timestamp + observer location.
 */
const PLANETS = [
  { name: 'Mercury', body: A.Body.Mercury },
  { name: 'Venus',   body: A.Body.Venus },
  { name: 'Mars',    body: A.Body.Mars },
  { name: 'Jupiter', body: A.Body.Jupiter },
  { name: 'Saturn',  body: A.Body.Saturn },
] as const;

export interface CelestialPoint {
  label: string;
  /** Altitude in degrees above horizon */
  altitudeDeg: number;
  /** Azimuth in degrees (0 = North, 90 = East) */
  azimuthDeg: number;
  /** Visual magnitude (lower = brighter) */
  magnitude: number;
  /** True for planets vs stars */
  isPlanet: boolean;
}

/** Returns celestial positions for a given moment / location. */
export function celestialPositions(input: SkyInputs): {
  observer: A.Observer;
  points: CelestialPoint[];
  sun: { altitudeDeg: number; azimuthDeg: number };
  moon: { altitudeDeg: number; azimuthDeg: number; phaseFraction: number; phaseName: string };
} {
  const observer = new A.Observer(input.latitudeDeg, input.longitudeDeg, 0);

  const horiz = (body: A.Body) => {
    // Astronomy-engine: Equator -> RA/Dec -> Horizon -> alt/az
    const eq = A.Equator(body, input.when, observer, true, true);
    const h = A.Horizon(input.when, observer, eq.ra, eq.dec, 'normal');
    return { altitudeDeg: h.altitude, azimuthDeg: ((h.azimuth % 360) + 360) % 360 };
  };

  const sun = horiz(A.Body.Sun);
  const moon = horiz(A.Body.Moon);
  const phase = A.MoonPhase(input.when);

  // Only return planets above horizon (not during daylight); below 5 deg we cut.
  const points: CelestialPoint[] = [];
  for (const p of PLANETS) {
    const h = horiz(p.body);
    if (h.altitudeDeg > 5) {
      points.push({
        label: p.name,
        altitudeDeg: h.altitudeDeg,
        azimuthDeg: h.azimuthDeg,
        magnitude: 0,
        isPlanet: true,
      });
    }
  }

  return {
    observer,
    points,
    sun,
    moon: {
      altitudeDeg: moon.altitudeDeg,
      azimuthDeg: moon.azimuthDeg,
      phaseFraction: phase, // 0..1 (new..full..new)
      phaseName: moonPhaseName(phase),
    },
  };
}

export function moonPhaseName(phase: number): string {
  // phase: 0 = new, 0.25 = first quarter, 0.5 = full, 0.75 = last quarter
  if (phase < 0.03 || phase > 0.97) return 'New Moon';
  if (phase < 0.22) return 'Waxing Crescent';
  if (phase < 0.28) return 'First Quarter';
  if (phase < 0.47) return 'Waxing Gibbous';
  if (phase < 0.53) return 'Full Moon';
  if (phase < 0.72) return 'Waning Gibbous';
  if (phase < 0.78) return 'Last Quarter';
  return 'Waning Crescent';
}

/**
 * Hash a numeric seed into a pseudo-random number [0, 1) using a
 * small integer hash so the same (date, location) always yields the
 * same star-field pattern.
 */
export function hashSeed(seed: number): () => number {
  let state = (seed | 0) ^ 0x9e3779b9;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stable numeric seed from a moment + location. */
export function skySeed(input: SkyInputs): number {
  // Use day-precision timestamp + lat/lng; multiplied & rounded so tiny changes
  // still produce a clean integer seed.
  const dayKey = Math.round(input.when.getTime() / 1000);
  const latKey = Math.round(input.latitudeDeg * 1000);
  const lngKey = Math.round(input.longitudeDeg * 1000);
  return dayKey * 1000003 + latKey * 1009 + lngKey;
}
