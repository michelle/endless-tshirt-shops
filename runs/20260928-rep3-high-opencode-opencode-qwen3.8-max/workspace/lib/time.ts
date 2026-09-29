import { DateTime } from 'luxon';
import type { DesignParams } from './types';

const MONTHS = [
  'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER',
];

export interface BirthMoment {
  /** UTC instant of birth (or of the assumed evening) in ms */
  utcMs: number;
  /** true when the customer supplied an exact time */
  timeKnown: boolean;
  /** "14 MAY 1990 · 9:30 PM" / "14 MAY 1990 · EVENING SKY (APPROX.)" */
  shirtDateLine: string;
}

/** Default local clock time used when the birth time is unknown. */
const DEFAULT_LOCAL_TIME = '21:00';

export function birthMoment(d: Pick<DesignParams, 'date' | 'time' | 'tz' | 'utcOffset'>): BirthMoment {
  const time = d.time ?? DEFAULT_LOCAL_TIME;
  const timeKnown = d.time !== null;
  let utcMs: number;
  if (d.tz) {
    const dt = DateTime.fromISO(`${d.date}T${time}`, { zone: d.tz });
    if (!dt.isValid) throw new Error(`invalid moment: ${d.date}T${time} ${d.tz}`);
    utcMs = dt.toUTC().toMillis();
  } else {
    const asUtc = Date.parse(`${d.date}T${time}:00Z`);
    if (Number.isNaN(asUtc)) throw new Error(`invalid moment: ${d.date}T${time}`);
    utcMs = asUtc - (d.utcOffset ?? 0) * 3600000;
  }
  const [y, m, day] = d.date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const h12 = ((hh + 11) % 12) + 1;
  const ampm = hh < 12 ? 'AM' : 'PM';
  const timeStr = `${h12}:${String(mm).padStart(2, '0')} ${ampm}`;
  const dateStr = `${day} ${MONTHS[m - 1]} ${y}`;
  return {
    utcMs,
    timeKnown,
    shirtDateLine: timeKnown
      ? `${dateStr} · ${timeStr}`
      : `${dateStr} · EVENING SKY (APPROX.)`,
  };
}

export function formatCoords(lat: number, lon: number): string {
  const ns = lat >= 0 ? 'N' : 'S';
  const ew = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(2)}° ${ns}, ${Math.abs(lon).toFixed(2)}° ${ew}`;
}
