// Moon phase calculation.
//
// We compute the phase of the Moon for a given instant using the synodic
// month (the ~29.53 day cycle from new moon to new moon) anchored to a known
// new moon. This is accurate to well under a day, which is more than enough
// for a commemorative design.

const SYNODIC_MONTH = 29.53058867; // days
// Reference new moon: 2000-01-06 18:14 UTC (Julian epoch commonly used).
const REF_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14, 0);

export interface MoonInfo {
  /** Phase in [0, 1): 0 = new moon, 0.5 = full moon. */
  phase: number;
  /** Illuminated fraction in [0, 1]: 0 = new, 1 = full. */
  illumination: number;
  /** Human-readable phase name. */
  name: string;
  /** Age of the moon in days (0..29.53). */
  age: number;
}

export function moonPhase(date: Date): number {
  const days = (date.getTime() - REF_NEW_MOON) / 86400000;
  let phase = (days % SYNODIC_MONTH) / SYNODIC_MONTH;
  if (phase < 0) phase += 1;
  return phase;
}

export function moonInfo(date: Date): MoonInfo {
  const phase = moonPhase(date);
  const illumination = (1 - Math.cos(2 * Math.PI * phase)) / 2;
  const age = phase * SYNODIC_MONTH;

  // Eight traditional phase names.
  const names = [
    'New Moon',
    'Waxing Crescent',
    'First Quarter',
    'Waxing Gibbous',
    'Full Moon',
    'Waning Gibbous',
    'Last Quarter',
    'Waning Crescent',
  ];
  const idx = Math.round(phase * 8) % 8;
  const name = names[idx];

  return { phase, illumination, name, age };
}

/** Parse a YYYY-MM-DD date into a Date at 20:00 UTC ("the night of"). */
export function parseNight(dateStr: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!m) throw new Error('Invalid date');
  const [y, mo, d] = [Number(m[1]), Number(m[2]) - 1, Number(m[3])];
  const date = new Date(Date.UTC(y, mo, d, 20, 0, 0));
  if (Number.isNaN(date.getTime())) throw new Error('Invalid date');
  return date;
}

/** Format a Date as a long, human-friendly string. */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}
