// Local wall time + IANA timezone -> UTC instant, using the Intl database that
// ships with Node 20 and all modern browsers.

function tzOffsetMs(utcDate: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = dtf.formatToParts(utcDate);
  const get = (type: string) => {
    const p = parts.find((x) => x.type === type);
    return p ? parseInt(p.value, 10) : 0;
  };
  let hour = get('hour');
  if (hour === 24) hour = 0; // some engines report midnight as 24
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), hour, get('minute'), get('second'));
  return asUtc - utcDate.getTime();
}

/**
 * Interpret (year, month 1-12, day, hour, minute) as wall time in `timeZone`
 * and return the corresponding UTC Date. Two-pass to settle across DST edges.
 */
export function localToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string
): Date {
  let guess = new Date(Date.UTC(year, month - 1, day, hour, minute));
  for (let i = 0; i < 3; i++) {
    const off = tzOffsetMs(guess, timeZone);
    const next = new Date(Date.UTC(year, month - 1, day, hour, minute) - off);
    if (Math.abs(next.getTime() - guess.getTime()) < 1000) {
      guess = next;
      break;
    }
    guess = next;
  }
  return guess;
}

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** "JUNE 14, 2023" style formatting from a UTC instant shown in a timezone. */
export function formatInZone(utc: Date, timeZone: string): string {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  return dtf.format(utc);
}
