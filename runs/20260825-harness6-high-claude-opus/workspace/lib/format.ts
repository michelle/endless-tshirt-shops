/** Human-readable rendering of the number that goes on the shirt. */
export function describeTimestamp(epochMs: number, timeZone?: string): string {
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZoneName: 'short',
    timeZone,
  };
  const base = new Intl.DateTimeFormat('en-US', options).format(new Date(epochMs));
  const ms = String(epochMs % 1000).padStart(3, '0');
  // Slot the milliseconds in right after the seconds.
  return base.replace(/(\d{2}:\d{2}:\d{2})/, `$1.${ms}`);
}

export function digitsOf(epochMs: number): string[] {
  return String(epochMs).split('');
}
