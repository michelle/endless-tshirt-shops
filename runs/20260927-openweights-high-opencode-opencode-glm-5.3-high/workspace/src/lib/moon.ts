/**
 * Moon phase math.
 *
 * Computes the Moon's ecliptic longitude with a truncated version of Meeus's
 * series (Astronomical Algorithms, ch. 47) and the Sun's with the low-precision
 * formula from ch. 25, then derives the elongation of the Moon from the Sun.
 * That gives the illuminated fraction and waxing/waning state to within about
 * a tenth of a degree, which is far better than a mean-lunation estimate.
 *
 * Everything is a pure function of a UTC timestamp so the server render and the
 * in-browser preview always agree.
 */

export const SYNODIC_MONTH = 29.530588853;

export interface MoonPhase {
  /** Elongation of the Moon east of the Sun, in degrees, 0..360. 0 = new. */
  elongation: number;
  /** Illuminated fraction of the lunar disc, 0..1. */
  illumination: number;
  /** Fraction of the current synodic month that has elapsed, 0..1. */
  ageFraction: number;
  /** Approximate days since new moon. */
  ageDays: number;
  /** True while the moon is growing (between new and full). */
  waxing: boolean;
  /** One of the eight classical phase names. */
  phaseName: string;
  /** Convenience label, e.g. "Waxing Gibbous · 84% illuminated". */
  label: string;
}

const RAD = Math.PI / 180;
const sin = (deg: number) => Math.sin(deg * RAD);
const cos = (deg: number) => Math.cos(deg * RAD);

/** Normalize an angle to 0..360. */
function norm360(x: number): number {
  return ((x % 360) + 360) % 360;
}

/** Julian Day from a UTC timestamp in milliseconds. */
export function julianDay(utcMs: number): number {
  return utcMs / 86400000 + 2440587.5;
}

/** Sun's apparent ecliptic longitude (degrees). Meeus ch. 25, ~0.01° error. */
function sunLongitude(T: number): number {
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
  const C =
    (1.914602 - 0.004817 * T - 0.000014 * T * T) * sin(M) +
    (0.019993 - 0.000101 * T) * sin(2 * M) +
    0.000289 * sin(3 * M);
  return norm360(L0 + C);
}

/**
 * Moon's ecliptic longitude (degrees), truncated to the largest terms of
 * Meeus ch. 47.6 — the terms retained sum to the same values Meeus lists for
 * an accuracy of roughly 0.05°, more than enough for how the moon is drawn.
 */
function moonLongitude(T: number): number {
  const Lp =
    218.3164477 + 481267.88123421 * T - 0.0015786 * T * T +
    (T * T * T) / 538841 - (T * T * T * T) / 65194000;
  const D = 297.8501921 + 445267.1114034 * T - 0.0018819 * T * T +
    (T * T * T) / 545868 - (T * T * T * T) / 113065000;
  const M = 357.5291092 + 35999.0502909 * T - 0.0001536 * T * T -
    (T * T * T) / 24490000;
  const Mp = 134.9633964 + 477198.8675055 * T + 0.0087414 * T * T +
    (T * T * T) / 69699 - (T * T * T * T) / 14712000;
  const F = 93.272095 + 483202.0175233 * T - 0.0036539 * T * T -
    (T * T * T) / 3526000 + (T * T * T * T) / 86131000;

  return norm360(
    Lp +
      6.288774 * sin(Mp) +
      1.274027 * sin(2 * D - Mp) +
      0.658314 * sin(2 * D) +
      0.213618 * sin(2 * Mp) +
      -0.185116 * sin(M) +
      -0.114332 * sin(2 * F) +
      0.058793 * sin(2 * D - 2 * Mp) +
      0.057066 * sin(2 * D - M - Mp) +
      0.053322 * sin(2 * D + Mp) +
      0.045758 * sin(2 * D - M) +
      -0.040923 * sin(M - Mp) +
      -0.034720 * sin(D) +
      -0.030383 * sin(M + Mp) +
      0.015327 * sin(2 * D - 2 * F) +
      -0.012528 * sin(Mp + 2 * F) +
      0.010680 * sin(2 * Mp - 2 * F) +
      0.010675 * sin(4 * D - Mp) +
      0.010034 * sin(3 * Mp)
  );
}

const PHASE_NAMES: [number, string][] = [
  [0, "New Moon"],
  [45, "Waxing Crescent"],
  [90, "First Quarter"],
  [135, "Waxing Gibbous"],
  [180, "Full Moon"],
  [225, "Waning Gibbous"],
  [270, "Last Quarter"],
  [315, "Waning Crescent"],
];

/** The phase of the moon at a given UTC timestamp. */
export function moonPhaseAt(utcMs: number): MoonPhase {
  const jd = julianDay(utcMs);
  const T = (jd - 2451545.0) / 36525;
  const elongation = norm360(moonLongitude(T) - sunLongitude(T));
  const illumination = (1 - cos(elongation)) / 2;
  const ageFraction = elongation / 360;
  const waxing = elongation < 180;

  const sector = Math.round(elongation / 45) % 8;
  const phaseName = PHASE_NAMES[sector][1];
  const pct = Math.round(illumination * 100);

  return {
    elongation,
    illumination,
    ageFraction,
    ageDays: ageFraction * SYNODIC_MONTH,
    waxing,
    phaseName,
    label: `${phaseName} · ${pct}% illuminated`,
  };
}

/**
 * "SEPTEMBER 28, 2006" style title case date, in UTC.
 */
export function formatDisplayDate(dateIso: string): string {
  const [y, m, d] = dateIso.split("-").map(Number);
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return `${months[m - 1]} ${d}, ${y}`;
}
